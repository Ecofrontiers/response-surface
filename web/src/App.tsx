import { useEffect, useState, useCallback } from 'react'
import Header from './components/Header'
import Globe from './components/Globe'
import FundPanel from './components/FundPanel'
import AgentPanel from './components/AgentPanel'
import ActivityFeed from './components/ActivityFeed'
import CycleSimulator from './components/CycleSimulator'
import type { Agent, Disaster, Allocation, Proof } from './types'

const FALLBACK_AGENTS: Agent[] = [
  {
    ensName: 'fire.responsesurface.eth',
    role: 'agent',
    bioregion: {
      bbox: { west: -124.4, south: 32.5, east: -114.1, north: 42.0 },
      center: [-119.4, 37.2],
    },
    dataSources: ['EONET', 'FIRMS', 'GBIF', 'AirNow'],
    axlPubkey: '',
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
    axlPubkey: '',
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
    axlPubkey: '',
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
    axlPubkey: '',
    status: 'flagged',
    credibilityScore: 101,
  },
]

export interface ActivityEvent {
  id: string
  timestamp: number
  type: 'disaster' | 'assessment' | 'proof' | 'allocation' | 'flag' | 'system'
  agent?: string
  message: string
}

export default function App() {
  const [agents, setAgents] = useState<Agent[]>(FALLBACK_AGENTS)
  const [disasters, setDisasters] = useState<Disaster[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [proofs] = useState<Proof[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [fundBalance, setFundBalance] = useState(0n)
  const [fundAllocated, setFundAllocated] = useState(0n)
  const [cycleNumber, setCycleNumber] = useState(1)
  const [activities, setActivities] = useState<ActivityEvent[]>([])

  const addActivity = useCallback((event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    setActivities(prev => {
      if (prev.length > 0 && prev[0].message === event.message && Date.now() - prev[0].timestamp < 2000) {
        return prev
      }
      return [{
        ...event,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      }, ...prev].slice(0, 50)
    })
  }, [])

  useEffect(() => {
    addActivity({ type: 'system', message: 'Response Surface initialized' })

    fetch('/api/agents')
      .then(r => r.json())
      .then((data: any[]) => {
        const mapped: Agent[] = data.map(a => ({
          ensName: a.ensName,
          role: a.role,
          bioregion: a.bioregion,
          dataSources: a.dataSources,
          axlPubkey: a.axlPubkey || '',
          status: a.status,
          credibilityScore: a.credibility ?? a.credibilityScore,
        }))
        setAgents(mapped)
        addActivity({ type: 'system', message: `Loaded ${mapped.length} agents from registry` })
        const flagged = mapped.filter(a => a.status === 'flagged')
        flagged.forEach(a => {
          addActivity({ type: 'flag', agent: a.ensName, message: `${a.ensName} flagged — credibility ${a.credibilityScore ?? '?'}/1000` })
        })
      })
      .catch(() => {
        addActivity({ type: 'system', message: 'API unavailable — using fallback agent data' })
      })

    fetch('/api/fund')
      .then(r => r.json())
      .then(data => {
        setFundBalance(BigInt(data.balance || '0'))
        setFundAllocated(BigInt(data.totalAllocated || '0'))
        setCycleNumber(data.cycleNumber || 1)
        if (data.allocations?.length) {
          setAllocations(data.allocations)
        }
        addActivity({ type: 'system', message: `Fund state loaded — cycle ${data.cycleNumber || 1}` })
      })
      .catch(() => {})
  }, [addActivity])

  const handleAgentUpdate = useCallback((ensName: string, updates: Partial<Agent>) => {
    setAgents(prev => prev.map(a => a.ensName === ensName ? { ...a, ...updates } : a))
  }, [])

  useEffect(() => {
    fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=20')
      .then(r => r.json())
      .then(data => {
        const mapped: Disaster[] = (data.events || [])
          .filter((e: any) => e.geometry?.length > 0)
          .map((e: any) => {
            const geo = e.geometry[e.geometry.length - 1]
            const cat = e.categories?.[0]?.id || 'other'
            return {
              id: e.id,
              title: e.title,
              category: cat,
              geometry: {
                type: 'Point' as const,
                coordinates: geo.coordinates,
              },
              severity: Math.min(e.geometry.length, 10),
            }
          })
        setDisasters(mapped)
        addActivity({ type: 'disaster', message: `${mapped.length} active disasters from NASA EONET` })
        mapped.slice(0, 3).forEach(d => {
          addActivity({ type: 'disaster', message: `Tracking: ${d.title}` })
        })
      })
      .catch(() => {})
  }, [addActivity])

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <Header />
      <Globe
        agents={agents}
        disasters={disasters}
        allocations={allocations}
        proofs={proofs}
        selectedAgent={selectedAgent}
        onAgentClick={setSelectedAgent}
      />
      <FundPanel
        balance={fundBalance}
        totalAllocated={fundAllocated}
        allocations={allocations}
        cycleNumber={cycleNumber}
      />
      <ActivityFeed events={activities} />
      <CycleSimulator
        agents={agents}
        disasters={disasters}
        cycleNumber={cycleNumber}
        onActivity={addActivity}
        onAllocations={setAllocations}
        onCycleAdvance={() => setCycleNumber(n => n + 1)}
        onAgentUpdate={handleAgentUpdate}
        onFundUpdate={(balance, allocated) => {
          setFundBalance(balance)
          setFundAllocated(allocated)
        }}
      />
      {selectedAgent && (
        <AgentPanel
          ensName={selectedAgent}
          agent={agents.find(a => a.ensName === selectedAgent)!}
          textRecords={{}}
          proofs={proofs.filter(p => p.agentEns === selectedAgent)}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  )
}
