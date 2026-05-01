import type { Proof } from '../types'

interface ProofPanelProps {
  proofs: Proof[]
  onClose: () => void
}

const AGENT_COLORS: Record<string, string> = {
  pacific: '#f97316', mountain: '#ef4444', central: '#f59e0b', lakes: '#3b82f6',
  delta: '#06b6d4', gulf: '#8b5cf6', atlantic: '#10b981', northeast: '#6366f1',
  rogue: '#ef4444', phantom: '#ef4444',
}

const TYPE_COLORS: Record<string, string> = {
  Wildfire: '#ef4444', Fire: '#f97316', Flood: '#3b82f6',
  Storm: '#8b5cf6', 'Storm damage': '#8b5cf6',
  'Fabricated wildfire': '#ef4444', 'Fabricated flood': '#3b82f6',
}

function proofMultiplier(density: number): number {
  if (density === 0) return 0
  return Math.min(0.15 + density * 0.28, 1.0)
}

export default function ProofPanel({ proofs, onClose }: ProofPanelProps) {
  const verified = proofs.filter(p => p.astralVerified)
  const rejected = proofs.filter(p => !p.astralVerified)
  const contributingAgents = new Set(verified.map(p => p.agentEns)).size

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[740px] max-h-[85vh] bg-[var(--color-surface)] backdrop-blur-xl border border-[var(--border-default)] rounded-[var(--radius)] overflow-y-auto scrollbar-thin"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500" />
        <div className="sticky top-0 bg-[var(--color-header)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Ground Truth Proofs</h2>
            <p className="text-[11px] text-[var(--color-text-placeholder)] mt-0.5">
              Field evidence &rarr; Astral verification &rarr; credibility multiplier &rarr; reward weight
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-placeholder)] hover:text-[var(--color-text)] text-xl cursor-pointer leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {proofs.length === 0 ? (
            <div className="py-10 text-center space-y-4">
              <div className="text-[13px] text-[var(--color-text-secondary)]">No proofs collected yet</div>
              <div className="text-[11px] text-[var(--color-text-placeholder)] max-w-md mx-auto leading-relaxed">
                Run a cycle to see ground truth evidence. Regional agents collect disaster data from government APIs,
                then Astral verifies that the agent&apos;s location falls within the reported disaster zone.
                Adversarial agents attempt to submit fake evidence &mdash; Astral catches the mismatch.
              </div>
              <PipelineSteps />
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <StatCard label="Submitted" value={proofs.length} color="var(--color-text-secondary)" />
                <StatCard label="Verified" value={verified.length} color="var(--status-normal)" />
                <StatCard label="Rejected" value={rejected.length} color="var(--status-critical)" />
                <StatCard label="Agents" value={contributingAgents} color="var(--color-interactive)" />
              </div>

              {/* Adversarial defense summary — only if rejections exist */}
              {rejected.length > 0 && (
                <div className="p-4 rounded-[var(--radius)] border border-red-500/30 bg-red-500/[0.04]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 status-glow-critical" />
                    <h3 className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">Adversarial Attempts Detected</h3>
                  </div>
                  <div className="space-y-2">
                    {rejected.map((proof, i) => {
                      const name = proof.agentEns.replace('.responsesurface.eth', '')
                      const mult = proofMultiplier(0)
                      const legitimateMult = proofMultiplier(3)
                      return (
                        <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-[var(--radius)] bg-[var(--color-base)] border border-red-500/15">
                          <div className="shrink-0 mt-0.5">
                            <img
                              src={`/images/agents/${name}.webp`}
                              alt=""
                              className="w-6 h-6 rounded-full border border-red-500/40 object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-red-400">{name}</span>
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/25 uppercase font-semibold">rejected</span>
                            </div>
                            <div className="text-[10px] text-[var(--color-text-placeholder)] mt-0.5">
                              Submitted from <span className="text-red-400/80">{proof.containment?.zone}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-[9px]">
                              <span className="text-[var(--color-text-placeholder)]">Claimed severity: <span className="text-red-400 font-[var(--font-mono)]">{proof.credibilityScore < 200 ? '9.8' : '8.5'}/10</span></span>
                              <span className="text-[var(--color-text-placeholder)]">Multiplier: <span className="text-red-400 font-[var(--font-mono)]">{(mult * 100).toFixed(0)}%</span></span>
                              <span className="text-[var(--color-text-placeholder)]">vs verified agent: <span className="text-emerald-400 font-[var(--font-mono)]">{(legitimateMult * 100).toFixed(0)}%</span></span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[14px] font-[var(--font-mono)] font-semibold text-red-400">&minus;{((1 - mult / legitimateMult) * 100).toFixed(0)}%</div>
                            <div className="text-[8px] text-[var(--color-text-placeholder)]">allocation</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 px-3 py-2 rounded-[var(--radius)] bg-[var(--color-header)] border border-[var(--border-default)]">
                    <div className="text-[10px] text-[var(--color-text-placeholder)] leading-relaxed">
                      <span className="text-red-400 font-medium">Defense mechanism:</span> Astral verified that submitted coordinates fall outside any active disaster zone.
                      Without verified proofs, agents are <span className="text-red-400 font-medium">EXCLUDED</span> from allocation entirely &mdash; even inflated severity scores cannot bypass the gate.
                      These agents received <span className="text-red-400 font-[var(--font-mono)]">0%</span> of funds vs <span className="text-emerald-400 font-[var(--font-mono)]">~14%</span> for verified agents.
                    </div>
                  </div>
                </div>
              )}

              {/* Verified proofs gallery */}
              {verified.length > 0 && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">
                    Verified Evidence ({verified.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[...verified].reverse().map((proof, i) => (
                      <ProofCard key={`v-${i}`} proof={proof} />
                    ))}
                  </div>
                </div>
              )}

              {/* Rejected proofs — show what the adversarial agents tried */}
              {rejected.length > 0 && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-red-400/60 mb-3">
                    Rejected Evidence ({rejected.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[...rejected].reverse().map((proof, i) => (
                      <ProofCard key={`r-${i}`} proof={proof} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Formula */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">How Proofs Affect Rewards</h3>
            <div className="p-3 rounded-[var(--radius)] border border-emerald-500/20 bg-emerald-500/[0.03] space-y-3">
              <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                Each agent&apos;s fund allocation is weighted by a proof multiplier derived from Astral-verified evidence:
              </div>
              <div className="font-[var(--font-mono)] text-xs text-emerald-400 bg-[var(--color-base)] rounded-[var(--radius)] px-3 py-2">
                proofMultiplier = proofs == 0 ? 0 : min(0.15 + verifiedProofs &times; 0.28, 1.0)
              </div>
              <div className="flex gap-4 text-[10px]">
                <div><span className="text-red-400 font-[var(--font-mono)]">0 proofs</span> <span className="text-[var(--color-text-placeholder)]">= EXCLUDED (0%)</span></div>
                <div><span className="text-amber-400 font-[var(--font-mono)]">1 proof</span> <span className="text-[var(--color-text-placeholder)]">= 43% allocation</span></div>
                <div><span className="text-emerald-400 font-[var(--font-mono)]">3+ proofs</span> <span className="text-[var(--color-text-placeholder)]">= 99% allocation</span></div>
              </div>
            </div>
          </div>

          <PipelineSteps />
        </div>
      </div>
    </div>
  )
}

function ProofCard({ proof }: { proof: Proof }) {
  const agentName = proof.agentEns.replace('.responsesurface.eth', '')
  const agentColor = AGENT_COLORS[agentName] || '#6b7280'
  const typeColor = TYPE_COLORS[proof.evidenceType || ''] || '#6b7280'
  const isRejected = !proof.astralVerified
  const mult = proofMultiplier(proof.proofDensity || 0)

  return (
    <div
      className="rounded-[var(--radius)] border overflow-hidden"
      style={{
        borderColor: isRejected ? 'rgba(239,68,68,0.3)' : 'var(--border-default)',
        background: isRejected ? 'rgba(239,68,68,0.03)' : 'var(--color-header)',
      }}
    >
      {proof.evidenceImage && (
        <div className="relative h-28">
          <img
            src={`/images/evidence/${proof.evidenceImage}`}
            alt={proof.evidenceType || 'Evidence'}
            className="w-full h-full object-cover"
            style={isRejected ? { filter: 'grayscale(0.5) brightness(0.7)' } : undefined}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {isRejected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[20px] font-bold text-red-500/70 uppercase tracking-widest rotate-[-15deg] border-2 border-red-500/40 px-4 py-1 rounded bg-black/40">
                rejected
              </span>
            </div>
          )}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <span
              className="text-[8px] px-1.5 py-0.5 rounded-[2px] font-semibold uppercase"
              style={{ background: isRejected ? 'rgba(239,68,68,0.8)' : `${typeColor}cc`, color: '#fff' }}
            >
              {proof.evidenceType}
            </span>
            <span
              className="text-[8px] px-1.5 py-0.5 rounded-[2px] font-semibold text-white"
              style={{ background: isRejected ? 'rgba(239,68,68,0.7)' : 'rgba(16,185,129,0.8)' }}
            >
              {isRejected ? 'ASTRAL ✗' : 'ASTRAL ✓'}
            </span>
          </div>
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full border" style={{ borderColor: agentColor, background: `${agentColor}40` }}>
              <img
                src={`/images/agents/${agentName}.webp`}
                alt=""
                className="w-full h-full rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
            <span className="text-[10px] font-medium text-white">{agentName}</span>
          </div>
          <div className="absolute bottom-2 right-2 text-[8px] text-white/60 font-[var(--font-mono)] tabular">
            [{(proof.location.coordinates as number[])[0].toFixed(2)}, {(proof.location.coordinates as number[])[1].toFixed(2)}]
          </div>
        </div>
      )}
      <div className="px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[var(--color-text-placeholder)]">
            {proof.containment?.zone || 'Unknown zone'}
          </span>
          <span className="text-[9px] font-[var(--font-mono)]" style={{ color: proof.containment?.contained ? 'var(--status-normal)' : 'var(--status-critical)' }}>
            {proof.containment?.contained ? 'Inside zone' : 'Outside zone'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[var(--color-text-placeholder)]">Credibility multiplier</span>
          <span className="text-[9px] font-[var(--font-mono)] font-medium" style={{ color: isRejected ? 'var(--status-critical)' : mult >= 0.7 ? 'var(--status-normal)' : 'var(--status-caution)' }}>
            {(mult * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-[3px] bg-[var(--border-default)] rounded-[1px] overflow-hidden">
          <div
            className="h-full rounded-[1px] transition-all"
            style={{
              width: `${mult * 100}%`,
              background: isRejected ? 'var(--status-critical)' : mult >= 0.7 ? 'var(--status-normal)' : 'var(--status-caution)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="p-3 rounded-[var(--radius)] border border-[var(--border-default)] bg-[var(--color-header)]">
      <div className="text-[18px] font-light font-[var(--font-mono)] tabular" style={{ color }}>{value}</div>
      <div className="text-[9px] text-[var(--color-text-placeholder)] mt-0.5 uppercase tracking-wider">{label}</div>
    </div>
  )
}

function PipelineSteps() {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">Proof Pipeline</h3>
      <div className="flex items-center gap-1 flex-wrap">
        {[
          { label: 'Field Photo', detail: 'EXIF GPS', color: '#06b6d4' },
          { label: 'SHA-256', detail: 'Content hash', color: '#3b82f6' },
          { label: 'Astral', detail: 'Location attest', color: '#22c55e' },
          { label: 'Containment', detail: 'Inside zone?', color: '#22c55e' },
          { label: 'Credibility', detail: 'ENS update', color: '#f59e0b' },
          { label: 'Rewards', detail: 'Weight alloc', color: '#10b981' },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className="px-2 py-1.5 rounded-[var(--radius)] border text-[10px] font-medium"
              style={{ borderColor: `${s.color}30`, color: s.color, background: `${s.color}08` }}
            >
              {s.label}
            </div>
            {i < 5 && <span className="text-[var(--color-text-placeholder)] text-[10px]">&rarr;</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
