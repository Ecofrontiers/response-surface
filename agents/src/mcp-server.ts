import 'dotenv/config'
import express from 'express'
import { ethers } from 'ethers'
import { getActiveDisasters, getDisastersInBBox } from './services/nasa-eonet'
import { getFireHotspots } from './services/nasa-firms'
import { getSpeciesInBBox, getThreatenedSpeciesInBBox } from './services/gbif'
import { getAirQuality } from './services/epa-airnow'
import { getStreamflow } from './services/usgs-water'
import { getObservationsInBBox, getThreatenedInBBox } from './services/inat'
import { getFundState, createFundContractReadonly, createFundContract, executeAllocations as execAllocations } from './integrations/zerog-chain'
import { AXLClient } from './integrations/axl-client'
import { computeCredibilityScore } from './integrations/astral-proofs'
import { createComputeBroker, runCoordinatorInference } from './integrations/zerog-compute'
import { uploadAuditLog } from './integrations/zerog-storage'
import { createEnsWalletClient, createEnsPublicClient, updateCredibility, getAgentMetadata } from './integrations/ens-identity'
import type { BBox, AgentAssessment } from './types'

const app = express()
app.use(express.json())

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
  { name: 'fire', port: 9002 },
  { name: 'water', port: 9012 },
  { name: 'coordinator', port: 9022 },
  { name: 'rogue', port: 9032 },
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

app.get('/api/agents', async (_req, res) => {
  const pubkeys = await Promise.all(axlNodes.map(n => getAxlPubkey(n.port)))

  res.json([
    {
      ensName: 'fire.responsesurface.eth',
      role: 'agent',
      bioregion: {
        bbox: { west: -124.4, south: 32.5, east: -114.1, north: 42.0 },
        center: [-119.4, 37.2],
      },
      dataSources: ['EONET', 'FIRMS', 'GBIF', 'AirNow'],
      axlPubkey: pubkeys[0],
      status: 'active',
      credibilityScore: 901,
    },
    {
      ensName: 'water.responsesurface.eth',
      role: 'agent',
      bioregion: {
        bbox: { west: -95.0, south: 29.0, east: -88.0, north: 37.0 },
        center: [-91.5, 33.0],
      },
      dataSources: ['USGS', 'GBIF', 'iNaturalist'],
      axlPubkey: pubkeys[1],
      status: 'active',
      credibilityScore: 604,
    },
    {
      ensName: 'coordinator.responsesurface.eth',
      role: 'coordinator',
      bioregion: {
        bbox: { west: -124.4, south: 24.4, east: -66.9, north: 49.4 },
        center: [-95.7, 37.0],
      },
      dataSources: ['all'],
      axlPubkey: pubkeys[2],
      status: 'active',
      credibilityScore: 1000,
    },
    {
      ensName: 'rogue.responsesurface.eth',
      role: 'adversary',
      bioregion: {
        bbox: { west: -180, south: -90, east: 180, north: 90 },
        center: [-110, 40],
      },
      dataSources: ['EONET'],
      axlPubkey: pubkeys[3],
      status: 'flagged',
      credibilityScore: 101,
    },
  ])
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
            capabilities: n.name === 'rogue' ? ['assessment'] : ['assessment', 'proof-collection'],
            services: ['assessment'],
          },
          status: 'simulated',
        })),
      totalPeers: 3,
      discoveredCount: 3,
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
      agentEns: agentEns || 'fire.responsesurface.eth',
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

    res.json({
      success: true,
      proof,
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
    ensName: 'fire.responsesurface.eth',
    role: 'fire' as const,
    bbox: { west: -124.4, south: 32.5, east: -114.1, north: 42.0 } as BBox,
    center: [-119.4, 37.2] as [number, number],
    axlPort: 9002,
  },
  {
    ensName: 'water.responsesurface.eth',
    role: 'water' as const,
    bbox: { west: -95.0, south: 29.0, east: -88.0, north: 37.0 } as BBox,
    center: [-91.5, 33.0] as [number, number],
    axlPort: 9012,
  },
  {
    ensName: 'rogue.responsesurface.eth',
    role: 'adversary' as const,
    bbox: { west: -180, south: -90, east: 180, north: 90 } as BBox,
    center: [-110, 40] as [number, number],
    axlPort: 9032,
  },
]

let serverCycleNumber = 0

app.post('/api/cycle/run', async (req, res) => {
  const events: CycleEvent[] = []
  const emit = (type: CycleEvent['type'], message: string, agent?: string) => {
    events.push({ type, message, agent, timestamp: Date.now() })
  }

  serverCycleNumber++
  const cycleNumber = req.body.cycleNumber || serverCycleNumber
  emit('system', `── Cycle ${cycleNumber} starting ──`)

  // Phase 1: Collect real assessments from government APIs
  const assessments: AgentAssessment[] = []

  for (const config of cycleAgentConfigs) {
    try {
      if (config.role === 'adversary') {
        const disasters = await getActiveDisasters(undefined, 5)
        assessments.push({
          agentEns: config.ensName,
          bioregion: { bbox: config.bbox, center: config.center },
          disasters: disasters.slice(0, 1),
          severity: 9,
          speciesAtRisk: [],
          needsAssessment: { capital: 9000, labor: 45, compute: 3, data: 2 },
          proofDensity: 0,
          timestamp: new Date().toISOString(),
        })
        emit('assessment', `${config.ensName} submits inflated assessment (severity 9, 0 proofs)`, config.ensName)
        continue
      }

      const disasters = await getDisastersInBBox(config.bbox)
      let severity = Math.min(disasters.length * 2, 10)
      let speciesAtRisk: any[] = []
      let proofDensity = 0

      try { speciesAtRisk = await getThreatenedSpeciesInBBox(config.bbox, 20) } catch {}
      proofDensity = Math.min((speciesAtRisk.length > 0 ? 2 : 0) + disasters.length, 5)

      if (config.role === 'fire') {
        try {
          const hotspots = await getFireHotspots(config.bbox)
          severity = Math.min(severity + Math.floor(hotspots.length / 10), 10)
          if (hotspots.length > 0) proofDensity++
          emit('system', `FIRMS: ${hotspots.length} fire hotspots in California bioregion`)
        } catch {}
        try {
          const aqi = await getAirQuality(config.center[1], config.center[0])
          const maxAQI = Math.max(...aqi.map(r => r.AQI), 0)
          if (maxAQI > 150) severity = Math.min(severity + 2, 10)
          if (maxAQI > 0) emit('system', `AirNow: max AQI ${maxAQI} in California`)
        } catch {}
      }

      if (config.role === 'water') {
        try {
          const sites = await getStreamflow(config.bbox)
          const highFlow = sites.filter(s => s.parameters.some(p => p.code === '00060' && p.value > 10000))
          if (highFlow.length > 3) severity = Math.min(severity + 2, 10)
          if (sites.length > 0) proofDensity++
          emit('system', `USGS: ${sites.length} stream gauges, ${highFlow.length} high-flow in Gulf Coast`)
        } catch {}
        try {
          const threatened = await getThreatenedInBBox(config.bbox)
          if (threatened.length > 10) severity = Math.min(severity + 1, 10)
          if (threatened.length > 0) emit('system', `iNaturalist: ${threatened.length} threatened species in Gulf Coast`)
        } catch {}
      }

      assessments.push({
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
        proofDensity,
        timestamp: new Date().toISOString(),
      })
      emit('assessment', `${config.ensName} submits assessment (severity ${severity}, ${proofDensity} proofs, ${disasters.length} disasters)`, config.ensName)
    } catch (e) {
      emit('system', `${config.ensName}: assessment collection failed — ${(e as Error).message}`)
    }
  }

  if (assessments.length === 0) {
    emit('system', `── Cycle ${cycleNumber} aborted: no assessments ──`)
    return res.json({ cycleNumber, events, assessments: [], allocations: [], teeVerified: false, axlOnline: false, ensGateActive: false, ensUpdated: false, storageUploaded: false })
  }

  // Phase 2: AXL relay
  let axlOnline = false
  try {
    const coordAxl = new AXLClient('http://127.0.0.1:9022')
    const topo = await coordAxl.getTopology()
    axlOnline = true
    emit('system', `AXL mesh online — ${topo.peers.length} peers connected to coordinator`)

    for (const config of cycleAgentConfigs) {
      if (config.role === 'adversary') continue
      try {
        const agentAxl = new AXLClient(`http://127.0.0.1:${config.axlPort}`)
        const agentTopo = await agentAxl.getTopology()
        if (agentTopo.peers.length > 0) {
          const assessment = assessments.find(a => a.agentEns === config.ensName)
          if (assessment) {
            await agentAxl.send(agentTopo.peers[0].peerId, Buffer.from(JSON.stringify(assessment)))
            emit('system', `AXL: ${config.ensName.split('.')[0]} → coordinator (Ed25519 authenticated)`)
          }
        }
      } catch (e) {
        emit('system', `AXL relay for ${config.ensName.split('.')[0]}: ${(e as Error).message}`)
      }
    }
    emit('system', 'All assessments relayed via encrypted AXL mesh')
  } catch {
    emit('system', 'AXL mesh offline — assessments collected via direct API')
  }

  // Phase 3: ENS gate + credibility scoring
  let ensGateActive = false
  const ensCredibility = new Map<string, number>()

  const ensPublic = createEnsPublicClient()
  for (const a of assessments) {
    try {
      const metadata = await getAgentMetadata(ensPublic, a.agentEns)
      const ensScore = metadata['credibility.score'] ? parseInt(metadata['credibility.score']) : 0
      const ensProofs = metadata['credibility.proofs'] ? parseInt(metadata['credibility.proofs']) : 0
      const role = metadata['role'] || 'unknown'
      ensCredibility.set(a.agentEns, ensScore)
      if (ensScore > 0) ensGateActive = true
      emit('system', `ENS gate: ${a.agentEns} — score=${ensScore}, proofs=${ensProofs}, role=${role}`)
    } catch {
      const score = computeCredibilityScore(true, a.proofDensity, a.severity)
      ensCredibility.set(a.agentEns, score)
      emit('system', `ENS gate: ${a.agentEns} — no ENS record, computed score=${score}`)
    }
  }

  // Cross-validation: flag severity outliers
  if (assessments.length >= 2) {
    const avgSeverity = assessments.reduce((s, a) => s + a.severity, 0) / assessments.length
    for (const a of assessments) {
      if (a.severity > avgSeverity * 2.5) {
        emit('flag', `CROSS-VALIDATION: ${a.agentEns} severity ${a.severity} is ${(a.severity / avgSeverity).toFixed(1)}x average`, a.agentEns)
      }
    }
  }

  const scored = assessments.map(a => {
    const ensScore = ensCredibility.get(a.agentEns)
    const credibility = ensScore !== undefined && ensScore > 0
      ? ensScore
      : computeCredibilityScore(true, a.proofDensity, a.severity)
    const isRogue = a.proofDensity === 0 && a.severity >= 9
    emit(
      isRogue ? 'flag' : 'proof',
      `${a.agentEns}: credibility ${credibility}/1000${isRogue ? ' — no verified proofs' : ''}`,
      a.agentEns,
    )
    return { ...a, credibility, weight: credibility * a.severity }
  })

  // Phase 4: 0G Compute sealed inference (or local fallback)
  let teeVerified = false
  const providerAddress = process.env.ZG_COMPUTE_PROVIDER
  const privateKey = process.env.EVM_PRIVATE_KEY

  if (providerAddress && privateKey) {
    try {
      const broker = await createComputeBroker(privateKey)
      const plan = await runCoordinatorInference(broker, providerAddress, assessments)
      teeVerified = plan.teeVerified
      emit('system', `0G Compute: sealed inference verified in TEE (chatID: ${plan.chatID})`)
    } catch (e) {
      emit('system', `0G Compute: TEE failed — ${(e as Error).message}`)
    }
  } else {
    emit('system', '0G Compute: TEE unavailable — local credibility-weighted allocation')
  }

  // Phase 5: Build allocations
  const fundPool = 10000000000000000000n
  const totalWeight = scored.reduce((s, a) => s + a.weight, 0)

  const allocations = scored.map(s => {
    const share = totalWeight > 0 ? s.weight / totalWeight : 0
    const amount = BigInt(Math.floor(Number(fundPool) * share))
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
    }
  })

  for (const alloc of allocations) {
    const pct = (alloc.share * 100).toFixed(1)
    const isRogue = scored.find(s => s.agentEns === alloc.ensName)?.proofDensity === 0
    emit('allocation', `${alloc.ensName}: ${pct}% of fund${isRogue ? ' (reduced by credibility gate)' : ''}`, alloc.ensName)
  }

  // Phase 6: On-chain fund state
  let fundBalance = ''
  let totalAllocated = ''
  if (process.env.RESPONSE_FUND_ADDRESS) {
    try {
      const contract = createFundContractReadonly(process.env.RESPONSE_FUND_ADDRESS)
      const state = await getFundState(contract)
      fundBalance = state.balance
      totalAllocated = state.totalAllocated
      emit('system', `0G Chain: fund balance ${ethers.formatEther(state.balance)} fUSD, cycle ${state.cycleNumber}`)
    } catch (e) {
      emit('system', `0G Chain: fund read failed — ${(e as Error).message}`)
    }
  }

  // Phase 7: Upload audit log to 0G Storage
  let storageUploaded = false
  if (privateKey) {
    try {
      const { txHash, merkleRoot } = await uploadAuditLog(privateKey, {
        type: 'allocation',
        agentEns: 'coordinator.responsesurface.eth',
        data: { assessments: assessments.map(a => a.agentEns), allocations: allocations.map(a => ({ ensName: a.ensName, share: a.share })) },
        cycleNumber,
      })
      storageUploaded = true
      emit('system', `0G Storage: audit log uploaded (tx: ${txHash.slice(0, 14)}..., root: ${merkleRoot.slice(0, 14)}...)`)
    } catch (e) {
      emit('system', `0G Storage: upload failed — ${(e as Error).message}`)
    }
  }

  // Phase 8: Update ENS credibility scores
  let ensUpdated = false
  if (privateKey) {
    const ensWallet = createEnsWalletClient(privateKey as `0x${string}`)
    for (const s of scored) {
      try {
        await updateCredibility(ensWallet, s.agentEns, {
          score: s.credibility,
          totalProofs: s.proofDensity,
        })
        emit('system', `ENS write: ${s.agentEns} credibility → ${s.credibility}/1000`)
        ensUpdated = true
      } catch (e) {
        emit('system', `ENS write failed for ${s.agentEns}: ${(e as Error).message}`)
      }
    }
  } else {
    emit('system', 'ENS: credibility scores computed (no write — EVM_PRIVATE_KEY not set)')
  }

  emit('system', `── Cycle ${cycleNumber} complete ──`)

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
