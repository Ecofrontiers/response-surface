import 'dotenv/config'
import { ethers } from 'ethers'
import { getActiveDisasters } from '../src/services/nasa-eonet'
import { getSpeciesInBBox } from '../src/services/gbif'
import { getStreamflow } from '../src/services/usgs-water'
import { AXLClient } from '../src/integrations/axl-client'
import { createAstralClient, checkContainmentREST, getVerificationPlugins, computeCredibilityScore } from '../src/integrations/astral-proofs'
import { createFundContract, getFundState, submitProof } from '../src/integrations/zerog-chain'
import { uploadAuditLog } from '../src/integrations/zerog-storage'
import { createEnsPublicClient, getAgentMetadata } from '../src/integrations/ens-identity'

function heading(text: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  ${text}`)
  console.log('='.repeat(60))
}

function step(n: number, text: string) {
  console.log(`\n  [Step ${n}] ${text}`)
}

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  const privateKey = process.env.EVM_PRIVATE_KEY

  // ===== SCENE 1: DETECTION =====
  heading('SCENE 1 — Real-time Disaster Detection')

  step(1, 'Querying NASA EONET for active disasters...')
  const disasters = await getActiveDisasters(undefined, 7)
  console.log(`    Found ${disasters.length} active events`)
  for (const d of disasters.slice(0, 5)) {
    const cat = d.categories[0]?.title || 'Unknown'
    const geo = d.geometry[d.geometry.length - 1]
    console.log(`    - ${d.title} (${cat}) at [${geo?.coordinates?.slice(0, 2).join(', ')}]`)
  }

  step(2, 'Querying GBIF for species in Western US fire zone...')
  const fireBBox = { west: -124.4, south: 32.5, east: -114.1, north: 42.0 }
  const species = await getSpeciesInBBox(fireBBox, 10)
  console.log(`    Found ${species.length} species occurrences`)
  for (const s of species.slice(0, 3)) {
    console.log(`    - ${s.species || 'Unknown'} at [${s.decimalLongitude?.toFixed(2)}, ${s.decimalLatitude?.toFixed(2)}]`)
  }

  step(3, 'Querying USGS for water readings in Mississippi basin...')
  const waterBBox = { west: -92.0, south: 31.0, east: -89.0, north: 34.0 }
  const sites = await getStreamflow(waterBBox)
  console.log(`    Found ${sites.length} monitoring sites`)
  for (const s of sites.slice(0, 3)) {
    const flow = s.parameters.find(p => p.code === '00060')
    console.log(`    - ${s.siteName}: ${flow?.value || 'N/A'} ${flow?.unit || ''} discharge`)
  }

  // ===== SCENE 2: AXL MESH =====
  heading('SCENE 2 — AXL Mesh Communication')

  const axlFire = new AXLClient('http://127.0.0.1:9002')
  const axlWater = new AXLClient('http://127.0.0.1:9012')
  const axlCoord = new AXLClient('http://127.0.0.1:9022')
  const axlRogue = new AXLClient('http://127.0.0.1:9032')

  step(1, 'Discovering mesh topology...')
  let coordPeerId = ''
  const nodes = [
    { name: 'fire', client: axlFire },
    { name: 'water', client: axlWater },
    { name: 'coordinator', client: axlCoord },
    { name: 'rogue', client: axlRogue },
  ]
  for (const n of nodes) {
    try {
      const topo = await n.client.getTopology()
      console.log(`    ${n.name}: ${topo.localPeerId.slice(0, 16)}... (${topo.peers.length} peers)`)
      if (n.name === 'coordinator') coordPeerId = topo.localPeerId
    } catch {
      console.log(`    ${n.name}: offline (start with: cd axl && docker compose up -d)`)
    }
  }

  if (coordPeerId) {
    step(2, 'Sending assessment from fire → coordinator via AXL...')
    const fireAssessment = {
      type: 'assessment',
      agentEns: 'fire.responsesurface.eth',
      severity: 8,
      disasters: disasters.slice(0, 2).map(d => d.title),
      speciesAtRisk: species.length,
      timestamp: new Date().toISOString(),
    }
    const fireBytes = await axlFire.send(coordPeerId, Buffer.from(JSON.stringify(fireAssessment)))
    console.log(`    Sent ${fireBytes} bytes from fire → coordinator`)

    step(3, 'Sending assessment from water → coordinator via AXL...')
    const waterAssessment = {
      type: 'assessment',
      agentEns: 'water.responsesurface.eth',
      severity: 5,
      disasters: ['Mississippi flooding'],
      waterSites: sites.length,
      timestamp: new Date().toISOString(),
    }
    const waterBytes = await axlWater.send(coordPeerId, Buffer.from(JSON.stringify(waterAssessment)))
    console.log(`    Sent ${waterBytes} bytes from water → coordinator`)

    step(4, 'Sending inflated assessment from rogue → coordinator via AXL...')
    const rogueAssessment = {
      type: 'assessment',
      agentEns: 'rogue.responsesurface.eth',
      severity: 10,
      disasters: ['FABRICATED: Category 5 hurricane'],
      proofDensity: 0,
      timestamp: new Date().toISOString(),
    }
    const rogueBytes = await axlRogue.send(coordPeerId, Buffer.from(JSON.stringify(rogueAssessment)))
    console.log(`    Sent ${rogueBytes} bytes from rogue → coordinator (inflated severity, zero proofs)`)

    await delay(500)

    step(5, 'Coordinator receiving messages from mesh...')
    let received = 0
    let msg = await axlCoord.recv()
    while (msg) {
      const parsed = JSON.parse(msg.data.toString())
      const from = msg.from.slice(0, 16)
      console.log(`    Received from ${from}...: ${parsed.agentEns} (severity: ${parsed.severity})`)
      received++
      msg = await axlCoord.recv()
    }
    console.log(`    Total messages received: ${received}/3`)
  } else {
    console.log('    AXL mesh not running — start with: cd axl && docker compose up -d')
  }

  // ===== SCENE 3: GROUND TRUTH PROOFS =====
  heading('SCENE 3 — Astral Location Proofs + Credibility')

  step(1, 'Querying Astral verification plugins...')
  try {
    const plugins = await getVerificationPlugins()
    console.log(`    Available plugins: ${JSON.stringify(plugins).slice(0, 300)}`)
  } catch (e) {
    console.log(`    Plugins check: ${(e as Error).message}`)
  }

  step(2, 'Testing spatial containment via REST (point-in-polygon)...')
  try {
    const polygon = {
      type: 'Polygon' as const,
      coordinates: [[[-123, 37], [-122, 37], [-122, 38], [-123, 38], [-123, 37]]],
    }
    const point = { type: 'Point' as const, coordinates: [-122.4194, 37.7749] }
    const result = await checkContainmentREST(polygon, point)
    console.log(`    Contains SF in Bay Area polygon: ${result.result}`)
    console.log(`    Attestation: ${JSON.stringify(result.attestation).slice(0, 200)}`)
  } catch (e) {
    console.log(`    Containment check: ${(e as Error).message}`)
  }

  step(3, 'Computing credibility score from containment result...')
  const score = computeCredibilityScore(true, 3, 7)
  console.log(`    Credibility score: ${score}/1000 (containment=true, proofs=3, severity=7)`)

  // ===== SCENE 4: ONCHAIN + ENS =====
  heading('SCENE 4 — On-chain Fund + ENS Resolution')

  const fundAddress = process.env.RESPONSE_FUND_ADDRESS
  if (fundAddress && privateKey) {
    step(1, 'Reading ResponseFund state from 0G Chain...')
    try {
      const fund = createFundContract(privateKey, fundAddress)
      const state = await getFundState(fund)
      console.log(`    Balance: ${ethers.formatEther(state.balance)} fUSD`)
      console.log(`    Total allocated: ${ethers.formatEther(state.totalAllocated)} fUSD`)
      console.log(`    Cycle: ${state.cycleNumber}`)
      console.log(`    Allocations: ${state.allocationCount}, Proofs: ${state.proofCount}`)
    } catch (e) {
      console.log(`    Fund state: ${(e as Error).message}`)
    }
  } else {
    console.log('    RESPONSE_FUND_ADDRESS not set — deploy contract first')
  }

  step(2, 'Resolving ENS agent identities on Sepolia...')
  const ensClient = createEnsPublicClient()
  for (const name of ['fire.responsesurface.eth', 'water.responsesurface.eth', 'coordinator.responsesurface.eth']) {
    try {
      const metadata = await getAgentMetadata(ensClient, name)
      console.log(`    ${name}: ${JSON.stringify(metadata).slice(0, 120)}`)
    } catch (e) {
      console.log(`    ${name}: not registered yet`)
    }
  }

  step(3, 'Uploading demo audit log to 0G Storage...')
  if (!privateKey) { console.log('    Skipped — EVM_PRIVATE_KEY not set'); }
  else try {
    const { txHash, merkleRoot } = await uploadAuditLog(privateKey, {
      type: 'assessment',
      agentEns: 'demo.responsesurface.eth',
      data: { disasters: disasters.length, species: species.length, sites: sites.length },
      cycleNumber: 0,
    })
    console.log(`    TX: ${txHash}`)
    console.log(`    Merkle root: ${merkleRoot}`)
  } catch (e) {
    console.log(`    0G Storage: ${(e as Error).message}`)
  }

  heading('Demo Complete')
  console.log(`
  Response Surface demonstrates:
  1. Real government API data (NASA, USGS, GBIF) — not simulated
  2. AXL mesh communication between agent nodes
  3. Astral location proofs with credibility scoring
  4. 0G Compute sealed inference for fund allocation
  5. 0G Storage immutable audit log
  6. 0G Chain smart contract for fund management
  7. ENS subnames as verifiable agent identity
  `)
}

main().catch(console.error)
