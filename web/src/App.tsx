import { useEffect, useState, useCallback } from 'react'
import Header from './components/Header'
import Globe from './components/Globe'
import FundPanel from './components/FundPanel'
import AgentPanel from './components/AgentPanel'
import ActivityFeed from './components/ActivityFeed'
import AgentMessageLog from './components/AgentMessageLog'
import CycleSimulator from './components/CycleSimulator'
import ArchitecturePanel from './components/ArchitecturePanel'
import MeshPanel from './components/MeshPanel'
import ProofPanel from './components/ProofPanel'
import ENSPanel from './components/ENSPanel'
import type { Agent, Disaster, Allocation, Proof, CycleMapState, AgentMessage } from './types'

const FALLBACK_AGENTS: Agent[] = [
  { ensName: 'pacific.responsesurface.eth', role: 'agent', bioregion: { bbox: { west: -124.8, south: 32.5, east: -114.5, north: 49.0 }, center: [-120.0, 41.0] }, dataSources: ['EONET', 'FIRMS', 'GBIF', 'AirNow'], axlPubkey: '', status: 'active', credibilityScore: 0 },
  { ensName: 'mountain.responsesurface.eth', role: 'agent', bioregion: { bbox: { west: -114.5, south: 37.0, east: -104.0, north: 49.0 }, center: [-109.0, 43.0] }, dataSources: ['EONET', 'FIRMS', 'GBIF'], axlPubkey: '', status: 'active', credibilityScore: 0 },
  { ensName: 'central.responsesurface.eth', role: 'agent', bioregion: { bbox: { west: -104.0, south: 37.0, east: -90.0, north: 49.0 }, center: [-97.0, 43.0] }, dataSources: ['EONET', 'FIRMS', 'GBIF'], axlPubkey: '', status: 'active', credibilityScore: 0 },
  { ensName: 'lakes.responsesurface.eth', role: 'agent', bioregion: { bbox: { west: -90.0, south: 37.0, east: -80.5, north: 49.0 }, center: [-85.5, 43.0] }, dataSources: ['EONET', 'USGS', 'GBIF', 'iNaturalist'], axlPubkey: '', status: 'active', credibilityScore: 0 },
  { ensName: 'delta.responsesurface.eth', role: 'agent', bioregion: { bbox: { west: -90.0, south: 25.0, east: -80.5, north: 37.0 }, center: [-86.0, 33.0] }, dataSources: ['EONET', 'USGS', 'GBIF', 'iNaturalist'], axlPubkey: '', status: 'active', credibilityScore: 0 },
  { ensName: 'gulf.responsesurface.eth', role: 'agent', bioregion: { bbox: { west: -114.5, south: 25.8, east: -90.0, north: 37.0 }, center: [-102.0, 33.0] }, dataSources: ['EONET', 'FIRMS', 'USGS'], axlPubkey: '', status: 'active', credibilityScore: 0 },
  { ensName: 'atlantic.responsesurface.eth', role: 'agent', bioregion: { bbox: { west: -80.5, south: 24.5, east: -67.0, north: 42.0 }, center: [-75.0, 34.0] }, dataSources: ['EONET', 'USGS', 'GBIF'], axlPubkey: '', status: 'active', credibilityScore: 0 },
  { ensName: 'northeast.responsesurface.eth', role: 'agent', bioregion: { bbox: { west: -80.5, south: 42.0, east: -67.0, north: 49.0 }, center: [-74.0, 45.0] }, dataSources: ['EONET', 'USGS', 'GBIF'], axlPubkey: '', status: 'active', credibilityScore: 0 },
  { ensName: 'coordinator.responsesurface.eth', role: 'coordinator', bioregion: { bbox: { west: -124.8, south: 24.4, east: -66.9, north: 49.4 }, center: [-95.7, 37.0] }, dataSources: ['all'], axlPubkey: '', status: 'active', credibilityScore: 1000 },
  { ensName: 'rogue.responsesurface.eth', role: 'adversary', bioregion: { bbox: { west: -180, south: -90, east: 180, north: 90 }, center: [-110, 40] }, dataSources: ['EONET'], axlPubkey: '', status: 'flagged', credibilityScore: 0 },
  { ensName: 'phantom.responsesurface.eth', role: 'adversary', bioregion: { bbox: { west: -100, south: 35, east: -85, north: 45 }, center: [-92.5, 40] }, dataSources: ['EONET'], axlPubkey: '', status: 'flagged', credibilityScore: 0 },
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
  coordinator: '#ffb302',
  rogue: '#ff3838',
  phantom: '#ff3838',
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
  const [sidebarTab, setSidebarTab] = useState<'dashboard' | 'activity' | 'comms'>('dashboard')
  const [cycleMapState, setCycleMapState] = useState<CycleMapState>({ phase: 'idle', allocationShares: {} })
  const [messages, setMessages] = useState<AgentMessage[]>([])

  const addMessage = useCallback((msg: AgentMessage) => {
    setMessages(prev => {
      if (msg.phase === 'COLLECT' && msg.content.includes('Initiating')) {
        setSidebarTab('comms')
        return [msg]
      }
      return [...prev, msg]
    })
  }, [])

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
              onClick={() => setSidebarTab('comms')}
              className={`flex-1 py-2.5 text-[11px] font-medium tracking-wider uppercase transition-colors cursor-pointer border-b-2 relative ${
                sidebarTab === 'comms'
                  ? 'text-[var(--color-interactive)] border-[var(--color-interactive)]'
                  : 'text-[var(--color-text-placeholder)] border-transparent hover:text-[var(--color-text-secondary)]'
              }`}
            >
              Comms
              {messages.length > 0 && sidebarTab !== 'comms' && (
                <span className="ml-1 text-[9px] tabular" style={{ color: 'var(--viz-3)' }}>
                  {messages.length}
                </span>
              )}
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
                        {/* Agent avatar with letter fallback */}
                        <div className="relative shrink-0 w-[28px] h-[28px]">
                          <div
                            className="w-full h-full rounded-full flex items-center justify-center text-[11px] font-bold uppercase"
                            style={{ background: `color-mix(in srgb, ${color} 25%, var(--color-surface))`, color, border: `1.5px solid ${color}` }}
                          >
                            {name[0]}
                          </div>
                          <img
                            src={`/images/agents/${name}.webp`}
                            alt=""
                            className="absolute inset-0 w-full h-full rounded-full object-cover border"
                            style={{ borderColor: color }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <div
                            className={`absolute -bottom-px -right-px w-[8px] h-[8px] rounded-full border border-[var(--color-surface)] ${isFlagged ? 'status-glow-critical' : 'status-glow-normal'}`}
                            style={{ background: isFlagged ? 'var(--status-critical)' : 'var(--status-normal)' }}
                          />
                        </div>

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
                    onMessage={addMessage}
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
            ) : sidebarTab === 'comms' ? (
              <div className="px-3 py-2">
                <AgentMessageLog messages={messages} />
              </div>
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
