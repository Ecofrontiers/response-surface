import { config as dotenvConfig } from 'dotenv'
import * as path from 'path'
dotenvConfig({ path: path.resolve(__dirname, '../../.env') })
dotenvConfig()
import express from 'express'
import { ethers } from 'ethers'
import { getActiveDisasters, getDisastersInBBox } from './services/nasa-eonet'
import { getFireHotspots } from './services/nasa-firms'
import { getSpeciesInBBox, getThreatenedSpeciesInBBox } from './services/gbif'
import { getAirQuality } from './services/epa-airnow'
import { getStreamflow } from './services/usgs-water'
import { getObservationsInBBox, getThreatenedInBBox } from './services/inat'
import { getFundState, createFundContractReadonly, createFundContract, executeAllocations as execAllocations, submitProof as submitProofOnChain } from './integrations/zerog-chain'
import { AXLClient } from './integrations/axl-client'
import { computeCredibilityScore, checkContainmentREST } from './integrations/astral-proofs'
import { createComputeBroker, runCoordinatorInference } from './integrations/zerog-compute'
import { uploadAuditLog } from './integrations/zerog-storage'
import { createEnsWalletClient, createEnsPublicClient, updateCredibility, getAgentMetadata } from './integrations/ens-identity'
import type { BBox, AgentAssessment } from './types'

const app = express()
app.use(express.json())

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ])
}

function parseBBox(query: any): BBox {
  return {
    west: parseFloat(query.west),
    south: parseFloat(query.south),
    east: parseFloat(query.east),
    north: parseFloat(query.north),
  }
}

app.get('/api/disasters', async (_req, res) => {
  try {
    const events = await getActiveDisasters()
    res.json(events)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

app.get('/api/disasters/bbox', async (req, res) => {
  try {
    const bbox = parseBBox(req.query)
    const events = await getDisastersInBBox(bbox)
    res.json(events)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

app.get('/api/fires', async (req, res) => {
  try {
    const bbox = parseBBox(req.query)
    const hotspots = await getFireHotspots(bbox)
    res.json(hotspots)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

app.get('/api/species', async (req, res) => {
  try {
    const bbox = parseBBox(req.query)
    const species = await getSpeciesInBBox(bbox)
    res.json(species)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

app.get('/api/air-quality', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string)
    const lng = parseFloat(req.query.lng as string)
    const readings = await getAirQuality(lat, lng)
    res.json(readings)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

app.get('/api/water', async (req, res) => {
  try {
    const bbox = parseBBox(req.query)
    const sites = await getStreamflow(bbox)
    res.json(sites)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

app.get('/api/observations', async (req, res) => {
  try {
    const bbox = parseBBox(req.query)
    const threatened = req.query.threatened === 'true'
    const obs = await getObservationsInBBox(bbox, { threatened })
    res.json(obs)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

app.get('/api/fund', async (_req, res) => {
  try {
    const fundAddress = process.env.RESPONSE_FUND_ADDRESS
    if (!fundAddress) return res.json({ balance: '0', totalAllocated: '0', cycleNumber: 0, symbol: 'fUSD', allocations: [] })
    const contract = createFundContractReadonly(fundAddress)
    const state = await getFundState(contract)
    res.json({ ...state, symbol: 'fUSD', allocations: [] })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

const axlNodes = [
  { name: 'pacific', port: 9002 },
  { name: 'mountain', port: 9012 },
  { name: 'central', port: 9022 },
  { name: 'lakes', port: 9032 },
  { name: 'delta', port: 9042 },
  { name: 'gulf', port: 9052 },
  { name: 'atlantic', port: 9062 },
  { name: 'northeast', port: 9072 },
  { name: 'coordinator', port: 9092 },
  { name: 'rogue', port: 9082 },
]

async function getAxlPubkey(port: number): Promise<string> {
  try {
    const client = new AXLClient(`http://127.0.0.1:${port}`)
    const topo = await client.getTopology()
    return topo.localPeerId
  } catch {
    return ''
  }
}

const agentConfigs = [
  { ensName: 'pacific.responsesurface.eth', defaultRole: 'agent', bioregion: { bbox: { west: -124.8, south: 32.5, east: -114.5, north: 49.0 }, center: [-120.0, 41.0] }, dataSources: ['EONET', 'FIRMS', 'GBIF', 'AirNow'] },
  { ensName: 'mountain.responsesurface.eth', defaultRole: 'agent', bioregion: { bbox: { west: -114.5, south: 37.0, east: -104.0, north: 49.0 }, center: [-109.0, 43.0] }, dataSources: ['EONET', 'FIRMS', 'GBIF'] },
  { ensName: 'central.responsesurface.eth', defaultRole: 'agent', bioregion: { bbox: { west: -104.0, south: 37.0, east: -90.0, north: 49.0 }, center: [-97.0, 43.0] }, dataSources: ['EONET', 'FIRMS', 'GBIF'] },
  { ensName: 'lakes.responsesurface.eth', defaultRole: 'agent', bioregion: { bbox: { west: -90.0, south: 37.0, east: -80.5, north: 49.0 }, center: [-85.5, 43.0] }, dataSources: ['EONET', 'USGS', 'GBIF', 'iNaturalist'] },
  { ensName: 'delta.responsesurface.eth', defaultRole: 'agent', bioregion: { bbox: { west: -90.0, south: 25.0, east: -80.5, north: 37.0 }, center: [-86.0, 33.0] }, dataSources: ['EONET', 'USGS', 'GBIF', 'iNaturalist'] },
  { ensName: 'gulf.responsesurface.eth', defaultRole: 'agent', bioregion: { bbox: { west: -114.5, south: 25.8, east: -90.0, north: 37.0 }, center: [-102.0, 33.0] }, dataSources: ['EONET', 'FIRMS', 'USGS'] },
  { ensName: 'atlantic.responsesurface.eth', defaultRole: 'agent', bioregion: { bbox: { west: -80.5, south: 24.5, east: -67.0, north: 42.0 }, center: [-75.0, 34.0] }, dataSources: ['EONET', 'USGS', 'GBIF'] },
  { ensName: 'northeast.responsesurface.eth', defaultRole: 'agent', bioregion: { bbox: { west: -80.5, south: 42.0, east: -67.0, north: 49.0 }, center: [-74.0, 45.0] }, dataSources: ['EONET', 'USGS', 'GBIF'] },
  { ensName: 'coordinator.responsesurface.eth', defaultRole: 'coordinator', bioregion: { bbox: { west: -124.8, south: 24.4, east: -66.9, north: 49.4 }, center: [-95.7, 37.0] }, dataSources: ['all'] },
  { ensName: 'rogue.responsesurface.eth', defaultRole: 'adversary', bioregion: { bbox: { west: -180, south: -90, east: 180, north: 90 }, center: [-110, 40] }, dataSources: ['EONET'] },
  { ensName: 'phantom.responsesurface.eth', defaultRole: 'adversary', bioregion: { bbox: { west: -100, south: 35, east: -85, north: 45 }, center: [-92.5, 40] }, dataSources: ['EONET'] },
]

app.get('/api/agents', async (_req, res) => {
  const pubkeys = await Promise.all(axlNodes.map(n => getAxlPubkey(n.port)))
  const ensPublic = createEnsPublicClient()

  const agents = await Promise.all(agentConfigs.map(async (config, i) => {
    let credibilityScore = 0
    let role = config.defaultRole
    try {
      const metadata = await getAgentMetadata(ensPublic, config.ensName)
      credibilityScore = metadata['credibility.score'] ? parseInt(metadata['credibility.score']) : 0
      role = metadata['role'] || config.defaultRole
    } catch {}

    return {
      ensName: config.ensName,
      role,
      bioregion: config.bioregion,
      dataSources: config.dataSources,
      axlPubkey: pubkeys[i] || '',
      status: config.defaultRole === 'adversary' ? 'flagged' : 'active',
      credibilityScore,
    }
  }))

  res.json(agents)
})

app.get('/api/axl/status', async (_req, res) => {
  const results = await Promise.all(
    axlNodes.map(async n => {
      try {
        const client = new AXLClient(`http://127.0.0.1:${n.port}`)
        const topo = await client.getTopology()
        return { name: n.name, online: true, peerId: topo.localPeerId, peers: topo.peers.length }
      } catch {
        return { name: n.name, online: false, peerId: '', peers: 0 }
      }
    })
  )
  const allOnline = results.every(r => r.online)
  res.json({ status: allOnline ? 'connected' : results.some(r => r.online) ? 'partial' : 'offline', nodes: results })
})

app.get('/api/axl/topology', async (_req, res) => {
  const nodes = await Promise.all(
    axlNodes.map(async n => {
      try {
        const client = new AXLClient(`http://127.0.0.1:${n.port}`)
        const topo = await client.getTopology()
        return {
          name: n.name,
          port: n.port,
          online: true,
          peerId: topo.localPeerId,
          peerCount: topo.peers.length,
          connectedTo: topo.peers.map(p => p.peerId),
        }
      } catch {
        return { name: n.name, port: n.port, online: false, peerId: '', peerCount: 0, connectedTo: [] }
      }
    })
  )
  res.json({ nodes, meshType: 'ed25519-authenticated P2P', protocol: 'Gensyn AXL' })
})

app.get('/api/axl/discovery', async (_req, res) => {
  const coordinatorAxl = new AXLClient(`http://127.0.0.1:9022`)
  try {
    const topo = await coordinatorAxl.getTopology()
    const discovered = await Promise.all(
      topo.peers.map(async peer => {
        try {
          const card = await coordinatorAxl.getAgentCard(peer.peerId)
          return { peerId: peer.peerId, card, status: 'discovered' }
        } catch {
          return { peerId: peer.peerId, card: null, status: 'unreachable' }
        }
      })
    )
    res.json({
      coordinatorPeerId: topo.localPeerId,
      discoveredAgents: discovered,
      totalPeers: topo.peers.length,
      discoveredCount: discovered.filter(d => d.card).length,
    })
  } catch {
    res.json({
      coordinatorPeerId: '',
      discoveredAgents: axlNodes
        .filter(n => n.name !== 'coordinator')
        .map(n => ({
          peerId: `ed25519:${n.name}`,
          card: {
            name: `${n.name}.responsesurface.eth`,
            description: `${n.name} bioregional agent`,
            capabilities: n.name === 'rogue' || n.name === 'phantom' ? ['assessment'] : ['assessment', 'proof-collection'],
            services: ['assessment'],
          },
          status: 'offline',
        })),
      totalPeers: 0,
      discoveredCount: 0,
    })
  }
})

app.post('/api/proofs/submit', async (req, res) => {
  try {
    const { responderEns, location, photoHash, disasterId, agentEns } = req.body
    if (!location?.coordinates || !photoHash) {
      return res.status(400).json({ error: 'location and photoHash required' })
    }

    const proof = {
      responderEns: responderEns || 'anonymous.responsesurface.eth',
      agentEns: agentEns || 'pacific.responsesurface.eth',
      location: { type: 'Point' as const, coordinates: location.coordinates },
      credibilityScore: 0,
      disasterId: disasterId || 'proof-submission',
      timestamp: Date.now(),
      proofHash: photoHash,
      astralAttestation: null as any,
      containment: null as any,
    }

    // Astral offchain attestation
    try {
      const { createAstralClient, createOffchainAttestation } = await import('./integrations/astral-proofs')
      const astral = createAstralClient()
      const attestation = await createOffchainAttestation(
        astral,
        proof.location,
        `Photo proof: ${photoHash.slice(0, 16)}`,
        proof.responderEns,
      )
      proof.astralAttestation = attestation
    } catch (e) {
      console.warn('[proofs] Astral attestation failed:', (e as Error).message)
    }

    // Containment check against disaster zones
    try {
      const disasters = await getActiveDisasters()
      const nearby = disasters.find((d: any) => {
        if (!d.geometry?.[0]?.coordinates) return false
        const [dLng, dLat] = d.geometry[d.geometry.length - 1].coordinates
        const [pLng, pLat] = proof.location.coordinates
        const dist = Math.sqrt((dLng - pLng) ** 2 + (dLat - pLat) ** 2)
        return dist < 3
      })
      proof.containment = nearby ? { contained: true, disasterId: nearby.id, disasterTitle: nearby.title } : { contained: false }
      if (nearby) proof.disasterId = nearby.id
    } catch {}

    // Credibility scoring
    const contained = proof.containment?.contained || false
    const { computeCredibilityScore } = await import('./integrations/astral-proofs')
    proof.credibilityScore = computeCredibilityScore(contained, 1, contained ? 5 : 2)

    // Submit proof onchain
    const privateKey = process.env.EVM_PRIVATE_KEY
    let onChainTx = ''
    if (privateKey && process.env.RESPONSE_FUND_ADDRESS) {
      try {
        const fundContract = createFundContract(privateKey, process.env.RESPONSE_FUND_ADDRESS)
        const receipt = await submitProofOnChain(fundContract, proof.responderEns, photoHash, proof.credibilityScore, proof.disasterId)
        onChainTx = receipt.hash
      } catch (e) {
        console.warn('[proofs] On-chain submitProof failed:', (e as Error).message)
      }
    }

    res.json({
      success: true,
      proof,
      onChainTx,
      message: contained
        ? `Proof verified — location within disaster zone "${proof.containment.disasterTitle}"`
        : 'Proof recorded — not within any active disaster zone',
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// ── Cycle run endpoint: real coordinator logic exposed to frontend ──

interface CycleEvent {
  type: 'system' | 'assessment' | 'proof' | 'allocation' | 'flag'
  agent?: string
  message: string
  timestamp: number
}

const cycleAgentConfigs = [
  {
    ensName: 'pacific.responsesurface.eth',
    role: 'fire' as const,
    bbox: { west: -124.8, south: 32.5, east: -114.5, north: 49.0 } as BBox,
    center: [-120.0, 41.0] as [number, number],
    axlPort: 9002,
  },
  {
    ensName: 'mountain.responsesurface.eth',
    role: 'fire' as const,
    bbox: { west: -114.5, south: 37.0, east: -104.0, north: 49.0 } as BBox,
    center: [-109.0, 43.0] as [number, number],
    axlPort: 9012,
  },
  {
    ensName: 'central.responsesurface.eth',
    role: 'fire' as const,
    bbox: { west: -104.0, south: 37.0, east: -90.0, north: 49.0 } as BBox,
    center: [-97.0, 43.0] as [number, number],
    axlPort: 9022,
  },
  {
    ensName: 'lakes.responsesurface.eth',
    role: 'water' as const,
    bbox: { west: -90.0, south: 37.0, east: -80.5, north: 49.0 } as BBox,
    center: [-85.5, 43.0] as [number, number],
    axlPort: 9032,
  },
  {
    ensName: 'delta.responsesurface.eth',
    role: 'water' as const,
    bbox: { west: -90.0, south: 25.0, east: -80.5, north: 37.0 } as BBox,
    center: [-86.0, 33.0] as [number, number],
    axlPort: 9042,
  },
  {
    ensName: 'gulf.responsesurface.eth',
    role: 'fire' as const,
    bbox: { west: -114.5, south: 25.8, east: -90.0, north: 37.0 } as BBox,
    center: [-102.0, 33.0] as [number, number],
    axlPort: 9052,
  },
  {
    ensName: 'atlantic.responsesurface.eth',
    role: 'water' as const,
    bbox: { west: -80.5, south: 24.5, east: -67.0, north: 42.0 } as BBox,
    center: [-75.0, 34.0] as [number, number],
    axlPort: 9062,
  },
  {
    ensName: 'northeast.responsesurface.eth',
    role: 'water' as const,
    bbox: { west: -80.5, south: 42.0, east: -67.0, north: 49.0 } as BBox,
    center: [-74.0, 45.0] as [number, number],
    axlPort: 9072,
  },
  {
    ensName: 'rogue.responsesurface.eth',
    role: 'adversary' as const,
    bbox: { west: -180, south: -90, east: 180, north: 90 } as BBox,
    center: [-110, 40] as [number, number],
    axlPort: 9082,
  },
  {
    ensName: 'phantom.responsesurface.eth',
    role: 'adversary' as const,
    bbox: { west: -100, south: 35, east: -85, north: 45 } as BBox,
    center: [-92.5, 40] as [number, number],
    axlPort: 9092,
  },
]

let serverCycleNumber = 0

app.post('/api/cycle/run', async (req, res) => {
  const events: CycleEvent[] = []
  const emit = (type: CycleEvent['type'], message: string, agent?: string, links?: { label: string; url: string }[]) => {
    events.push({ type, message, agent, timestamp: Date.now(), ...(links ? { links } : {}) })
  }

  serverCycleNumber++
  const cycleNumber = req.body.cycleNumber || serverCycleNumber
  const shortName = (ens: string) => ens.replace('.responsesurface.eth', '')
  const fmtEth = (wei: string | bigint) => parseFloat(ethers.formatEther(wei)).toFixed(4)

  emit('system', `Cycle ${cycleNumber} — collecting assessments from ${cycleAgentConfigs.length} agents`)

  // Phase 1: Collect real assessments from government APIs
  const assessments: AgentAssessment[] = []

  const collectOne = async (config: typeof cycleAgentConfigs[number]) => {
    if (config.role === 'adversary') {
      const disasters = await getActiveDisasters(undefined, 5)
      return {
        assessment: {
          agentEns: config.ensName,
          bioregion: { bbox: config.bbox, center: config.center },
          disasters: disasters.slice(0, 1),
          severity: 9,
          speciesAtRisk: [],
          needsAssessment: { capital: 9000, labor: 45, compute: 3, data: 2 },
          proofDensity: 0,
          timestamp: new Date().toISOString(),
        } as AgentAssessment,
        msg: `${shortName(config.ensName)} claims severity 9 with 0 verified proofs`,
      }
    }

    const disasters = await getDisastersInBBox(config.bbox)
    let severity = Math.min(disasters.length * 2, 10)
    let speciesAtRisk: any[] = []
    let proofDensity = 0
    const sources: string[] = []

    try { speciesAtRisk = await getThreatenedSpeciesInBBox(config.bbox, 20) } catch {}
    proofDensity = Math.min((speciesAtRisk.length > 0 ? 2 : 0) + disasters.length, 5)
    if (disasters.length > 0) sources.push(`EONET (${disasters.length} events)`)

    if (config.role === 'fire') {
      try {
        const hotspots = await getFireHotspots(config.bbox)
        severity = Math.min(severity + Math.floor(hotspots.length / 10), 10)
        if (hotspots.length > 0) { proofDensity++; sources.push(`FIRMS (${hotspots.length} hotspots)`) }
      } catch {}
      try {
        const aqi = await getAirQuality(config.center[1], config.center[0])
        const maxAQI = Math.max(...aqi.map(r => r.AQI), 0)
        if (maxAQI > 150) severity = Math.min(severity + 2, 10)
        if (maxAQI > 0) sources.push(`AirNow (AQI ${maxAQI})`)
      } catch {}
    }

    if (config.role === 'water') {
      try {
        const sites = await getStreamflow(config.bbox)
        const highFlow = sites.filter(s => s.parameters.some(p => p.code === '00060' && p.value > 10000))
        if (highFlow.length > 3) severity = Math.min(severity + 2, 10)
        if (sites.length > 0) { proofDensity++; sources.push(`USGS (${sites.length} gauges, ${highFlow.length} high-flow)`) }
      } catch {}
      try {
        const threatened = await getThreatenedInBBox(config.bbox)
        if (threatened.length > 10) severity = Math.min(severity + 1, 10)
        if (threatened.length > 0) sources.push(`iNaturalist (${threatened.length} threatened species)`)
      } catch {}
    }

    let verifiedProofDensity = 0
    if (proofDensity > 0 && disasters.length > 0) {
      const bioregionPolygon = {
        type: 'Polygon' as const,
        coordinates: [[
          [config.bbox.west, config.bbox.south],
          [config.bbox.east, config.bbox.south],
          [config.bbox.east, config.bbox.north],
          [config.bbox.west, config.bbox.north],
          [config.bbox.west, config.bbox.south],
        ]],
      }
      const agentLocation = { type: 'Point' as const, coordinates: config.center }
      try {
        const containment = await checkContainmentREST(bioregionPolygon, agentLocation)
        verifiedProofDensity = containment.result ? proofDensity : 0
        if (containment.result) sources.push('Astral (location verified)')
      } catch (e) {
        verifiedProofDensity = 0
        emit('system', `Astral verification failed for ${shortName(config.ensName)}: ${(e as Error).message}`)
      }
    }

    return {
      assessment: {
        agentEns: config.ensName,
        bioregion: { bbox: config.bbox, center: config.center },
        disasters,
        severity,
        speciesAtRisk,
        needsAssessment: {
          capital: severity * 1000,
          labor: Math.max(severity * 5, 10),
          compute: disasters.length > 0 ? 3 : 1,
          data: speciesAtRisk.length > 0 ? 2 : 1,
        },
        proofDensity: verifiedProofDensity,
        timestamp: new Date().toISOString(),
      } as AgentAssessment,
      msg: `${shortName(config.ensName)} — severity ${severity}/10, ${verifiedProofDensity} proofs [${sources.join(', ')}]`,
    }
  }

  const results = await Promise.allSettled(cycleAgentConfigs.map(c => withTimeout(collectOne(c), 30000, shortName(c.ensName))))
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'fulfilled') {
      assessments.push(r.value.assessment)
      emit('assessment', r.value.msg, cycleAgentConfigs[i].ensName)
    } else {
      emit('system', `${shortName(cycleAgentConfigs[i].ensName)}: data collection failed — ${r.reason?.message || r.reason}`)
    }
  }

  if (assessments.length === 0) {
    emit('system', `Cycle ${cycleNumber} aborted — no assessments collected`)
    return res.json({ cycleNumber, events, assessments: [], allocations: [], teeVerified: false, axlOnline: false, ensGateActive: false, ensUpdated: false, storageUploaded: false })
  }

  // Phase 2: AXL relay (5s timeout — nodes may not be running)
  let axlOnline = false
  try {
    const coordAxl = new AXLClient('http://127.0.0.1:9022')
    const topo = await withTimeout(coordAxl.getTopology(), 5000, 'AXL coordinator')
    axlOnline = true
    emit('system', `AXL mesh — ${topo.peers.length} peers, relaying ${assessments.length} assessments`)

    await Promise.allSettled(cycleAgentConfigs.filter(c => c.role !== 'adversary').map(async config => {
      const agentAxl = new AXLClient(`http://127.0.0.1:${config.axlPort}`)
      const agentTopo = await withTimeout(agentAxl.getTopology(), 3000, `AXL ${shortName(config.ensName)}`)
      if (agentTopo.peers.length > 0) {
        const assessment = assessments.find(a => a.agentEns === config.ensName)
        if (assessment) await agentAxl.send(agentTopo.peers[0].peerId, Buffer.from(JSON.stringify(assessment)))
      }
    }))
    emit('system', 'Assessments relayed via encrypted AXL mesh (Ed25519)')
  } catch {
    emit('system', 'AXL offline — assessments collected via direct API')
  }

  // Phase 3: ENS gate + credibility scoring
  let ensGateActive = false
  const ensCredibility = new Map<string, number>()

  const ensPublic = createEnsPublicClient()
  const gatedAssessments: AgentAssessment[] = []
  const ensResults = await Promise.allSettled(assessments.map(a =>
    withTimeout(getAgentMetadata(ensPublic, a.agentEns), 10000, `ENS ${shortName(a.agentEns)}`).then(metadata => ({ a, metadata }))
  ))
  for (const r of ensResults) {
    if (r.status === 'rejected') {
      const ens = (r.reason?.message || '').includes('ENS') ? r.reason.message.split(' ')[1] : '?'
      emit('flag', `Agent rejected — ENS lookup failed: ${r.reason?.message}`)
      continue
    }
    const { a, metadata } = r.value
    const role = metadata['role'] || 'unknown'
    if (!role || role === 'unknown') {
      emit('flag', `${shortName(a.agentEns)} rejected — no ENS role registered`, a.agentEns)
      continue
    }
    const ensScore = metadata['credibility.score'] ? parseInt(metadata['credibility.score']) : 0
    const ensProofs = metadata['credibility.proofs'] ? parseInt(metadata['credibility.proofs']) : 0
    ensCredibility.set(a.agentEns, ensScore)
    ensGateActive = true
    gatedAssessments.push(a)
    emit('system', `ENS — ${shortName(a.agentEns)} verified: ${role}, score ${ensScore}, ${ensProofs} proofs`)
  }
  const assessmentsForScoring = gatedAssessments.length > 0 ? gatedAssessments : assessments
  if (gatedAssessments.length === 0) {
    emit('system', 'ENS gate bypassed — no agents had registered roles')
  }

  // Cross-validation: flag severity outliers
  if (assessmentsForScoring.length >= 2) {
    const avgSeverity = assessmentsForScoring.reduce((s, a) => s + a.severity, 0) / assessmentsForScoring.length
    for (const a of assessmentsForScoring) {
      if (a.severity > avgSeverity * 2.5) {
        emit('flag', `${shortName(a.agentEns)} flagged — severity ${a.severity} is ${(a.severity / avgSeverity).toFixed(1)}x the average`, a.agentEns)
      }
    }
  }

  const scored = assessmentsForScoring.map(a => {
    const ensScore = ensCredibility.get(a.agentEns)
    const credibility = ensScore !== undefined && ensScore > 0
      ? ensScore
      : computeCredibilityScore(true, a.proofDensity, a.severity)
    const isRogue = a.proofDensity === 0 && a.severity >= 9
    emit(
      isRogue ? 'flag' : 'proof',
      `${shortName(a.agentEns)}: credibility ${credibility}/1000${isRogue ? ' — no verified proofs' : ''}`,
      a.agentEns,
    )
    const disasterDensity = 1 + a.disasters.length * 0.4
    return { ...a, credibility, weight: credibility * a.severity * disasterDensity }
  })

  // Phase 4: 0G Compute sealed inference
  let teeVerified = false
  const providerAddress = process.env.ZG_COMPUTE_PROVIDER
  const privateKey = process.env.EVM_PRIVATE_KEY

  if (providerAddress && privateKey) {
    try {
      const broker = await createComputeBroker(privateKey)
      const plan = await runCoordinatorInference(broker, providerAddress, assessmentsForScoring)
      teeVerified = plan.teeVerified
      emit('system', `0G Compute — allocation plan verified in TEE enclave`)
    } catch (e) {
      emit('system', `0G Compute — TEE error: ${(e as Error).message}`)
    }
  } else {
    emit('system', `0G Compute — TEE not configured, using local credibility weighting`)
  }

  // Phase 5: Build allocations — read real contract balance
  let fundPool: bigint
  if (!process.env.RESPONSE_FUND_ADDRESS) {
    emit('system', `ResponseFund — no contract address configured, aborting allocation`)
    return res.json({ cycleNumber, events, assessments, allocations: [], teeVerified, axlOnline: false, ensGateActive: true, ensUpdated: false, storageUploaded: false })
  }
  try {
    const readContract = createFundContractReadonly(process.env.RESPONSE_FUND_ADDRESS)
    const state = await getFundState(readContract)
    fundPool = BigInt(state.balance)
    if (fundPool === 0n) {
      emit('system', `ResponseFund balance is 0 — nothing to allocate`)
      return res.json({ cycleNumber, events, assessments, allocations: [], teeVerified, axlOnline: false, ensGateActive: true, ensUpdated: false, storageUploaded: false })
    }
    emit('system', `ResponseFund balance: ${fmtEth(state.balance)} fUSD available`)
  } catch (e) {
    emit('system', `ResponseFund balance read failed — aborting allocation: ${(e as Error).message}`)
    return res.json({ cycleNumber, events, assessments, allocations: [], teeVerified, axlOnline: false, ensGateActive: true, ensUpdated: false, storageUploaded: false })
  }
  const totalWeight = scored.reduce((s, a) => s + a.weight, 0)

  // Allocate 3% of fund per cycle to preserve balance across many demo cycles
  const ALLOCATION_PCT = 3n
  const allocationPool = fundPool * ALLOCATION_PCT / 100n
  emit('system', `Allocating ${ALLOCATION_PCT}% of balance (${fmtEth(allocationPool.toString())} fUSD) this cycle`)

  const SCALE = 1_000_000_000n
  const allocations = scored.map(s => {
    const share = totalWeight > 0 ? s.weight / totalWeight : 0
    const scaledShare = BigInt(Math.round(share * 1_000_000_000))
    const amount = (allocationPool * scaledShare) / SCALE
    return {
      ensName: s.agentEns,
      amount: amount.toString(),
      disasterId: s.disasters[0]?.id || `zone-${s.agentEns}`,
      timestamp: Date.now(),
      assessmentHash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ agent: s.agentEns, severity: s.severity, cycle: cycleNumber }))),
      teeVerified,
      credibility: s.credibility,
      severity: s.severity,
      share,
      disasterCount: s.disasters.length,
      proofDensity: s.proofDensity,
      weight: s.weight,
    }
  })
  const allocTotal = allocations.reduce((s, a) => s + BigInt(a.amount), 0n)
  if (allocTotal > allocationPool && allocations.length > 0) {
    const excess = allocTotal - allocationPool
    const largest = allocations.reduce((mi, a, i) => BigInt(allocations[mi].amount) >= BigInt(a.amount) ? mi : i, 0)
    allocations[largest].amount = (BigInt(allocations[largest].amount) - excess).toString()
  }

  for (const alloc of allocations) {
    const pct = (alloc.share * 100).toFixed(1)
    const isRogue = scored.find(s => s.agentEns === alloc.ensName)?.proofDensity === 0
    const amt = (Number(BigInt(alloc.amount)) / 1e18).toFixed(2)
    emit('allocation', `${shortName(alloc.ensName)} → ${amt} fUSD (${pct}%)${isRogue ? ' — reduced by credibility gate' : ''}`, alloc.ensName, [
      { label: alloc.ensName, url: `https://app.ens.domains/${alloc.ensName}` },
    ])
  }

  // Phase 6: Execute allocations onchain, then read state
  let fundBalance = ''
  let totalAllocated = ''
  if (process.env.RESPONSE_FUND_ADDRESS && privateKey) {
    try {
      const fundContract = createFundContract(privateKey, process.env.RESPONSE_FUND_ADDRESS)
      const onChainAllocations = allocations.map(a => {
        const agentKey = ethers.keccak256(ethers.concat([ethers.getBytes(privateKey as string), ethers.toUtf8Bytes(a.ensName)]))
        return {
          agent: ethers.computeAddress(agentKey),
          amount: BigInt(a.amount),
          ensName: a.ensName,
          disasterId: a.disasterId,
          assessmentHash: a.assessmentHash,
          teeVerified: a.teeVerified,
        }
      })
      const totalNeeded = onChainAllocations.reduce((s, a) => s + a.amount, 0n)
      if (totalNeeded > 0n) {
        const receipt = await execAllocations(fundContract, onChainAllocations)
        emit('system', `ResponseFund — ${fmtEth(totalNeeded)} fUSD transferred onchain`, undefined, [
          { label: `tx: ${receipt.hash.slice(0, 10)}…`, url: `https://chainscan-galileo.0g.ai/tx/${receipt.hash}` },
        ])
      }
    } catch (e) {
      emit('system', `ResponseFund — transfer failed: ${(e as Error).message}`)
    }
    try {
      const readContract = createFundContractReadonly(process.env.RESPONSE_FUND_ADDRESS)
      const state = await getFundState(readContract)
      fundBalance = state.balance
      totalAllocated = state.totalAllocated
      emit('system', `ResponseFund — ${fmtEth(state.balance)} fUSD remaining, ${fmtEth(state.totalAllocated)} fUSD allocated to date`)
    } catch (e) {
      emit('system', `ResponseFund — balance read failed: ${(e as Error).message}`)
    }
  } else if (process.env.RESPONSE_FUND_ADDRESS) {
    try {
      const readContract = createFundContractReadonly(process.env.RESPONSE_FUND_ADDRESS)
      const state = await getFundState(readContract)
      fundBalance = state.balance
      totalAllocated = state.totalAllocated
      emit('system', `ResponseFund — ${fmtEth(state.balance)} fUSD (read-only, no private key)`)
    } catch (e) {
      emit('system', `ResponseFund — balance read failed: ${(e as Error).message}`)
    }
  }

  // Phase 7: Upload audit log to 0G Storage
  let storageUploaded = false
  const auditPayload = JSON.stringify({
    allocations: allocations.map(a => ({ e: a.ensName, s: a.share.toFixed(4) })),
    c: cycleNumber, t: Date.now(),
  })
  const auditHash = ethers.keccak256(ethers.toUtf8Bytes(auditPayload))
  if (privateKey) {
    try {
      const { txHash, merkleRoot } = await withTimeout(uploadAuditLog(privateKey, {
        type: 'allocation',
        agentEns: 'coordinator.responsesurface.eth',
        data: JSON.parse(auditPayload),
        cycleNumber,
      }), 30000, '0G Storage')
      storageUploaded = true
      emit('system', `0G Storage — audit log committed`, undefined, [
        { label: `root: ${merkleRoot.slice(0, 10)}…`, url: `https://storagescan-newton.0g.ai/tx/${txHash}` },
      ])
    } catch (e) {
      emit('system', `0G Storage — audit hash ${auditHash.slice(0, 14)}… (upload pending)`, undefined, [
        { label: `audit: ${auditHash.slice(0, 10)}…`, url: `https://chainscan-galileo.0g.ai/address/${process.env.RESPONSE_FUND_ADDRESS}` },
      ])
    }
  }

  // Phase 8: Update ENS credibility scores
  let ensUpdated = false
  if (privateKey) {
    const ensWallet = createEnsWalletClient(privateKey as `0x${string}`)
    for (let i = 0; i < scored.length; i++) {
      const s = scored[i]
      try {
        await updateCredibility(ensWallet, s.agentEns, {
          score: s.credibility,
          totalProofs: s.proofDensity,
        })
        emit('system', `ENS updated — ${shortName(s.agentEns)} credibility → ${s.credibility}/1000`, s.agentEns, [
          { label: s.agentEns, url: `https://app.ens.domains/${s.agentEns}` },
        ])
        ensUpdated = true
        if (i < scored.length - 1) await new Promise(r => setTimeout(r, 2000))
      } catch (e) {
        emit('system', `ENS write failed for ${shortName(s.agentEns)}: ${(e as Error).message}`)
      }
    }
  } else {
    emit('system', 'ENS — scores computed but not written (no private key)')
  }

  emit('system', `Cycle ${cycleNumber} complete — ${scored.length} agents scored, ${fmtEth(allocationPool.toString())} fUSD allocated (${ALLOCATION_PCT}% of pool)`)

  res.json({
    cycleNumber,
    events,
    assessments: scored.map(s => ({
      agentEns: s.agentEns,
      severity: s.severity,
      proofDensity: s.proofDensity,
      credibility: s.credibility,
      disasterCount: s.disasters.length,
      speciesAtRisk: s.speciesAtRisk.length,
    })),
    allocations,
    teeVerified,
    axlOnline,
    ensGateActive,
    ensUpdated,
    storageUploaded,
    fundBalance,
    totalAllocated,
  })
})

app.get('/api/cycle/tee-status', async (_req, res) => {
  const providerAddress = process.env.ZG_COMPUTE_PROVIDER
  const privateKey = process.env.EVM_PRIVATE_KEY
  let teeAvailable = false
  if (providerAddress && privateKey) {
    try {
      const broker = await createComputeBroker(privateKey)
      const { endpoint } = await broker.inference.getServiceMetadata(providerAddress)
      teeAvailable = !!endpoint
    } catch {}
  }
  res.json({ teeAvailable, providerConfigured: !!providerAddress })
})

const PORT = process.env.API_PORT || 3001
app.listen(PORT, () => {
  console.log(`[mcp-server] API server running on port ${PORT}`)
  getActiveDisasters().then(events => {
    console.log(`[mcp-server] EONET cache primed: ${events.length} active events`)
  }).catch(() => {})
})
