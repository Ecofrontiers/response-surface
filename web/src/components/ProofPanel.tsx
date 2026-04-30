import type { Proof } from '../types'

interface ProofPanelProps {
  proofs: Proof[]
  onClose: () => void
}

const AGENT_COLORS: Record<string, string> = {
  pacific: '#f97316', mountain: '#ef4444', central: '#f59e0b', lakes: '#3b82f6',
  delta: '#06b6d4', gulf: '#8b5cf6', atlantic: '#10b981', northeast: '#6366f1',
}

const TYPE_COLORS: Record<string, string> = {
  Wildfire: '#ef4444',
  Fire: '#f97316',
  Flood: '#3b82f6',
  Storm: '#8b5cf6',
  'Storm damage': '#8b5cf6',
}

function proofMultiplier(density: number): number {
  return Math.min(0.15 + density * 0.28, 1.0)
}

export default function ProofPanel({ proofs, onClose }: ProofPanelProps) {
  const verifiedCount = proofs.filter(p => p.astralVerified).length
  const contributingAgents = new Set(proofs.map(p => p.agentEns)).size

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
              <div className="text-[40px] opacity-30">&#x1f4f7;</div>
              <div className="text-[13px] text-[var(--color-text-secondary)]">No proofs collected yet</div>
              <div className="text-[11px] text-[var(--color-text-placeholder)] max-w-md mx-auto leading-relaxed">
                Run a cycle to see ground truth evidence. Each regional agent collects disaster data from government APIs,
                then Astral verifies that the agent&apos;s location falls within the reported disaster zone.
                Verified proofs increase the credibility multiplier, which directly affects fund allocation.
              </div>
              <PipelineSteps />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Proofs Collected" value={proofs.length} color="var(--status-standby)" />
                <StatCard label="Astral Verified" value={`${verifiedCount}/${proofs.length}`} color="var(--status-normal)" />
                <StatCard label="Contributing Agents" value={contributingAgents} color="var(--color-interactive)" />
              </div>

              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">
                  Evidence Gallery ({proofs.length})
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[...proofs].reverse().map((proof, i) => {
                    const agentName = proof.agentEns.replace('.responsesurface.eth', '')
                    const agentColor = AGENT_COLORS[agentName] || '#6b7280'
                    const typeColor = TYPE_COLORS[proof.evidenceType || ''] || '#6b7280'
                    const mult = proofMultiplier(proof.proofDensity || 0)
                    return (
                      <div key={i} className="rounded-[var(--radius)] border border-[var(--border-default)] bg-[var(--color-header)] overflow-hidden">
                        {proof.evidenceImage && (
                          <div className="relative h-28">
                            <img
                              src={`/images/evidence/${proof.evidenceImage}`}
                              alt={proof.evidenceType || 'Evidence'}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute top-2 left-2 flex items-center gap-1.5">
                              <span
                                className="text-[8px] px-1.5 py-0.5 rounded-[2px] font-semibold uppercase"
                                style={{ background: `${typeColor}cc`, color: '#fff' }}
                              >
                                {proof.evidenceType}
                              </span>
                              {proof.astralVerified && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded-[2px] font-semibold bg-emerald-600/90 text-white">
                                  ASTRAL &#x2713;
                                </span>
                              )}
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
                            <span className="text-[9px] text-[var(--color-text-placeholder)]">Proof density</span>
                            <span className="text-[9px] font-[var(--font-mono)] text-[var(--color-text-secondary)]">{proof.proofDensity || 0} verified</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-[var(--color-text-placeholder)]">Credibility multiplier</span>
                            <span className="text-[9px] font-[var(--font-mono)] font-medium" style={{ color: mult >= 0.7 ? 'var(--status-normal)' : mult >= 0.4 ? 'var(--status-caution)' : 'var(--status-critical)' }}>
                              {(mult * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-[3px] bg-[var(--border-default)] rounded-[1px] overflow-hidden">
                            <div
                              className="h-full rounded-[1px] transition-all"
                              style={{
                                width: `${mult * 100}%`,
                                background: mult >= 0.7 ? 'var(--status-normal)' : mult >= 0.4 ? 'var(--status-caution)' : 'var(--status-critical)',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">How Proofs Affect Rewards</h3>
            <div className="p-3 rounded-[var(--radius)] border border-emerald-500/20 bg-emerald-500/[0.03] space-y-3">
              <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                Each agent&apos;s fund allocation is weighted by a proof multiplier derived from Astral-verified evidence:
              </div>
              <div className="font-[var(--font-mono)] text-xs text-emerald-400 bg-[var(--color-base)] rounded-[var(--radius)] px-3 py-2">
                proofMultiplier = min(0.15 + verifiedProofs &times; 0.28, 1.0)
              </div>
              <div className="flex gap-4 text-[10px]">
                <div><span className="text-red-400 font-[var(--font-mono)]">0 proofs</span> <span className="text-[var(--color-text-placeholder)]">= 15% allocation</span></div>
                <div><span className="text-amber-400 font-[var(--font-mono)]">1 proof</span> <span className="text-[var(--color-text-placeholder)]">= 43% allocation</span></div>
                <div><span className="text-emerald-400 font-[var(--font-mono)]">3+ proofs</span> <span className="text-[var(--color-text-placeholder)]">= 99% allocation</span></div>
              </div>
              <div className="text-[10px] text-[var(--color-text-placeholder)] leading-relaxed">
                Adversarial agents (rogue, phantom) submit 0 verified proofs, so their multiplier stays at 15% &mdash;
                even if they inflate severity scores, the credibility gate limits their fund share.
              </div>
            </div>
          </div>

          <PipelineSteps />
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
  const steps = [
    { icon: '&#x1f4f7;', label: 'Field Photo', detail: 'Geotagged evidence', color: '#06b6d4' },
    { icon: '&#x1f4cd;', label: 'EXIF GPS', detail: 'Extract coordinates', color: '#3b82f6' },
    { icon: '&#x1f310;', label: 'Astral', detail: 'Location attestation', color: '#22c55e' },
    { icon: '&#x2713;', label: 'Containment', detail: 'Inside disaster zone?', color: '#22c55e' },
    { icon: '&#x2b50;', label: 'Credibility', detail: 'Update ENS score', color: '#f59e0b' },
    { icon: '&#x1f4b0;', label: 'Rewards', detail: 'Weight allocation', color: '#10b981' },
  ]
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">Proof Pipeline</h3>
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius)] border text-[10px]"
              style={{ borderColor: `${s.color}30`, color: s.color, background: `${s.color}08` }}
            >
              <span dangerouslySetInnerHTML={{ __html: s.icon }} className="text-[11px]" />
              <span className="font-medium">{s.label}</span>
            </div>
            {i < steps.length - 1 && <span className="text-[var(--color-text-placeholder)] text-[10px]">&rarr;</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
