import { useEffect, useState, useCallback } from 'react'
import Header from './components/Header'
import Globe from './components/Globe'
import FundPanel from './components/FundPanel'
import CycleSimulator from './components/CycleSimulator'
import DocsPanel from './components/DocsPanel'
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
  pacific: 'EONET, FIRMS, GBIF, AirNow',
  mountain: 'EONET, FIRMS, GBIF',
  central: 'EONET, FIRMS, GBIF',
  lakes: 'EONET, USGS, GBIF, iNaturalist',
  delta: 'EONET, USGS, GBIF, iNaturalist',
  gulf: 'EONET, FIRMS, USGS',
  atlantic: 'EONET, USGS, GBIF',
  northeast: 'EONET, USGS, GBIF',
  coordinator: '0G TEE sealed inference',
  rogue: 'Adversarial — inflated severity, 0 proofs',
  phantom: 'Adversarial — fabricated Midwest data',
}

const REGION_LABELS: Record<string, string> = {
  pacific: 'Pacific Coast',
  mountain: 'Rocky Mountains',
  central: 'Central Plains',
  lakes: 'Great Lakes',
  delta: 'Mississippi Delta',
  gulf: 'Gulf Coast',
  atlantic: 'Atlantic Seaboard',
  northeast: 'Northeast',
  coordinator: 'Coordinator',
  rogue: 'Global',
  phantom: 'Midwest',
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

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}

const TYPE_CONFIG: Record<ActivityEvent['type'], { dot: string; text: string }> = {
  disaster: { dot: 'var(--status-critical)', text: 'var(--status-critical)' },
  assessment: { dot: 'var(--status-standby)', text: 'var(--color-text-secondary)' },
  proof: { dot: 'var(--status-normal)', text: 'var(--color-text-secondary)' },
  allocation: { dot: 'var(--status-serious)', text: 'var(--color-text-secondary)' },
  flag: { dot: 'var(--status-critical)', text: 'var(--status-critical)' },
  system: { dot: 'var(--status-off)', text: 'var(--color-text-placeholder)' },
}

export default function App() {
  const [agents, setAgents] = useState<Agent[]>(FALLBACK_AGENTS)
  const [disasters, setDisasters] = useState<Disaster[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [proofs, setProofs] = useState<Proof[]>([])
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [fundBalance, setFundBalance] = useState(0n)
  const [fundAllocated, setFundAllocated] = useState(0n)
  const [cycleNumber, setCycleNumber] = useState(1)
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [showDocs, setShowDocs] = useState(false)
  const [showProofs, setShowProofs] = useState(false)
  const [showENS, setShowENS] = useState(false)
  const [axlNodes, setAxlNodes] = useState(0)
  const [cycleMapState, setCycleMapState] = useState<CycleMapState>({ phase: 'idle', allocationShares: {} })
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [sidebarTab, setSidebarTab] = useState<'dashboard' | 'feed' | 'comms'>('dashboard')

  const addMessage = useCallback((msg: AgentMessage) => {
    setMessages(prev => {
      if (msg.phase === 'COLLECT' && msg.content.includes('Initiating')) {
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
        if (data.allocations?.length) setAllocations(data.allocations)
      })
      .catch(() => {})

    fetch('/api/axl/status')
      .then(r => r.json())
      .then(data => {
        const online = data.nodes?.filter((n: any) => n.online).length || 0
        setAxlNodes(online)
        if (online > 0) addActivity({ type: 'system', message: `AXL mesh — ${online} nodes online, P2P relay active` })
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
      })
      .catch(() => {})

    fetch('https://firms.modaps.eosdis.nasa.gov/api/area/csv/VIIRS_SNPP_NRT/-124,25,-67,49/1', { signal: AbortSignal.timeout(8000) })
      .then(r => r.ok ? r.text() : Promise.reject('not ok'))
      .then(csv => {
        const lines = csv.split('\n').slice(1).filter(l => l.trim())
        const hotspots: Disaster[] = lines.slice(0, 80).map((line, i) => {
          const cols = line.split(',')
          const lat = parseFloat(cols[0])
          const lng = parseFloat(cols[1])
          const confidence = cols[9] || 'nominal'
          return {
            id: `firms-${i}`,
            title: `Fire hotspot (${confidence})`,
            category: 'fire',
            geometry: { type: 'Point' as const, coordinates: [lng, lat] },
            severity: confidence === 'high' ? 7 : confidence === 'nominal' ? 4 : 2,
          }
        }).filter(h => !isNaN((h.geometry as any).coordinates[0]))
        setDisasters(prev => [...prev, ...hotspots])
        addActivity({ type: 'assessment', message: `NASA FIRMS connected — ${hotspots.length} active fire hotspots` })
      })
      .catch(() => {})

    fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', { signal: AbortSignal.timeout(8000) })
      .then(r => r.json())
      .then(data => {
        const quakes: Disaster[] = (data.features || [])
          .filter((f: any) => f.geometry?.coordinates)
          .slice(0, 50)
          .map((f: any) => ({
            id: `usgs-${f.id}`,
            title: f.properties.place || 'Earthquake',
            category: 'earthquake',
            geometry: { type: 'Point' as const, coordinates: [f.geometry.coordinates[0], f.geometry.coordinates[1]] },
            severity: Math.min(Math.round(f.properties.mag || 3), 10),
          }))
        setDisasters(prev => [...prev, ...quakes])
        addActivity({ type: 'assessment', message: `USGS connected — ${quakes.length} seismic events (M2.5+)` })
      })
      .catch(() => {})

    fetch('https://api.gbif.org/v1/occurrence/search?country=US&limit=1', { signal: AbortSignal.timeout(8000) })
      .then(r => r.json())
      .then(data => addActivity({ type: 'assessment', message: `GBIF connected — ${(data.count || 0).toLocaleString()} US biodiversity records` }))
      .catch(() => {})

    fetch('https://www.airnowapi.org/aq/observation/zipCode/current/?format=application/json&zipCode=90210&distance=25&API_KEY=DEMO_KEY', { signal: AbortSignal.timeout(8000) })
      .then(r => { if (r.ok) addActivity({ type: 'assessment', message: 'AirNow connected — real-time AQI monitoring active' }) })
      .catch(() => {})

    fetch('https://api.inaturalist.org/v1/observations?per_page=1&quality_grade=research&place_id=1', { signal: AbortSignal.timeout(8000) })
      .then(r => r.json())
      .then(data => addActivity({ type: 'assessment', message: `iNaturalist connected — ${(data.total_results || 0).toLocaleString()} research-grade observations` }))
      .catch(() => {})
  }, [addActivity])

  const visibleAgents = agents.filter(a => a.role !== 'coordinator')
  const formatEth = (wei: bigint) => (Math.max(0, Number(wei) / 1e18)).toFixed(0)

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[var(--color-base)]">
      <Header
        onDocsClick={() => setShowDocs(true)}
        onENSClick={() => setShowENS(true)}
        onProofsClick={() => setShowProofs(true)}
        agentCount={agents.length}
        proofCount={proofs.length}
        axlNodes={axlNodes}
      />

      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 relative">
          <Globe
            agents={agents}
            disasters={disasters}
            allocations={allocations}
            proofs={proofs}
            selectedAgent={expandedAgent}
            onAgentClick={(name) => setExpandedAgent(prev => prev === name ? null : name)}
            cycleMapState={cycleMapState}
          />
        </div>

        <aside
          className="w-[520px] flex flex-col overflow-hidden shrink-0 z-10"
          style={{
            background: 'rgba(27, 45, 62, 0.92)',
            backdropFilter: 'blur(12px)',
            boxShadow: '-6px 0 24px rgba(0, 0, 0, 0.5)',
            borderLeft: '1px solid var(--border-default)',
          }}
        >
          {/* Tab bar at top */}
          <div className="flex shrink-0 bg-[var(--color-header)] border-b border-[var(--border-default)]">
            {([
              { key: 'dashboard' as const, label: 'Dashboard' },
              { key: 'feed' as const, label: `Feed (${activities.length})` },
              { key: 'comms' as const, label: `Comms (${messages.length})` },
            ]).map(tab => (
              <button
                key={tab.key}
                className={`flex-1 px-3 py-2 text-[10px] uppercase tracking-wider font-medium transition-colors cursor-pointer border-b-2 ${
                  sidebarTab === tab.key
                    ? 'text-[var(--color-interactive)] border-[var(--color-interactive)]'
                    : 'text-[var(--color-text-placeholder)] hover:text-[var(--color-text-secondary)] border-transparent'
                }`}
                onClick={() => setSidebarTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content — full scroll area */}
          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
            {sidebarTab === 'dashboard' && (
              <>
                <SectionBand label="Agents" right={`${visibleAgents.filter(a => a.status === 'active').length} monitoring`} />

                <div className="px-2 py-1.5 space-y-px">
                  {visibleAgents.map(agent => {
                    const name = agent.ensName.replace('.responsesurface.eth', '')
                    const color = AGENT_COLORS[name] || 'var(--status-off)'
                    const cred = agent.credibilityScore ?? 0
                    const isFlagged = agent.status === 'flagged'
                    const isExpanded = expandedAgent === agent.ensName
                    return (
                      <div key={agent.ensName}>
                        <div
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 cursor-pointer transition-colors rounded-[var(--radius)] ${isExpanded ? 'bg-[var(--color-hover)]' : 'hover:bg-[var(--color-hover)]'}`}
                          style={{ borderLeft: `3px solid ${color}` }}
                          onClick={() => setExpandedAgent(isExpanded ? null : agent.ensName)}
                        >
                          <div className="relative shrink-0 w-[26px] h-[26px]">
                            <div
                              className="w-full h-full rounded-full flex items-center justify-center text-[10px] font-bold uppercase"
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
                              className={`absolute -bottom-px -right-px w-[7px] h-[7px] rounded-full border border-[var(--color-surface)] ${isFlagged ? 'status-glow-critical' : 'status-glow-normal'}`}
                              style={{ background: isFlagged ? 'var(--status-critical)' : 'var(--status-normal)' }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-medium text-[var(--color-text)]">{name}</span>
                              <span className="text-[8px] px-1 py-px rounded-[2px] uppercase tracking-wider font-medium"
                                style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
                                {agent.role}
                              </span>
                              {isFlagged && (
                                <span className="text-[8px] px-1 py-px rounded-[2px] uppercase tracking-wider font-medium" style={{ color: 'var(--status-critical)', background: 'rgba(255,56,56,0.15)' }}>
                                  flagged
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-[var(--color-text-placeholder)] mt-px truncate">
                              {REGION_LABELS[name]} — {AGENT_DESCRIPTIONS[name]}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[14px] font-medium font-[var(--font-mono)] tabular leading-none"
                              style={{ color: credColor(cred) }}>
                              {cred}
                            </div>
                            <div className="text-[7px] uppercase tracking-wider mt-0.5" style={{ color: credColor(cred), opacity: 0.7 }}>
                              {credLabel(cred)}
                            </div>
                          </div>

                          <div className="text-[10px] text-[var(--color-text-placeholder)] shrink-0">
                            {isExpanded ? '▾' : '▸'}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="ml-[18px] pl-3 border-l-2 mb-1 mt-0.5 space-y-2 py-2" style={{ borderColor: color }}>
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-[22px] font-light font-[var(--font-mono)] tabular leading-none" style={{ color: credColor(cred) }}>
                                  {cred}
                                </span>
                                <span className="text-[10px] text-[var(--color-text-placeholder)]">/1000</span>
                              </div>
                              <div className="mt-1.5 h-[3px] bg-[var(--border-default)] rounded-[1px] overflow-hidden">
                                <div className="h-full rounded-[1px] transition-all duration-700"
                                  style={{ width: `${(cred / 1000) * 100}%`, background: credColor(cred) }} />
                              </div>
                            </div>

                            {isFlagged && (
                              <div className="px-2 py-1.5 rounded-[var(--radius)] text-[9px] leading-relaxed"
                                style={{ background: 'rgba(255,56,56,0.08)', border: '1px solid rgba(255,56,56,0.2)', color: 'var(--status-critical)' }}>
                                Credibility below threshold — allocations reduced by proof multiplier
                              </div>
                            )}

                            <div>
                              <div className="text-[8px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-1">Data Sources</div>
                              <div className="flex flex-wrap gap-1">
                                {agent.dataSources.map(ds => (
                                  <span key={ds} className="px-1.5 py-px rounded-[var(--radius)] text-[9px] font-medium text-[var(--color-text-secondary)] bg-[var(--color-header)] border border-[var(--border-default)]">
                                    {ds}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div className="text-[8px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-1">Region</div>
                              <code className="text-[9px] text-[var(--color-text-placeholder)] font-[var(--font-mono)] bg-[var(--color-header)] px-1.5 py-0.5 rounded-[var(--radius)] block border border-[var(--border-default)]">
                                [{agent.bioregion.bbox.west.toFixed(1)}, {agent.bioregion.bbox.south.toFixed(1)}] → [{agent.bioregion.bbox.east.toFixed(1)}, {agent.bioregion.bbox.north.toFixed(1)}]
                              </code>
                            </div>

                            <a
                              href={`https://app.ens.domains/${agent.ensName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] font-[var(--font-mono)] hover:underline block"
                              style={{ color: 'var(--color-interactive)' }}
                            >
                              {agent.ensName} ↗
                            </a>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <SectionBand label="Response Fund" right={`Cycle ${cycleNumber}`} />

                <div className="px-4 py-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[22px] font-light text-[var(--color-text)] font-[var(--font-mono)] tabular leading-none">
                        {formatEth(fundBalance)}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-placeholder)] ml-1.5">fUSD</span>
                    </div>
                    <span className="text-[10px] text-[var(--color-text-placeholder)] font-[var(--font-mono)] tabular">
                      {formatEth(fundAllocated)} allocated
                    </span>
                  </div>

                  {allocations.length > 0 && (
                    <FundPanel
                      balance={fundBalance}
                      totalAllocated={fundAllocated}
                      allocations={allocations}
                      cycleNumber={cycleNumber}
                    />
                  )}

                  <div className="mt-3">
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
                  </div>

                  {disasters.length === 0 && (
                    <p className="text-[10px] text-[var(--color-text-placeholder)] mt-2">
                      Loading disaster data from NASA EONET...
                    </p>
                  )}
                </div>
              </>
            )}

            {sidebarTab === 'feed' && (
              <div className="px-2 py-1.5">
                <ActivityFeed activities={activities} />
              </div>
            )}

            {sidebarTab === 'comms' && (
              <div>
                <div className="px-3 py-2 bg-[var(--color-header)] border-b border-[var(--border-default)]">
                  <div className="flex items-center gap-2">
                    <div className={`w-[6px] h-[6px] rounded-full ${axlNodes > 0 ? 'bg-emerald-400 status-glow-normal' : 'bg-[var(--status-off)]'}`} />
                    <span className="text-[10px] text-[var(--color-text-placeholder)]">
                      {axlNodes > 0
                        ? `AXL Mesh — ${axlNodes} nodes, Ed25519 P2P`
                        : 'AXL Mesh — connecting...'}
                    </span>
                    <span className="ml-auto text-[9px] font-[var(--font-mono)] text-[var(--color-text-placeholder)]">
                      Gensyn AXL
                    </span>
                  </div>
                </div>
                <div className="px-2 py-1.5">
                  <CommsFeed messages={messages} />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Modal panels */}
      {showDocs && <DocsPanel onClose={() => setShowDocs(false)} />}
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

const MSG_COLORS: Record<string, string> = {
  pacific: '#f97316', mountain: '#ef4444', central: '#f59e0b', lakes: '#3b82f6',
  delta: '#06b6d4', gulf: '#8b5cf6', atlantic: '#10b981', northeast: '#6366f1',
  coordinator: '#ffb302', rogue: '#ff3838', phantom: '#ff3838',
}

function ActivityFeed({ activities }: { activities: ActivityEvent[] }) {
  if (activities.length === 0) {
    return <div className="text-[10px] text-[var(--color-text-placeholder)] text-center py-6">Run a cycle to see events</div>
  }

  return (
    <div className="space-y-px">
      {activities.map(event => {
        const cfg = TYPE_CONFIG[event.type]
        return (
          <div key={event.id} className="flex gap-2 px-2 py-1 rounded-[var(--radius)] hover:bg-[var(--color-hover)] transition-colors">
            <div className="w-[6px] h-[6px] rounded-full shrink-0 mt-[5px]" style={{ background: cfg.dot }} />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] leading-relaxed" style={{ color: cfg.text }}>
                {event.message}
              </span>
              {event.links && event.links.length > 0 && (
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                  {event.links.map((link, j) => (
                    <a key={j} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="text-[9px] font-[var(--font-mono)] hover:underline"
                      style={{ color: 'var(--color-interactive)' }}>
                      {link.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[9px] font-[var(--font-mono)] tabular shrink-0" style={{ color: 'var(--color-text-placeholder)' }}>
              {timeAgo(event.timestamp)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function CommsFeed({ messages }: { messages: AgentMessage[] }) {
  if (messages.length === 0) {
    return <div className="text-[10px] text-[var(--color-text-placeholder)] text-center py-6">Run a cycle to see agent communications</div>
  }

  return (
    <div className="space-y-px">
      {[...messages].reverse().map(msg => {
        const sender = msg.sender.replace('.responsesurface.eth', '')
        const senderColor = MSG_COLORS[sender] || 'var(--viz-2)'
        return (
          <div key={msg.id} className="flex items-start gap-2 px-2 py-1 rounded-[var(--radius)] hover:bg-[var(--color-hover)] transition-colors font-[var(--font-mono)]">
            <div className="w-[5px] h-[5px] rounded-full mt-1 shrink-0" style={{ background: senderColor }} />
            <div className="flex-1 min-w-0">
              <span className="text-[10px]">
                <span className="font-medium" style={{ color: senderColor }}>{sender}</span>
                {msg.receiver && (
                  <span style={{ color: 'var(--color-text-placeholder)' }}> → {msg.receiver.replace('.responsesurface.eth', '')}</span>
                )}
                <span className="text-[var(--color-text-secondary)] ml-1">{msg.content}</span>
              </span>
            </div>
            <span className="text-[9px] tabular shrink-0" style={{ color: 'var(--color-text-placeholder)' }}>
              {timeAgo(msg.timestamp)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
