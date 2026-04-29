import type { Agent, Proof } from '../types'

interface AgentPanelProps {
  ensName: string
  agent: Agent
  textRecords: Record<string, string>
  proofs: Proof[]
  onClose: () => void
}

const AGENT_COLORS: Record<string, string> = {
  fire: '#ff3838',
  water: '#2dccff',
  coordinator: '#ffb302',
  rogue: '#ff3838',
}

function credColor(score: number): string {
  if (score < 200) return 'var(--status-critical)'
  if (score < 500) return 'var(--status-serious)'
  if (score < 800) return 'var(--status-caution)'
  return 'var(--status-normal)'
}

export default function AgentPanel({ ensName, agent, textRecords, proofs, onClose }: AgentPanelProps) {
  if (!agent) return null

  const name = ensName.replace('.responsesurface.eth', '')
  const color = AGENT_COLORS[name] || 'var(--status-off)'
  const cred = agent.credibilityScore ?? 0

  return (
    <div
      className="absolute top-0 right-0 bottom-0 z-20 w-[360px] overflow-y-auto"
      style={{
        background: 'rgba(27, 45, 62, 0.95)',
        backdropFilter: 'blur(12px)',
        boxShadow: '-6px 0 24px rgba(0, 0, 0, 0.5)',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--color-text)]">{ensName}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] px-1.5 py-px rounded-[2px] uppercase tracking-wider font-medium"
                style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
                {agent.role}
              </span>
              {agent.status === 'flagged' && (
                <span className="text-[9px] px-1.5 py-px rounded-[2px] uppercase tracking-wider font-medium"
                  style={{ color: 'var(--status-critical)', background: 'rgba(255,56,56,0.15)' }}>
                  flagged
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-placeholder)] hover:text-[var(--color-text)] cursor-pointer text-lg leading-none p-1">&times;</button>
        </div>

        {agent.status === 'flagged' && (
          <div className="mb-4 px-3 py-2 rounded-[var(--radius)] text-[10px] leading-relaxed"
            style={{ background: 'rgba(255,56,56,0.08)', border: '1px solid rgba(255,56,56,0.2)', color: 'var(--status-critical)' }}>
            Credibility below threshold — allocations reduced by proof multiplier gate
          </div>
        )}

        <div className="space-y-4">
          <Section title="Credibility">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[32px] font-light font-[var(--font-mono)] tabular leading-none" style={{ color: credColor(cred) }}>
                {cred}
              </span>
              <span className="text-[11px] text-[var(--color-text-placeholder)]">/1000</span>
            </div>
            <div className="mt-2 h-[3px] bg-[var(--border-default)] rounded-[1px] overflow-hidden">
              <div className="h-full rounded-[1px] transition-all duration-700"
                style={{ width: `${(cred / 1000) * 100}%`, background: credColor(cred) }} />
            </div>
          </Section>

          <Section title="Data Sources">
            <div className="flex flex-wrap gap-1">
              {agent.dataSources.map(ds => (
                <span key={ds} className="px-2 py-0.5 rounded-[var(--radius)] text-[10px] font-medium text-[var(--color-text-secondary)] bg-[var(--color-header)] border border-[var(--border-default)]">
                  {ds}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Region">
            <code className="text-[10px] text-[var(--color-text-placeholder)] font-[var(--font-mono)] bg-[var(--color-header)] px-2 py-1 rounded-[var(--radius)] block border border-[var(--border-default)]">
              [{agent.bioregion.bbox.west.toFixed(1)}, {agent.bioregion.bbox.south.toFixed(1)}] &rarr; [{agent.bioregion.bbox.east.toFixed(1)}, {agent.bioregion.bbox.north.toFixed(1)}]
            </code>
          </Section>

          {agent.axlPubkey && (
            <Section title="AXL Key">
              <code className="text-[9px] font-[var(--font-mono)] bg-[var(--color-header)] px-2 py-1 rounded-[var(--radius)] block truncate border border-[var(--border-default)]"
                style={{ color: 'var(--viz-3)' }}>
                {agent.axlPubkey}
              </code>
            </Section>
          )}

          {Object.keys(textRecords).length > 0 && (
            <Section title="ENS Records">
              <div className="space-y-px">
                {Object.entries(textRecords).map(([key, value]) => (
                  <div key={key} className="flex text-[10px] py-1 px-2 rounded-[var(--radius)] bg-[var(--color-header)]">
                    <span className="text-[var(--color-text-placeholder)] w-28 shrink-0 truncate font-[var(--font-mono)]">{key}</span>
                    <span className="text-[var(--color-text-secondary)] truncate">{value}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title={`Proofs (${proofs.length})`}>
            {proofs.length === 0 ? (
              <div className="text-[10px] text-[var(--color-text-placeholder)] text-center py-3 bg-[var(--color-header)] rounded-[var(--radius)] border border-[var(--border-default)]">
                No proofs submitted
              </div>
            ) : (
              <div className="space-y-1">
                {proofs.slice(-5).reverse().map((p, i) => (
                  <div key={i} className="bg-[var(--color-header)] rounded-[var(--radius)] p-2 border border-[var(--border-default)]">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-[var(--font-mono)]" style={{ color: 'var(--status-standby)' }}>
                        {p.proofHash.slice(0, 16)}...
                      </span>
                      <span className="text-[var(--color-text-placeholder)]">
                        {new Date(p.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className="text-[var(--color-text-placeholder)]">{p.responderEns.replace('.responsesurface.eth', '')}</span>
                      <span className="font-[var(--font-mono)] tabular font-medium"
                        style={{ color: p.credibilityScore >= 500 ? 'var(--status-normal)' : 'var(--status-serious)' }}>
                        {p.credibilityScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-placeholder)' }}>{title}</div>
      {children}
    </div>
  )
}
