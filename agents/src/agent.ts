import 'dotenv/config'
import { AXLClient } from './integrations/axl-client'
import { getActiveDisasters, getDisastersInBBox } from './services/nasa-eonet'
import { getFireHotspots } from './services/nasa-firms'
import { getSpeciesInBBox, getThreatenedSpeciesInBBox } from './services/gbif'
import { getAirQuality } from './services/epa-airnow'
import { getStreamflow } from './services/usgs-water'
import { getThreatenedInBBox } from './services/inat'
import { uploadAuditLog } from './integrations/zerog-storage'
import type { BBox, AgentAssessment } from './types'

interface AgentConfig {
  name: string
  ensName: string
  role: 'fire' | 'water'
  bbox: BBox
  center: [number, number]
  dataSources: string[]
  axlPort: number
  coordinatorPeerId: string
}

const AGENTS: Record<string, AgentConfig> = {
  fire: {
    name: 'fire',
    ensName: 'fire.responsesurface.eth',
    role: 'fire',
    bbox: { west: -124.4, south: 32.5, east: -114.1, north: 42.0 },
    center: [-119.4, 37.2],
    dataSources: ['EONET', 'FIRMS', 'GBIF', 'AirNow'],
    axlPort: 9002,
    coordinatorPeerId: '',
  },
  water: {
    name: 'water',
    ensName: 'water.responsesurface.eth',
    role: 'water',
    bbox: { west: -95.0, south: 29.0, east: -88.0, north: 37.0 },
    center: [-91.5, 33.0],
    dataSources: ['USGS', 'GBIF', 'iNaturalist'],
    axlPort: 9012,
    coordinatorPeerId: '',
  },
}

async function collectAssessment(config: AgentConfig): Promise<AgentAssessment> {
  const disasters = await getDisastersInBBox(config.bbox)
  let severity = Math.min(disasters.length * 2, 10)

  const speciesAtRisk = await getThreatenedSpeciesInBBox(config.bbox, 20)

  if (config.role === 'fire') {
    try {
      const hotspots = await getFireHotspots(config.bbox)
      severity = Math.min(severity + Math.floor(hotspots.length / 10), 10)
    } catch (e) {
      console.warn('FIRMS unavailable:', (e as Error).message)
    }

    try {
      const center = config.center
      const aqi = await getAirQuality(center[1], center[0])
      const maxAQI = Math.max(...aqi.map(r => r.AQI), 0)
      if (maxAQI > 150) severity = Math.min(severity + 2, 10)
    } catch (e) {
      console.warn('AirNow unavailable:', (e as Error).message)
    }
  }

  if (config.role === 'water') {
    try {
      const sites = await getStreamflow(config.bbox)
      const highFlow = sites.filter(s =>
        s.parameters.some(p => p.code === '00060' && p.value > 10000),
      )
      if (highFlow.length > 3) severity = Math.min(severity + 2, 10)
    } catch (e) {
      console.warn('USGS unavailable:', (e as Error).message)
    }

    try {
      const threatened = await getThreatenedInBBox(config.bbox)
      if (threatened.length > 10) severity = Math.min(severity + 1, 10)
    } catch (e) {
      console.warn('iNaturalist unavailable:', (e as Error).message)
    }
  }

  return {
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
    proofDensity: 0,
    timestamp: new Date().toISOString(),
  }
}

async function runAgent(agentName: string) {
  const config = AGENTS[agentName]
  if (!config) throw new Error(`Unknown agent: ${agentName}. Use: fire, water`)

  const axl = new AXLClient(`http://127.0.0.1:${config.axlPort}`)

  try {
    const topo = await axl.getTopology()
    console.log(`[${config.ensName}] Connected to AXL mesh. Peer ID: ${topo.localPeerId}`)
    console.log(`[${config.ensName}] Peers: ${topo.peers.map(p => p.peerId.slice(0, 12)).join(', ')}`)

    if (!config.coordinatorPeerId && topo.peers.length > 0) {
      config.coordinatorPeerId = topo.peers[0].peerId
    }
  } catch {
    console.warn(`[${config.ensName}] AXL not available — running in standalone mode`)
  }

  console.log(`[${config.ensName}] Starting agent loop (60s interval)`)

  async function tick() {
    try {
      console.log(`[${config.ensName}] Collecting assessment...`)
      const assessment = await collectAssessment(config)
      console.log(`[${config.ensName}] Severity: ${assessment.severity}/10, Disasters: ${assessment.disasters.length}, Species at risk: ${assessment.speciesAtRisk.length}`)

      if (config.coordinatorPeerId) {
        try {
          await axl.send(config.coordinatorPeerId, Buffer.from(JSON.stringify(assessment)))
          console.log(`[${config.ensName}] Sent assessment to coordinator via AXL`)
        } catch (e) {
          console.warn(`[${config.ensName}] AXL send failed:`, (e as Error).message)
        }
      }

      if (process.env.EVM_PRIVATE_KEY) {
        try {
          const { txHash, merkleRoot } = await uploadAuditLog(process.env.EVM_PRIVATE_KEY, {
            type: 'assessment',
            agentEns: config.ensName,
            data: assessment,
            cycleNumber: 0,
          })
          console.log(`[${config.ensName}] Audit log: tx=${txHash.slice(0, 10)}... root=${merkleRoot.slice(0, 10)}...`)
        } catch (e) {
          console.warn(`[${config.ensName}] 0G Storage upload failed:`, (e as Error).message)
        }
      }
    } catch (e) {
      console.error(`[${config.ensName}] Assessment error:`, (e as Error).message)
    }
  }

  await tick()
  setInterval(tick, 60_000)
}

const agentName = process.argv[2] || 'fire'
runAgent(agentName).catch(console.error)
