import { useEffect, useState } from 'react'

interface MeshNode {
  name: string
  port: number
  online: boolean
  peerId: string
  peerCount: number
  connectedTo: string[]
}

interface DiscoveredAgent {
  peerId: string
  card: {
    name: string
    description: string
    capabilities: string[]
    services: string[]
  } | null
  status: string
}

interface MeshPanelProps {
  onClose: () => void
}

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  coordinator: { x: 200, y: 80 },
  fire: { x: 80, y: 220 },
  water: { x: 320, y: 220 },
  rogue: { x: 200, y: 300 },
}

const NODE_COLORS: Record<string, string> = {
  coordinator: '#f59e0b',
  fire: '#f97316',
  water: '#3b82f6',
  rogue: '#ef4444',
}

export default function MeshPanel({ onClose }: MeshPanelProps) {
  const [nodes, setNodes] = useState<MeshNode[]>([])
  const [discovered, setDiscovered] = useState<DiscoveredAgent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fallbackNodes: MeshNode[] = [
      { name: 'coordinator', port: 9022, online: false, peerId: '', peerCount: 0, connectedTo: [] },
      { name: 'pacific', port: 9002, online: false, peerId: '', peerCount: 0, connectedTo: [] },
      { name: 'mountain', port: 9012, online: false, peerId: '', peerCount: 0, connectedTo: [] },
      { name: 'lakes', port: 9032, online: false, peerId: '', peerCount: 0, connectedTo: [] },
      { name: 'rogue', port: 9082, online: false, peerId: '', peerCount: 0, connectedTo: [] },
    ]
    const fallbackDiscovery: DiscoveredAgent[] = [
      { peerId: '', card: { name: 'pacific.responsesurface.eth', description: 'Pacific Coast agent', capabilities: ['assessment', 'proof-collection'], services: ['assessment'] }, status: 'offline' },
      { peerId: '', card: { name: 'lakes.responsesurface.eth', description: 'Great Lakes agent', capabilities: ['assessment', 'proof-collection'], services: ['assessment'] }, status: 'offline' },
      { peerId: '', card: { name: 'rogue.responsesurface.eth', description: 'Adversarial agent — global', capabilities: ['assessment'], services: ['assessment'] }, status: 'offline' },
    ]

    Promise.all([
      fetch('/api/axl/topology').then(r => r.json()).catch(() => null),
      fetch('/api/axl/discovery').then(r => r.json()).catch(() => null),
    ]).then(([topo, disc]) => {
      setNodes(topo?.nodes?.length ? topo.nodes : fallbackNodes)
      setDiscovered(disc?.discoveredAgents?.length ? disc.discoveredAgents : fallbackDiscovery)
      setLoading(false)
    })
  }, [])

  const onlineCount = nodes.filter(n => n.online).length

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[720px] max-h-[85vh] bg-[var(--bg-secondary)]/95 backdrop-blur-xl border border-[var(--border-medium)] rounded-2xl overflow-y-auto scrollbar-thin"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-[var(--accent-mesh)] via-[var(--accent-ens)] to-[var(--accent-mesh)]" />
        <div className="sticky top-0 bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">AXL Mesh Network</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Ed25519-authenticated P2P agent communication via Gensyn AXL
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl cursor-pointer leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${onlineCount === nodes.length && onlineCount > 0 ? 'bg-emerald-400 animate-pulse' : onlineCount > 0 ? 'bg-amber-400' : 'bg-red-400'}`} />
              <span className="text-xs text-gray-400">
                {loading ? 'Connecting...' : `${onlineCount}/${nodes.length || 4} nodes online`}
              </span>
            </div>
            <div className="text-[10px] text-gray-600 font-[var(--font-mono)]">
              Protocol: AXL / Ed25519
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Mesh Topology</h3>
            <div className="relative bg-black/30 rounded-xl border border-white/5 overflow-hidden" style={{ height: 360 }}>
              <svg width="100%" height="100%" viewBox="0 0 400 360">
                {nodes.length > 0 && nodes.map(node => {
                  const pos = NODE_POSITIONS[node.name]
                  if (!pos) return null
                  return node.connectedTo.map((peerId, i) => {
                    const peerNode = nodes.find(n => n.peerId === peerId)
                    if (!peerNode) return null
                    const peerPos = NODE_POSITIONS[peerNode.name]
                    if (!peerPos) return null
                    return (
                      <line
                        key={`${node.name}-${i}`}
                        x1={pos.x} y1={pos.y}
                        x2={peerPos.x} y2={peerPos.y}
                        stroke="#8b5cf6"
                        strokeWidth="1"
                        strokeOpacity="0.3"
                        strokeDasharray="4 4"
                      />
                    )
                  })
                })}

                {nodes.length === 0 && [
                  ['fire', 'coordinator'], ['water', 'coordinator'], ['rogue', 'coordinator'],
                  ['fire', 'water'], ['fire', 'rogue'],
                ].map(([a, b]) => {
                  const posA = NODE_POSITIONS[a]
                  const posB = NODE_POSITIONS[b]
                  const isRogue = a === 'rogue' || b === 'rogue'
                  return (
                    <line
                      key={`sim-${a}-${b}`}
                      x1={posA.x} y1={posA.y}
                      x2={posB.x} y2={posB.y}
                      stroke={isRogue ? '#ef4444' : '#8b5cf6'}
                      strokeWidth="1"
                      strokeOpacity="0.3"
                      strokeDasharray="4 4"
                    >
                      <animate attributeName="stroke-dashoffset" from="0" to="-8" dur="1s" repeatCount="indefinite" />
                    </line>
                  )
                })}

                {(nodes.length > 0 ? nodes : [
                  { name: 'coordinator', online: true, peerId: 'ed25519:5a1b3c7d', peerCount: 3 },
                  { name: 'fire', online: true, peerId: 'ed25519:8f3a2b7c', peerCount: 3 },
                  { name: 'water', online: true, peerId: 'ed25519:2c7d4e9f', peerCount: 2 },
                  { name: 'rogue', online: true, peerId: 'ed25519:9e0f1a2b', peerCount: 2 },
                ] as MeshNode[]).map(node => {
                  const pos = NODE_POSITIONS[node.name]
                  if (!pos) return null
                  const color = NODE_COLORS[node.name] || '#6b7280'
                  const isCoord = node.name === 'coordinator'
                  return (
                    <g key={node.name}>
                      <circle cx={pos.x} cy={pos.y} r={isCoord ? 24 : 18} fill={`${color}15`} stroke={color} strokeWidth="1.5" strokeOpacity="0.5" />
                      {node.online && <circle cx={pos.x} cy={pos.y} r={isCoord ? 28 : 22} fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.3">
                        <animate attributeName="r" from={isCoord ? '24' : '18'} to={isCoord ? '36' : '28'} dur="2s" repeatCount="indefinite" />
                        <animate attributeName="stroke-opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />
                      </circle>}
                      <circle cx={pos.x} cy={pos.y} r={isCoord ? 6 : 4} fill={color} />
                      <text x={pos.x} y={pos.y + (isCoord ? 40 : 32)} textAnchor="middle" fill={color} fontSize="10" fontWeight="600">
                        {node.name}
                      </text>
                      <text x={pos.x} y={pos.y + (isCoord ? 52 : 44)} textAnchor="middle" fill="#6b7280" fontSize="8">
                        {node.online ? `${node.peerCount} peers` : 'offline'}
                      </text>
                      {node.peerId && (
                        <text x={pos.x} y={pos.y - (isCoord ? 30 : 24)} textAnchor="middle" fill="#4b5563" fontSize="7" fontFamily="monospace">
                          {node.peerId.slice(0, 16)}...
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">A2A Discovery</h3>
            <div className="space-y-2">
              {discovered.map((d, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${d.status === 'discovered' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">{d.card?.name || 'Unknown'}</span>
                      <span className="text-[10px] text-gray-600 font-[var(--font-mono)]">{d.peerId.slice(0, 20)}...</span>
                      <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded ${
                        d.status === 'discovered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {d.status}
                      </span>
                    </div>
                    {d.card && (
                      <>
                        <p className="text-[10px] text-gray-500 mt-1">{d.card.description}</p>
                        <div className="flex gap-1.5 mt-1.5">
                          {d.card.capabilities.map((cap, j) => (
                            <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              {cap}
                            </span>
                          ))}
                        </div>
                        {d.card.services.length > 0 && (
                          <div className="flex gap-1.5 mt-1">
                            <span className="text-[9px] text-gray-600">MCP services:</span>
                            {d.card.services.map((svc, j) => (
                              <span key={j} className="text-[9px] text-cyan-400 font-[var(--font-mono)]">{svc}</span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {discovered.length === 0 && !loading && (
                <div className="text-[10px] text-gray-600 text-center py-4">
                  No peers discovered — AXL mesh offline
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Coordinator Flow</h3>
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { step: '1', label: 'Discover peers', detail: 'AXL topology', color: '#8b5cf6' },
                { step: '2', label: 'Fetch agent cards', detail: 'A2A protocol', color: '#8b5cf6' },
                { step: '3', label: 'Task via MCP', detail: 'Request assessments', color: '#06b6d4' },
                { step: '4', label: 'Cross-validate', detail: 'Severity outliers', color: '#f59e0b' },
                { step: '5', label: 'Sealed inference', detail: '0G Compute TEE', color: '#f59e0b' },
                { step: '6', label: 'Allocate funds', detail: '0G Chain fUSD', color: '#22c55e' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px]"
                    style={{ borderColor: `${s.color}30`, color: s.color, background: `${s.color}08` }}
                  >
                    <span className="font-[var(--font-mono)] text-[9px] opacity-60">{s.step}</span>
                    <span className="font-medium">{s.label}</span>
                  </div>
                  {i < 5 && <span className="text-gray-600 text-[10px]">&rarr;</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
