import { useState } from 'react'
import type { ActivityEvent } from '../App'
import type { Agent, Disaster, Allocation } from '../types'

interface CycleSimulatorProps {
  agents: Agent[]
  disasters: Disaster[]
  cycleNumber: number
  onActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void
  onAllocations: (allocations: Allocation[]) => void
  onCycleAdvance: () => void
  onAgentUpdate: (ensName: string, updates: Partial<Agent>) => void
  onFundUpdate: (balance: bigint, allocated: bigint) => void
}

function computeCredibilityScore(containment: boolean, proofCount: number, severity: number): number {
  const containmentBase = containment ? 400 : 0
  const severityBonus = Math.min(severity * 30, 300)
  const proofBonus = Math.min(proofCount * 150, 300)
  const rawScore = containmentBase + severityBonus + proofBonus
  const proofMultiplier = Math.min(0.15 + proofCount * 0.28, 1.0)
  return Math.min(Math.round(rawScore * proofMultiplier), 1000)
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default function CycleSimulator({
  agents,
  disasters,
  cycleNumber,
  onActivity,
  onAllocations,
  onCycleAdvance,
  onAgentUpdate,
  onFundUpdate,
}: CycleSimulatorProps) {
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState('')

  const runCycle = async () => {
    if (running || disasters.length === 0) return
    setRunning(true)

    const fundPool = 10000000000000000000n // 10 OG simulated

    // Phase 1: Agent Assessment
    setPhase('Agents assessing disasters...')
    onActivity({ type: 'system', message: `── Cycle ${cycleNumber} starting ──` })
    await delay(800)

    const assessmentAgents = agents.filter(a => a.role === 'agent' || a.role === 'adversary')
    const assessments: { ensName: string; severity: number; proofCount: number; containment: boolean }[] = []

    for (const agent of assessmentAgents) {
      const isRogue = agent.role === 'adversary'
      const severity = isRogue ? 9 : Math.floor(Math.random() * 5) + 4
      const proofCount = isRogue ? 0 : Math.floor(Math.random() * 3) + 2
      const containment = true

      assessments.push({ ensName: agent.ensName, severity, proofCount, containment })

      const msg = isRogue
        ? `${agent.ensName} submits inflated assessment (severity ${severity}, 0 proofs)`
        : `${agent.ensName} submits assessment (severity ${severity}, ${proofCount} proofs)`
      onActivity({ type: 'assessment', agent: agent.ensName, message: msg })
      await delay(600)
    }

    // Phase 2: AXL Relay
    setPhase('Relaying via AXL mesh...')
    onActivity({ type: 'system', message: 'Assessments relayed to coordinator via AXL' })
    await delay(1000)

    // Phase 3: Credibility Scoring
    setPhase('Computing credibility scores...')
    const scored = assessments.map(a => {
      const credibility = computeCredibilityScore(a.containment, a.proofCount, a.severity)
      const weight = credibility * a.severity
      return { ...a, credibility, weight }
    })

    for (const s of scored) {
      const isRogue = s.proofCount === 0
      onActivity({
        type: isRogue ? 'flag' : 'proof',
        agent: s.ensName,
        message: `${s.ensName}: credibility ${s.credibility}/1000${isRogue ? ' — no verified proofs' : ''}`,
      })
      onAgentUpdate(s.ensName, { credibilityScore: s.credibility })
      await delay(500)
    }

    // Phase 4: Sealed Inference + Allocation
    setPhase('Sealed inference via 0G Compute...')
    onActivity({ type: 'system', message: '0G Compute: sealed inference running in TEE...' })
    await delay(1200)

    const totalWeight = scored.reduce((s, a) => s + a.weight, 0)
    const newAllocations: Allocation[] = scored.map(s => {
      const share = totalWeight > 0 ? s.weight / totalWeight : 0
      const amount = BigInt(Math.floor(Number(fundPool) * share))
      return {
        agent: s.ensName,
        ensName: s.ensName,
        amount,
        disasterId: disasters[0]?.id || 'sim',
        timestamp: Date.now(),
        assessmentHash: `0x${Math.random().toString(16).slice(2, 18)}`,
        teeVerified: true,
      }
    })

    setPhase('Allocating funds...')
    for (const alloc of newAllocations) {
      const pct = ((Number(alloc.amount) / Number(fundPool)) * 100).toFixed(1)
      const isRogue = agents.find(a => a.ensName === alloc.ensName)?.role === 'adversary'
      onActivity({
        type: 'allocation',
        agent: alloc.ensName,
        message: `${alloc.ensName}: ${pct}% of fund${isRogue ? ' (reduced by credibility gate)' : ''}`,
      })
      await delay(500)
    }

    onAllocations(newAllocations)
    const totalAllocated = newAllocations.reduce((s, a) => s + a.amount, 0n)
    const remaining = fundPool > totalAllocated ? fundPool - totalAllocated : 0n
    onFundUpdate(remaining, totalAllocated)

    // Phase 5: ENS Update + Storage
    setPhase('Updating ENS records...')
    onActivity({ type: 'system', message: 'Credibility scores written to ENS text records' })
    await delay(600)
    onActivity({ type: 'system', message: 'Audit log uploaded to 0G Storage' })
    await delay(400)

    // Phase 6: Complete
    onActivity({ type: 'system', message: `── Cycle ${cycleNumber} complete ──` })
    onCycleAdvance()
    setPhase('')
    setRunning(false)
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      {phase && (
        <div className="mb-2 px-4 py-1.5 bg-gray-900/90 backdrop-blur-sm border border-cyan-500/30 rounded-lg text-xs text-cyan-400 text-center">
          {phase}
        </div>
      )}
      <button
        onClick={runCycle}
        disabled={running || disasters.length === 0}
        className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
          running
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 cursor-wait'
            : 'bg-cyan-500 text-gray-900 hover:bg-cyan-400 cursor-pointer shadow-lg shadow-cyan-500/20'
        }`}
      >
        {running ? 'Running Cycle...' : `Run Allocation Cycle ${cycleNumber}`}
      </button>
    </div>
  )
}
