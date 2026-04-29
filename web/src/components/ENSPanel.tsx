import type { Agent } from '../types'

interface ENSPanelProps {
  agents: Agent[]
  onClose: () => void
}

const TEXT_RECORD_SCHEMA = [
  { key: 'description', label: 'Description', color: '#06b6d4' },
  { key: 'bioregion.bounds', label: 'Bioregion Bounds', color: '#22c55e' },
  { key: 'data.sources', label: 'Data Sources', color: '#8b5cf6' },
  { key: 'axl.pubkey', label: 'AXL Public Key', color: '#8b5cf6' },
  { key: '0g.address', label: '0G Chain Address', color: '#f59e0b' },
  { key: 'role', label: 'Role', color: '#06b6d4' },
  { key: 'credibility.score', label: 'Credibility Score', color: '#22c55e' },
  { key: 'credibility.proofs', label: 'Total Proofs', color: '#22c55e' },
  { key: 'credibility.lastUpdate', label: 'Last Updated', color: '#6b7280' },
]

function getRoleColor(role: string): string {
  if (role === 'coordinator') return '#f59e0b'
  if (role === 'adversary') return '#ef4444'
  return '#06b6d4'
}

export default function ENSPanel({ agents, onClose }: ENSPanelProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[720px] max-h-[85vh] bg-[#0d1117]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#0d1117]/95 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">ENS Identity Registry</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Agent identities on Sepolia &mdash; credibility scores in text records
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl cursor-pointer leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Text Record Schema</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {TEXT_RECORD_SCHEMA.map((r, i) => (
                <div
                  key={i}
                  className="px-2.5 py-1.5 rounded-lg border text-[10px]"
                  style={{ borderColor: `${r.color}25`, background: `${r.color}06` }}
                >
                  <span className="font-[var(--font-mono)] text-gray-500">{r.key}</span>
                  <div className="text-gray-400 mt-0.5">{r.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">
              Registered Agents ({agents.length})
            </h3>
            <div className="space-y-3">
              {agents.map((agent, i) => {
                const roleColor = getRoleColor(agent.role)
                const isFlagged = agent.status === 'flagged'
                return (
                  <div
                    key={i}
                    className="rounded-xl border bg-white/[0.02] overflow-hidden"
                    style={{ borderColor: isFlagged ? '#ef444430' : `${roleColor}20` }}
                  >
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: roleColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{agent.ensName}</span>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded uppercase font-medium border"
                            style={{ color: roleColor, borderColor: `${roleColor}40`, background: `${roleColor}10` }}
                          >
                            {agent.role}
                          </span>
                          {isFlagged && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                              FLAGGED
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-600 mt-0.5">
                          Resolver: 0xE996...b5 (Sepolia)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-semibold font-[var(--font-mono)] ${
                          (agent.credibilityScore ?? 0) >= 700 ? 'text-emerald-400' :
                          (agent.credibilityScore ?? 0) >= 400 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {agent.credibilityScore ?? '—'}
                        </div>
                        <div className="text-[9px] text-gray-600">/1000</div>
                      </div>
                    </div>
                    <div className="px-4 pb-3 grid grid-cols-2 gap-1.5">
                      <TextRecordRow label="bioregion.bounds" value={`${agent.bioregion.bbox.west},${agent.bioregion.bbox.south},${agent.bioregion.bbox.east},${agent.bioregion.bbox.north}`} />
                      <TextRecordRow label="data.sources" value={agent.dataSources.join(',')} />
                      <TextRecordRow label="axl.pubkey" value={agent.axlPubkey || '(pending AXL connection)'} highlight={!!agent.axlPubkey} />
                      <TextRecordRow label="credibility.score" value={String(agent.credibilityScore ?? 0)} highlight />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Trust Chain via ENS</h3>
            <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03]">
              <div className="text-[11px] text-gray-300 leading-relaxed space-y-2">
                <div>
                  <span className="text-cyan-400 font-medium">Identity gate:</span> Coordinator reads <code className="text-[10px] bg-black/30 px-1 rounded">axl.pubkey</code> from ENS before accepting assessments. No ENS subname = no allocation.
                </div>
                <div>
                  <span className="text-cyan-400 font-medium">Cross-chain link:</span> <code className="text-[10px] bg-black/30 px-1 rounded">0g.address</code> text record maps Sepolia ENS identity to 0G Chain wallet for fund disbursement.
                </div>
                <div>
                  <span className="text-cyan-400 font-medium">Credibility history:</span> Scores accumulate across allocation cycles via <code className="text-[10px] bg-black/30 px-1 rounded">credibility.score</code> and <code className="text-[10px] bg-black/30 px-1 rounded">credibility.proofs</code>. History cannot be faked — it&apos;s on Sepolia.
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">ENSIP-25 Agent Registration</h3>
            <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/[0.03]">
              <div className="text-[11px] text-gray-300 leading-relaxed">
                Each agent registers via ERC-8004 Identity contract on Sepolia (<code className="text-[10px] bg-black/30 px-1 rounded">0x8004...BD9e</code>). The registration links the ENS subname to a structured agent card following ENSIP-25, enabling automated discovery by any A2A-compatible coordinator.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TextRecordRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/20">
      <span className="text-[9px] text-gray-600 font-[var(--font-mono)] shrink-0">{label}</span>
      <span className={`text-[9px] font-[var(--font-mono)] truncate ${highlight ? 'text-cyan-400' : 'text-gray-500'}`}>
        {value.length > 30 ? `${value.slice(0, 28)}...` : value}
      </span>
    </div>
  )
}
