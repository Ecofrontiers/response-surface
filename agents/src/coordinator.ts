import 'dotenv/config'
import { AXLClient } from './integrations/axl-client'
import { createComputeBroker, runCoordinatorInference } from './integrations/zerog-compute'
import { uploadAuditLog } from './integrations/zerog-storage'
import { createFundContract, executeAllocations as execAlloc } from './integrations/zerog-chain'
import { createEnsWalletClient, createEnsPublicClient, updateCredibility, getAgentMetadata } from './integrations/ens-identity'
import { createAstralClient, checkContainment, verifyProofViaREST, computeCredibilityScore } from './integrations/astral-proofs'
import { ethers } from 'ethers'
import type { AgentAssessment } from './types'

const AXL_PORT = 9022
const CYCLE_INTERVAL = 120_000

async function runCoordinator() {
  const privateKey = process.env.EVM_PRIVATE_KEY
  if (!privateKey) throw new Error('EVM_PRIVATE_KEY required')

  const fundAddress = process.env.RESPONSE_FUND_ADDRESS
  if (!fundAddress) throw new Error('RESPONSE_FUND_ADDRESS required')

  const axl = new AXLClient(`http://127.0.0.1:${AXL_PORT}`)
  const fund = createFundContract(privateKey, fundAddress)
  const astral = createAstralClient()

  let computeBroker: any = null
  const providerAddress = process.env.ZG_COMPUTE_PROVIDER
  if (providerAddress) {
    try {
      computeBroker = await createComputeBroker(privateKey)
      console.log('[coordinator] 0G Compute broker initialized')
    } catch (e) {
      console.warn('[coordinator] 0G Compute unavailable:', (e as Error).message)
    }
  }

  let topo: any = null
  try {
    topo = await axl.getTopology()
    console.log(`[coordinator] AXL connected. Peer ID: ${topo.localPeerId}`)
    console.log(`[coordinator] Peers: ${topo.peers.length}`)
  } catch {
    console.warn('[coordinator] AXL not available — running in polling mode')
  }

  const ensWallet = createEnsWalletClient(privateKey as `0x${string}`)
  const ensPublic = createEnsPublicClient()
  let cycleNumber = 0

  console.log(`[coordinator] Starting coordination loop (${CYCLE_INTERVAL / 1000}s interval)`)

  async function tick() {
    cycleNumber++
    console.log(`\n[coordinator] === Cycle ${cycleNumber} ===`)

    const assessments: AgentAssessment[] = []

    if (topo) {
      let msg = await axl.recv()
      while (msg) {
        try {
          const assessment = JSON.parse(msg.data.toString()) as AgentAssessment
          assessments.push(assessment)
          console.log(`[coordinator] Received assessment from ${assessment.agentEns} (severity: ${assessment.severity})`)
        } catch (e) {
          console.warn('[coordinator] Failed to parse message from', msg.from)
        }
        msg = await axl.recv()
      }
    }

    if (assessments.length === 0) {
      console.log('[coordinator] No assessments received, skipping cycle')
      return
    }

    // ENS GATE: Read credibility from ENS text records — mandatory
    const ensCredibility = new Map<string, number>()
    const gatedAssessments: AgentAssessment[] = []
    for (const a of assessments) {
      try {
        const metadata = await getAgentMetadata(ensPublic, a.agentEns)
        const ensScore = metadata['credibility.score'] ? parseInt(metadata['credibility.score']) : 0
        const ensProofs = metadata['credibility.proofs'] ? parseInt(metadata['credibility.proofs']) : 0
        const role = metadata['role'] || 'unknown'
        ensCredibility.set(a.agentEns, ensScore)
        console.log(`[coordinator] ENS read: ${a.agentEns} — score=${ensScore}, proofs=${ensProofs}, role=${role}`)
        gatedAssessments.push(a)
      } catch (e) {
        console.error(`[coordinator] ENS GATE FAILED for ${a.agentEns}: ${(e as Error).message}`)
        console.error(`[coordinator] Rejecting ${a.agentEns} — no ENS identity, no allocation`)
      }
    }

    if (gatedAssessments.length === 0) {
      console.log('[coordinator] All agents failed ENS gate, skipping cycle')
      return
    }

    let allocationPlan: any
    if (computeBroker && providerAddress) {
      try {
        allocationPlan = await runCoordinatorInference(computeBroker, providerAddress, gatedAssessments)
        console.log(`[coordinator] 0G Compute inference complete (TEE: ${allocationPlan.teeVerified})`)
      } catch (e) {
        console.warn('[coordinator] 0G Compute failed, using local fallback:', (e as Error).message)
        allocationPlan = localFallbackAllocation(gatedAssessments, ensCredibility)
      }
    } else {
      allocationPlan = localFallbackAllocation(gatedAssessments, ensCredibility)
    }

    if (allocationPlan.plan.zones && allocationPlan.plan.zones.length > 0) {
      try {
        const allocations = allocationPlan.plan.zones.map((z: any) => ({
          agent: ethers.computeAddress(privateKey!),
          amount: BigInt(z.amount || '0'),
          ensName: z.ensName,
          disasterId: z.disasterId,
          assessmentHash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(assessments))),
          teeVerified: allocationPlan.teeVerified,
        }))

        const totalNeeded = allocations.reduce((s: bigint, a: any) => s + a.amount, 0n)
        const fundBalance = await fund.balance()

        if (fundBalance >= totalNeeded && totalNeeded > 0n) {
          const receipt = await execAlloc(fund, allocations)
          console.log(`[coordinator] Allocations executed. TX: ${receipt.hash}`)
        } else {
          console.log(`[coordinator] Insufficient fund balance (${ethers.formatEther(fundBalance)} < ${ethers.formatEther(totalNeeded)})`)
        }
      } catch (e) {
        console.error('[coordinator] Allocation execution failed:', (e as Error).message)
      }
    }

    try {
      await uploadAuditLog(privateKey!, {
        type: 'allocation',
        agentEns: 'coordinator.responsesurface.eth',
        data: { assessments, allocationPlan },
        cycleNumber,
      })
      console.log('[coordinator] Audit log uploaded to 0G Storage')
    } catch (e) {
      console.warn('[coordinator] 0G Storage upload failed:', (e as Error).message)
    }

    for (const assessment of gatedAssessments) {
      const proofCount = assessment.proofDensity || 0
      const score = computeCredibilityScore(true, proofCount, assessment.severity)
      try {
        await updateCredibility(ensWallet, assessment.agentEns, {
          score,
          totalProofs: proofCount,
        })
        console.log(`[coordinator] Updated credibility for ${assessment.agentEns}: ${score}/1000`)
      } catch (e) {
        console.error(`[coordinator] CRITICAL: ENS write failed for ${assessment.agentEns}: ${(e as Error).message}`)
        throw new Error(`ENS is mandatory — cannot update credibility for ${assessment.agentEns}`)
      }
    }

    try {
      await fund.advanceCycle()
      console.log(`[coordinator] Cycle ${cycleNumber} advanced on-chain`)
    } catch (e) {
      console.warn('[coordinator] Cycle advance failed:', (e as Error).message)
    }
  }

  await tick()
  setInterval(tick, CYCLE_INTERVAL)
}

function localFallbackAllocation(assessments: AgentAssessment[], ensCredibility: Map<string, number>) {
  const baseAmount = ethers.parseEther('0.1')

  const scored = assessments
    .filter(a => a.severity > 0)
    .map(a => {
      const ensScore = ensCredibility.get(a.agentEns)
      const credibility = ensScore !== undefined
        ? ensScore
        : computeCredibilityScore(true, a.proofDensity, a.severity)
      const weight = credibility * a.severity
      return { assessment: a, credibility, weight }
    })

  const totalWeight = scored.reduce((s, a) => s + a.weight, 0)

  return {
    plan: {
      zones: scored.map(({ assessment: a, credibility, weight }) => ({
        disasterId: a.disasters[0]?.id || `zone-${a.agentEns}`,
        ensName: a.agentEns,
        amount: ((baseAmount * BigInt(weight)) / BigInt(Math.max(totalWeight, 1))).toString(),
        rationale: `Severity ${a.severity}/10, ENS credibility ${credibility}/1000, ${a.disasters.length} disasters, ${a.speciesAtRisk.length} species`,
      })),
    },
    teeVerified: false,
    chatID: 'local-fallback',
  }
}

runCoordinator().catch(console.error)
