import { useEffect, useState, useCallback } from 'react'
import Header from './components/Header'
import Globe from './components/Globe'
import FundPanel from './components/FundPanel'
import AgentPanel from './components/AgentPanel'
import ActivityFeed from './components/ActivityFeed'
import CycleSimulator from './components/CycleSimulator'
import ArchitecturePanel from './components/ArchitecturePanel'
import MeshPanel from './components/MeshPanel'
import ProofPanel from './components/ProofPanel'
import ENSPanel from './components/ENSPanel'
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
    axlPubkey: 'ed25519:8f3a2b7c9d1e4f6a0b5c8d2e7f1a3b6c9d4e8f2a',
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
    axlPubkey: 'ed25519:2c7d4e9f1a3b6c8d0e5f2a7b4c9d1e6f3a8b5c0d',
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
    axlPubkey: 'ed25519:5a1b3c7d9e2f4a6b8c0d5e7f1a3b9c2d4e6f8a0b',
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

const AGENT_COLORS: Record<string, string> = {
  fire: '#f97316',
  water: '#3b82f6',
  coordinator: '#f59e0b',
  rogue: '#ef4444',
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  fire: 'Wildfires in CA + NV — EONET, FIRMS hotspots, GBIF, AirNow AQI',
  water: 'Floods in Lower Mississippi — USGS streamflow, GBIF, iNaturalist',
  coordinator: 'Aggregates assessments → sealed inference via 0G TEE',
  rogue: 'Adversarial test — inflated severity, 0 verified proofs',
}

function credColor(score: number): string {
  if (score < 300) return '#ef4444'
  if (score < 600) return '#eab308'
  return '#22c55e'
}

export default function App() {
  const [agents, setAgents] = useState<Agent[]>(FALLBACK_AGENTS)
  const [disasters, setDisasters] = useState<Disaster[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [proofs, setProofs] = useState<Proof[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [fundBalance, setFundBalance] = useState(10000000000000000000n)
  const [fundAllocated, setFundAllocated] = useState(0n)
  const [cycleNumber, setCycleNumber] = useState(1)
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [showArchitecture, setShowArchitecture] = useState(false)
  const [showMesh, setShowMesh] = useState(false)
  const [showProofs, setShowProofs] = useState(false)
  const [showENS, setShowENS] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'dashboard' | 'activity'>('dashboard')

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
        const bal = BigInt(data.balance || '0')
        if (bal > 0n) setFundBalance(bal)
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

  const hasRunCycle = activities.some(a => a.type === 'allocation')

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0a0e17]">
      <Header
        onArchitectureClick={() => setShowArchitecture(true)}
        onMeshClick={() => setShowMesh(true)}
        onProofsClick={() => setShowProofs(true)}
        onENSClick={() => setShowENS(true)}
      />

      <div className="flex-1 flex min-h-0">
        {/* Globe — fills left side */}
        <div className="flex-1 relative">
          <Globe
            agents={agents}
            disasters={disasters}
            allocations={allocations}
            proofs={proofs}
            selectedAgent={selectedAgent}
            onAgentClick={setSelectedAgent}
          />
        </div>

        {/* Sidebar — tells the story */}
        <aside className="w-[600px] bg-[#0d1117] border-l border-white/5 flex flex-col overflow-hidden shrink-0">

          {/* Tab bar */}
          <div className="flex border-b border-white/5 shrink-0">
            <button
              onClick={() => setSidebarTab('dashboard')}
              className={`flex-1 py-2.5 text-[11px] font-medium tracking-wide transition-colors cursor-pointer ${
                sidebarTab === 'dashboard'
                  ? 'text-white border-b-2 border-cyan-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setSidebarTab('activity')}
              className={`flex-1 py-2.5 text-[11px] font-medium tracking-wide transition-colors cursor-pointer relative ${
                sidebarTab === 'activity'
                  ? 'text-white border-b-2 border-cyan-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Activity Log
              {activities.length > 0 && sidebarTab !== 'activity' && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] bg-cyan-500/20 text-cyan-400">
                  {activities.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {sidebarTab === 'dashboard' ? (
              <>
                {/* 1. What is this? */}
                <section className="p-5 border-b border-white/5">
                  <p className="text-[13px] font-medium text-white leading-snug">
                    Disaster response where every decision is verifiable
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed mt-2">
                    AI agents monitor bioregions for natural disasters using government APIs.
                    A coordinator aggregates assessments, runs sealed inference in a trusted enclave,
                    and allocates emergency funds — with onchain identity, verifiable location,
                    and tamper-proof computation.
                  </p>
                  <div className="flex items-center gap-1 mt-3 flex-wrap">
                    {[
                      { label: 'Detection', detail: 'NASA EONET' },
                      { label: 'Mesh', detail: 'Gensyn AXL' },
                      { label: 'Identity', detail: 'ENS' },
                      { label: 'Compute', detail: '0G TEE' },
                      { label: 'Funds', detail: '0G Chain' },
                      { label: 'Audit', detail: '0G Storage' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-500 border border-white/[0.06]">
                          {s.label}
                        </span>
                        {i < 5 && <span className="text-gray-700 text-[9px]">→</span>}
                      </div>
                    ))}
                  </div>
                </section>

                {/* 2. Who are the agents? */}
                <section className="p-5 border-b border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Registered Agents
                    </h3>
                    <span className="text-[10px] text-gray-600">
                      {agents.filter(a => a.status === 'active').length}/{agents.length} online
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {agents.map(agent => {
                      const name = agent.ensName.replace('.responsesurface.eth', '')
                      const color = AGENT_COLORS[name] || '#6b7280'
                      const cred = agent.credibilityScore ?? 0
                      return (
                        <div
                          key={agent.ensName}
                          className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg cursor-pointer hover:bg-white/[0.03] transition-colors"
                          onClick={() => setSelectedAgent(agent.ensName)}
                        >
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                          <div className="flex-1 min-w-0">
                            <div>
                              <span className="text-xs text-gray-300">{name}</span>
                              <span className="text-[10px] text-gray-600 ml-1.5">{agent.role}</span>
                            </div>
                            {AGENT_DESCRIPTIONS[name] && (
                              <div className="text-[9px] text-gray-500 mt-0.5 leading-snug">{AGENT_DESCRIPTIONS[name]}</div>
                            )}
                          </div>
                          {agent.status === 'flagged' && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 shrink-0 uppercase">
                              Flagged
                            </span>
                          )}
                          <div className="w-16 shrink-0">
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${cred / 10}%`, background: credColor(cred) }}
                              />
                            </div>
                          </div>
                          <span
                            className="text-[10px] font-[var(--font-mono)] w-7 text-right shrink-0"
                            style={{ color: credColor(cred) }}
                          >
                            {cred}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2.5 leading-relaxed">
                    Each agent is identified by an ENS subname on Sepolia. Credibility scores gate fund allocation. Click an agent to inspect.
                  </p>
                </section>

                {/* 3. The fund */}
                <section className="p-5 border-b border-white/5">
                  <FundPanel
                    balance={fundBalance}
                    totalAllocated={fundAllocated}
                    allocations={allocations}
                    cycleNumber={cycleNumber}
                  />
                </section>

                {/* 4. Run a cycle */}
                <section className="p-5">
                  <h3 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-3">
                    Allocation Cycle
                  </h3>
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
                  {disasters.length === 0 && (
                    <p className="text-[10px] text-gray-600 mt-2">
                      Loading disaster data from NASA EONET...
                    </p>
                  )}
                  {disasters.length > 0 && !hasRunCycle && (
                    <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">
                      {disasters.length} active disasters detected. Run a cycle to watch the full pipeline in action.
                    </p>
                  )}
                </section>
              </>
            ) : (
              <section className="p-5">
                <ActivityFeed events={activities} />
              </section>
            )}
          </div>

        </aside>
      </div>

      {/* Detail panels — modals */}
      {selectedAgent && (
        <AgentPanel
          ensName={selectedAgent}
          agent={agents.find(a => a.ensName === selectedAgent)!}
          textRecords={{}}
          proofs={proofs.filter(p => p.agentEns === selectedAgent)}
          onClose={() => setSelectedAgent(null)}
        />
      )}
      {showArchitecture && (
        <ArchitecturePanel onClose={() => setShowArchitecture(false)} />
      )}
      {showMesh && (
        <MeshPanel onClose={() => setShowMesh(false)} />
      )}
      {showENS && (
        <ENSPanel agents={agents} onClose={() => setShowENS(false)} />
      )}
      {showProofs && (
        <ProofPanel
          proofs={proofs}
          onProofSubmitted={proof => {
            setProofs(prev => [...prev, proof])
            addActivity({ type: 'proof', agent: proof.agentEns, message: `Proof submitted: ${proof.proofHash.slice(0, 14)}... — credibility ${proof.credibilityScore}` })
          }}
          onClose={() => setShowProofs(false)}
        />
      )}
    </div>
  )
}
