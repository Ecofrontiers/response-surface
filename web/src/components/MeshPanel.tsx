import { useEffect, useState } from 'react'
import type { AgentMessage } from '../types'

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
  messages: AgentMessage[]
  onClose: () => void
}

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  coordinator: { x: 300, y: 60 },
  pacific: { x: 80, y: 140 },
  mountain: { x: 180, y: 140 },
  central: { x: 280, y: 140 },
  lakes: { x: 380, y: 140 },
  delta: { x: 480, y: 140 },
  gulf: { x: 130, y: 240 },
  atlantic: { x: 280, y: 240 },
  northeast: { x: 430, y: 240 },
  rogue: { x: 180, y: 330 },
  phantom: { x: 400, y: 330 },
}

const NODE_COLORS: Record<string, string> = {
  coordinator: '#f59e0b',
  pacific: '#f97316',
  mountain: '#ef4444',
  central: '#f59e0b',
  lakes: '#3b82f6',
  delta: '#06b6d4',
  gulf: '#8b5cf6',
  atlantic: '#10b981',
  northeast: '#6366f1',
  rogue: '#ef4444',
  phantom: '#ef4444',
}

export default function MeshPanel({ messages, onClose }: MeshPanelProps) {
  const [nodes, setNodes] = useState<MeshNode[]>([])
  const [discovered, setDiscovered] = useState<DiscoveredAgent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fallbackNodes: MeshNode[] = [
      { name: 'coordinator', port: 9022, online: false, peerId: 'ed25519:coord-5a1b', peerCount: 10, connectedTo: [] },
      { name: 'pacific', port: 9002, online: false, peerId: 'ed25519:pac-8f3a', peerCount: 2, connectedTo: [] },
      { name: 'mountain', port: 9004, online: false, peerId: 'ed25519:mtn-2c7d', peerCount: 2, connectedTo: [] },
      { name: 'central', port: 9006, online: false, peerId: 'ed25519:cnt-4e9f', peerCount: 2, connectedTo: [] },
      { name: 'lakes', port: 9008, online: false, peerId: 'ed25519:lak-1a2b', peerCount: 2, connectedTo: [] },
      { name: 'delta', port: 9010, online: false, peerId: 'ed25519:del-3c4d', peerCount: 2, connectedTo: [] },
      { name: 'gulf', port: 9012, online: false, peerId: 'ed25519:glf-5e6f', peerCount: 2, connectedTo: [] },
      { name: 'atlantic', port: 9014, online: false, peerId: 'ed25519:atl-7g8h', peerCount: 2, connectedTo: [] },
      { name: 'northeast', port: 9016, online: false, peerId: 'ed25519:ne-9i0j', peerCount: 2, connectedTo: [] },
      { name: 'rogue', port: 9082, online: false, peerId: 'ed25519:rog-k1l2', peerCount: 1, connectedTo: [] },
      { name: 'phantom', port: 9084, online: false, peerId: 'ed25519:phn-m3n4', peerCount: 1, connectedTo: [] },
    ]
    const fallbackDiscovery: DiscoveredAgent[] = [
      { peerId: 'ed25519:pac-8f3a', card: { name: 'pacific.responsesurface.eth', description: 'Pacific Coast — EONET, FIRMS, GBIF, AirNow', capabilities: ['assessment', 'proof-collection'], services: ['assessment'] }, status: 'offline' },
      { peerId: 'ed25519:mtn-2c7d', card: { name: 'mountain.responsesurface.eth', description: 'Rocky Mountains — EONET, FIRMS, GBIF', capabilities: ['assessment', 'proof-collection'], services: ['assessment'] }, status: 'offline' },
      { peerId: 'ed25519:lak-1a2b', card: { name: 'lakes.responsesurface.eth', description: 'Great Lakes — EONET, USGS, GBIF, iNaturalist', capabilities: ['assessment', 'proof-collection'], services: ['assessment'] }, status: 'offline' },
      { peerId: 'ed25519:del-3c4d', card: { name: 'delta.responsesurface.eth', description: 'Mississippi Delta — EONET, USGS, GBIF', capabilities: ['assessment', 'proof-collection'], services: ['assessment'] }, status: 'offline' },
      { peerId: 'ed25519:glf-5e6f', card: { name: 'gulf.responsesurface.eth', description: 'Gulf Coast — EONET, FIRMS, USGS', capabilities: ['assessment', 'proof-collection'], services: ['assessment'] }, status: 'offline' },
      { peerId: 'ed25519:rog-k1l2', card: { name: 'rogue.responsesurface.eth', description: 'Adversarial — inflated severity, 0 proofs', capabilities: ['assessment'], services: ['assessment'] }, status: 'offline' },
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
        className="w-[720px] max-h-[85vh] bg-[var(--color-surface)] backdrop-blur-xl border border-[var(--border-default)] rounded-[var(--radius)] overflow-y-auto scrollbar-thin"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-[var(--viz-3)] via-[var(--status-standby)] to-[var(--viz-3)]" />
        <div className="sticky top-0 bg-[var(--color-header)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">AXL Mesh Network</h2>
            <p className="text-[11px] text-[var(--color-text-placeholder)] mt-0.5">
              Ed25519-authenticated P2P agent communication via Gensyn AXL
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-placeholder)] hover:text-[var(--color-text)] text-xl cursor-pointer leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${onlineCount === nodes.length && onlineCount > 0 ? 'bg-emerald-400 animate-pulse' : onlineCount > 0 ? 'bg-amber-400' : 'bg-red-400'}`} />
              <span className="text-xs text-[var(--color-text-placeholder)]">
                {loading ? 'Connecting...' : `${onlineCount}/${nodes.length || 4} nodes online`}
              </span>
            </div>
            <div className="text-[10px] text-[var(--color-text-placeholder)] font-[var(--font-mono)]">
              Protocol: AXL / Ed25519
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">Mesh Topology</h3>
            <div className="relative bg-[var(--color-base)] rounded-[var(--radius)] border border-[var(--border-default)] overflow-hidden" style={{ height: 380 }}>
              <svg width="100%" height="100%" viewBox="0 0 560 380">
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

                {(nodes.length === 0 || nodes.every(n => n.connectedTo.length === 0)) && [
                  ['pacific', 'coordinator'], ['mountain', 'coordinator'], ['central', 'coordinator'],
                  ['lakes', 'coordinator'], ['delta', 'coordinator'], ['gulf', 'coordinator'],
                  ['atlantic', 'coordinator'], ['northeast', 'coordinator'],
                  ['rogue', 'coordinator'], ['phantom', 'coordinator'],
                  ['pacific', 'mountain'], ['central', 'lakes'], ['gulf', 'atlantic'],
                ].map(([a, b]) => {
                  const posA = NODE_POSITIONS[a]
                  const posB = NODE_POSITIONS[b]
                  if (!posA || !posB) return null
                  const isRogue = a === 'rogue' || b === 'rogue' || a === 'phantom' || b === 'phantom'
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

                {nodes.map(node => {
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

          <div className="p-3 rounded-[var(--radius)] border border-[var(--border-default)] bg-[var(--color-header)]">
            <p className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed">
              In disaster response, communication infrastructure is often the first thing to fail. AXL provides a decentralized P2P mesh where each agent node can relay assessments directly to peers without relying on a central server. If one relay path goes down, assessments route through other peers. Each message is cryptographically signed — the coordinator can verify exactly which agent sent each assessment.
            </p>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-2">A2A Discovery</h3>
            <p className="text-[10px] text-[var(--color-text-placeholder)] mb-3">
              Agents communicate via AXL's P2P mesh. Each node is identified by its Ed25519 public key.
            </p>
            <div className="space-y-2">
              {discovered.map((d, i) => {
                const matchedNode = nodes.find(n => n.peerId === d.peerId)
                const agentName = matchedNode?.name || d.card?.name || 'Unknown'
                const isConnected = matchedNode?.online ?? false
                const displayStatus = isConnected ? 'connected' : d.status === 'discovered' ? 'discovered' : d.status
                const color = matchedNode ? (NODE_COLORS[matchedNode.name] || '#6b7280') : '#6b7280'
                return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border-default)] bg-[var(--color-header)]">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${isConnected || d.status === 'discovered' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color }}>{agentName}</span>
                      <span className="text-[10px] text-[var(--color-text-placeholder)] font-[var(--font-mono)]">{d.peerId.slice(0, 20)}...</span>
                      <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded ${
                        isConnected || d.status === 'discovered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {displayStatus}
                      </span>
                    </div>
                    {d.card && (
                      <>
                        <p className="text-[10px] text-[var(--color-text-placeholder)] mt-1">{d.card.description}</p>
                        <div className="flex gap-1.5 mt-1.5">
                          {d.card.capabilities.map((cap, j) => (
                            <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              {cap}
                            </span>
                          ))}
                        </div>
                        {d.card.services.length > 0 && (
                          <div className="flex gap-1.5 mt-1">
                            <span className="text-[9px] text-[var(--color-text-placeholder)]">MCP services:</span>
                            {d.card.services.map((svc, j) => (
                              <span key={j} className="text-[9px] text-cyan-400 font-[var(--font-mono)]">{svc}</span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                )
              })}
              {discovered.length === 0 && !loading && (
                <div className="text-[10px] text-[var(--color-text-placeholder)] text-center py-4">
                  No peers discovered — AXL mesh offline
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">Coordinator Flow</h3>
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
                  {i < 5 && <span className="text-[var(--color-text-placeholder)] text-[10px]">&rarr;</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">
              AXL Message Log ({messages.length})
            </h3>
            {messages.length === 0 ? (
              <div className="text-[10px] text-[var(--color-text-placeholder)] text-center py-4 border border-dashed border-[var(--border-default)] rounded-[var(--radius)]">
                Run a cycle to see agent communications over AXL
              </div>
            ) : (
              <div className="space-y-px max-h-[200px] overflow-y-auto scrollbar-thin border border-[var(--border-default)] rounded-[var(--radius)] bg-[var(--color-base)]">
                {[...messages].reverse().slice(0, 30).map(msg => {
                  const sender = msg.sender.replace('.responsesurface.eth', '')
                  const senderColor = NODE_COLORS[sender] || '#6b7280'
                  return (
                    <div key={msg.id} className="flex items-start gap-2 px-2.5 py-1.5 hover:bg-[var(--color-hover)] transition-colors font-[var(--font-mono)] text-[10px]">
                      <div className="w-[5px] h-[5px] rounded-full mt-[5px] shrink-0" style={{ background: senderColor }} />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium" style={{ color: senderColor }}>{sender}</span>
                        {msg.receiver && (
                          <span className="text-[var(--color-text-placeholder)]"> → {msg.receiver.replace('.responsesurface.eth', '')}</span>
                        )}
                        <span className="text-[var(--color-text-secondary)] ml-1">{msg.content}</span>
                      </div>
                      <span className="text-[9px] text-[var(--color-text-placeholder)] shrink-0 tabular">{msg.phase}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
