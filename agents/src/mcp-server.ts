import 'dotenv/config'
import express from 'express'
import { getActiveDisasters, getDisastersInBBox } from './services/nasa-eonet'
import { getFireHotspots } from './services/nasa-firms'
import { getSpeciesInBBox } from './services/gbif'
import { getAirQuality } from './services/epa-airnow'
import { getStreamflow } from './services/usgs-water'
import { getObservationsInBBox } from './services/inat'
import { getFundState, createFundContractReadonly } from './integrations/zerog-chain'
import { AXLClient } from './integrations/axl-client'
import type { BBox } from './types'

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

const PORT = process.env.API_PORT || 3001
app.listen(PORT, () => {
  console.log(`[mcp-server] API server running on port ${PORT}`)
})
