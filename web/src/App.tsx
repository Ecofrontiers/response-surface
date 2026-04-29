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
import type { Agent, Disaster, Allocation, Proof, CycleMapState } from './types'

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
  links?: { label: string; url: string }[]
}

const AGENT_COLORS: Record<string, string> = {
  pacific: '#f97316',
  mountain: '#ef4444',
  central: '#f59e0b',
  lakes: '#3b82f6',
  delta: '#06b6d4',
  gulf: '#8b5cf6',
  atlantic: '#10b981',
  northeast: '#6366f1',
  coordinator: '#f59e0b',
  rogue: '#ff3838',
  phantom: '#ff3838',
  fire: '#ff3838',
  water: '#2dccff',
  coordinator: '#ffb302',
  rogue: '#ff3838',
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  pacific: 'Pacific Coast — EONET, FIRMS, GBIF, AirNow',
  mountain: 'Rocky Mountains — EONET, FIRMS, GBIF',
  central: 'Central Plains — EONET, FIRMS, GBIF',
  lakes: 'Great Lakes — EONET, USGS, GBIF, iNaturalist',
  delta: 'Mississippi Delta — EONET, USGS, GBIF, iNaturalist',
  gulf: 'Gulf Coast — EONET, FIRMS, USGS',
  atlantic: 'Atlantic Seaboard — EONET, USGS, GBIF',
  northeast: 'Northeast — EONET, USGS, GBIF',
  coordinator: 'Aggregates assessments, 0G TEE sealed inference',
  rogue: 'Adversarial — inflated severity, 0 proofs',
  phantom: 'Adversarial — fabricated Midwest data',
}

function credColor(score: number): string {
  if (score < 200) return 'var(--status-critical)'
  if (score < 500) return 'var(--status-serious)'
  if (score < 800) return 'var(--status-caution)'
  return 'var(--status-normal)'
}

function credLabel(score: number): string {
  if (score < 200) return 'CRITICAL'
  if (score < 500) return 'SERIOUS'
  if (score < 800) return 'CAUTION'
  return 'NORMAL'
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
  const [cycleMapState, setCycleMapState] = useState<CycleMapState>({ phase: 'idle', allocationShares: {} })

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
        mapped.filter(a => a.status === 'flagged').forEach(a => {
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
        if (data.allocations?.length) setAllocations(data.allocations)
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
              geometry: { type: 'Point' as const, coordinates: geo.coordinates },
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
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[var(--color-base)]">
      <Header
        onArchitectureClick={() => setShowArchitecture(true)}
        onMeshClick={() => setShowMesh(true)}
        onProofsClick={() => setShowProofs(true)}
        onENSClick={() => setShowENS(true)}
      />

      <div className="flex-1 flex min-h-0 relative">
        {/* Map — full bleed */}
        <div className="flex-1 relative">
          <Globe
            agents={agents}
            disasters={disasters}
            allocations={allocations}
            proofs={proofs}
            selectedAgent={selectedAgent}
            onAgentClick={setSelectedAgent}
            cycleMapState={cycleMapState}
          />
        </div>

        {/* Sidebar — FIRMS pattern: semi-transparent, heavy shadow, one-sided radius */}
        <aside
          className="w-[570px] flex flex-col overflow-hidden shrink-0 z-10"
          style={{
            background: 'rgba(27, 45, 62, 0.92)',
            backdropFilter: 'blur(12px)',
            boxShadow: '-6px 0 24px rgba(0, 0, 0, 0.5)',
            borderLeft: '1px solid var(--border-default)',
          }}
        >
          {/* Tab bar — Astro section band */}
          <div className="flex bg-[var(--color-header)] shrink-0">
            <button
              onClick={() => setSidebarTab('dashboard')}
              className={`flex-1 py-2.5 text-[11px] font-medium tracking-wider uppercase transition-colors cursor-pointer border-b-2 ${
                sidebarTab === 'dashboard'
                  ? 'text-[var(--color-interactive)] border-[var(--color-interactive)]'
                  : 'text-[var(--color-text-placeholder)] border-transparent hover:text-[var(--color-text-secondary)]'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setSidebarTab('activity')}
              className={`flex-1 py-2.5 text-[11px] font-medium tracking-wider uppercase transition-colors cursor-pointer border-b-2 relative ${
                sidebarTab === 'activity'
                  ? 'text-[var(--color-interactive)] border-[var(--color-interactive)]'
                  : 'text-[var(--color-text-placeholder)] border-transparent hover:text-[var(--color-text-secondary)]'
              }`}
            >
              Activity
              {activities.length > 0 && sidebarTab !== 'activity' && (
                <span className="ml-1 text-[9px] tabular" style={{ color: 'var(--status-standby)' }}>
                  {activities.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sidebarTab === 'dashboard' ? (
              <>
                {/* System description */}
                <div className="px-4 py-3 border-b border-[var(--border-default)]">
                  <p className="text-[13px] font-medium text-[var(--color-text)] leading-snug">
                    Verifiable disaster response coordination
                  </p>
                  <p className="text-[11px] text-[var(--color-text-placeholder)] leading-relaxed mt-1.5">
                    AI agents monitor regions via government APIs. Sealed inference allocates funds weighted by onchain credibility.
                  </p>

                  {/* Pipeline — connected steps */}
                  <div className="mt-3 flex items-center">
                    {[
                      { label: 'Detect', color: 'var(--status-critical)' },
                      { label: 'Mesh', color: 'var(--viz-3)' },
                      { label: 'ENS', color: 'var(--status-standby)' },
                      { label: 'TEE', color: 'var(--status-serious)' },
                      { label: 'Fund', color: 'var(--status-normal)' },
                      { label: 'Audit', color: 'var(--status-serious)' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center flex-1">
                        <span
                          className="text-[9px] font-medium tracking-wider uppercase px-1"
                          style={{ color: s.color }}
                        >
                          {s.label}
                        </span>
                        {i < 5 && <div className="flex-1 h-px" style={{ background: `${s.color}` , opacity: 0.25 }} />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section band — Agents */}
                <SectionBand label="Agents" right={`${agents.filter(a => a.status === 'active').length}/${agents.length} online`} />

                <div className="px-3 py-2 space-y-1">
                  {agents.map(agent => {
                    const name = agent.ensName.replace('.responsesurface.eth', '')
                    const color = AGENT_COLORS[name] || 'var(--status-off)'
                    const cred = agent.credibilityScore ?? 0
                    const isFlagged = agent.status === 'flagged'
                    return (
                      <div
                        key={agent.ensName}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors rounded-[var(--radius)] hover:bg-[var(--color-hover)]"
                        style={{ borderLeft: `3px solid ${color}` }}
                        onClick={() => setSelectedAgent(agent.ensName)}
                      >
                        {/* Status dot */}
                        <div
                          className={`w-[8px] h-[8px] rounded-full shrink-0 ${isFlagged ? 'status-glow-critical' : 'status-glow-normal'}`}
                          style={{ background: isFlagged ? 'var(--status-critical)' : 'var(--status-normal)' }}
                        />

                        {/* Name + desc */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-medium text-[var(--color-text)]">{name}</span>
                            <span
                              className="text-[8px] px-1 py-px rounded-[2px] uppercase tracking-wider font-medium"
                              style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}
                            >
                              {agent.role}
                            </span>
                            {isFlagged && (
                              <span className="text-[8px] px-1 py-px rounded-[2px] uppercase tracking-wider font-medium" style={{ color: 'var(--status-critical)', background: 'rgba(255,56,56,0.15)' }}>
                                flagged
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[var(--color-text-placeholder)] mt-px truncate">
                            {AGENT_DESCRIPTIONS[name]}
                          </div>
                        </div>

                        {/* Credibility — large mono number */}
                        <div className="text-right shrink-0">
                          <div
                            className="text-[16px] font-medium font-[var(--font-mono)] tabular leading-none"
                            style={{ color: credColor(cred) }}
                          >
                            {cred}
                          </div>
                          <div className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: credColor(cred), opacity: 0.7 }}>
                            {credLabel(cred)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Section band — Fund */}
                <SectionBand label="Response Fund" right={`Cycle ${cycleNumber}`} />

                <div className="px-4 py-3">
                  <FundPanel
                    balance={fundBalance}
                    totalAllocated={fundAllocated}
                    allocations={allocations}
                    cycleNumber={cycleNumber}
                  />
                </div>

                {/* Section band — Cycle */}
                <SectionBand label="Allocation Cycle" />

                <div className="px-4 py-3">
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
                    onMapState={setCycleMapState}
                  />
                  {disasters.length === 0 && (
                    <p className="text-[10px] text-[var(--color-text-placeholder)] mt-2">
                      Loading disaster data from NASA EONET...
                    </p>
                  )}
                  {disasters.length > 0 && !hasRunCycle && (
                    <p className="text-[10px] text-[var(--color-text-placeholder)] mt-2">
                      {disasters.length} active disasters. Run a cycle to execute the full pipeline.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="px-3 py-2">
                <ActivityFeed events={activities} />
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Detail panels */}
      {selectedAgent && (
        <AgentPanel
          ensName={selectedAgent}
          agent={agents.find(a => a.ensName === selectedAgent)!}
          textRecords={{}}
          proofs={proofs.filter(p => p.agentEns === selectedAgent)}
          onClose={() => setSelectedAgent(null)}
        />
      )}
      {showArchitecture && <ArchitecturePanel onClose={() => setShowArchitecture(false)} />}
      {showMesh && <MeshPanel onClose={() => setShowMesh(false)} />}
      {showENS && <ENSPanel agents={agents} onClose={() => setShowENS(false)} />}
      {showProofs && (
        <ProofPanel
          proofs={proofs}
          onProofSubmitted={proof => {
            setProofs(prev => [...prev, proof])
            addActivity({ type: 'proof', agent: proof.agentEns, message: `Proof submitted: ${proof.proofHash.slice(0, 14)}...` })
          }}
          onClose={() => setShowProofs(false)}
        />
      )}
    </div>
  )
}

function SectionBand({ label, right }: { label: string; right?: string }) {
  return (
    <div className="px-4 py-1.5 bg-[var(--color-header)] flex items-center justify-between border-y border-[var(--border-default)]">
      <span className="text-[10px] font-medium text-[var(--color-text-placeholder)] uppercase tracking-wider">{label}</span>
      {right && <span className="text-[10px] text-[var(--color-text-placeholder)] font-[var(--font-mono)] tabular">{right}</span>}
    </div>
  )
}
