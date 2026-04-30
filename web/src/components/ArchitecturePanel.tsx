interface ArchitecturePanelProps {
  onClose: () => void
}

const LAYERS = [
  {
    label: 'Detection',
    color: '#ef4444',
    tech: 'NASA EONET, FIRMS, USGS, GBIF, AirNow, iNaturalist',
    desc: 'Government APIs feed real-time disaster data to bioregional agents.',
    sponsor: null,
  },
  {
    label: 'Communication',
    color: '#8b5cf6',
    tech: 'Gensyn AXL',
    desc: 'Encrypted P2P mesh. Coordinator discovers agents (A2A), tasks them (MCP), receives assessments. Ed25519-authenticated.',
    sponsor: 'Gensyn AXL',
  },
  {
    label: 'Identity + Credibility',
    color: '#06b6d4',
    tech: 'ENS on Sepolia',
    desc: 'Each agent has an ENS subname. Credibility scores live in text records. Coordinator reads ENS before allocating — no identity, no funds.',
    sponsor: 'ENS',
  },
  {
    label: 'Ground Truth',
    color: '#22c55e',
    tech: 'Astral on Base Sepolia',
    desc: 'Responders upload geotagged photos. Astral verifies location containment in disaster zones. Stamps feed credibility.',
    sponsor: 'Astral',
  },
  {
    label: 'Sealed Decision',
    color: '#f59e0b',
    tech: '0G Compute (TEE)',
    desc: 'Coordinator bundles all assessments + AXL pubkeys into a trusted enclave. Nobody — not even the operator — can rig the allocation.',
    sponsor: '0G',
  },
  {
    label: 'Execution',
    color: '#f59e0b',
    tech: '0G Chain (fUSD)',
    desc: 'ResponseFund contract holds fUSD. Allocations transfer tokens to agents weighted by credibility. Every tx onchain.',
    sponsor: '0G',
  },
  {
    label: 'Audit',
    color: '#f59e0b',
    tech: '0G Storage',
    desc: 'Every assessment, allocation, and proof hashed and stored immutably. Permanent, verifiable record.',
    sponsor: '0G',
  },
]

const TRUST_CHAIN = [
  { icon: 'ID', label: 'ENS proves identity', color: '#06b6d4' },
  { icon: 'AXL', label: 'AXL proves sender', color: '#8b5cf6' },
  { icon: 'TEE', label: '0G proves decision', color: '#f59e0b' },
  { icon: 'TX', label: 'Chain proves execution', color: '#f59e0b' },
  { icon: 'LOG', label: 'Storage proves history', color: '#f59e0b' },
  { icon: 'GEO', label: 'Astral proves location', color: '#22c55e' },
]

export default function ArchitecturePanel({ onClose }: ArchitecturePanelProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[720px] max-h-[85vh] bg-[var(--bg-secondary)]/95 backdrop-blur-xl border border-[var(--border-medium)] rounded-2xl overflow-y-auto scrollbar-thin"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-[var(--accent-ember)] via-[var(--accent-amber)] to-[var(--accent-ember)]" />
        <div className="sticky top-0 bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">System Architecture</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Credibility-weighted disaster response coordination on verifiable infrastructure
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl cursor-pointer leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Trust Chain</h3>
            <div className="flex items-center gap-1">
              {TRUST_CHAIN.map((t, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium"
                    style={{ borderColor: `${t.color}30`, color: t.color, background: `${t.color}08` }}
                  >
                    <span className="font-[var(--font-mono)] text-[9px] opacity-70">{t.icon}</span>
                    <span>{t.label}</span>
                  </div>
                  {i < TRUST_CHAIN.length - 1 && <span className="text-gray-600 text-[10px]">&rarr;</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Pipeline Layers</h3>
            <div className="space-y-2">
              {LAYERS.map((layer, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl border bg-white/[0.02]"
                  style={{ borderColor: `${layer.color}20` }}
                >
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: layer.color }} />
                    {i < LAYERS.length - 1 && <div className="w-px h-6 bg-white/10" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: layer.color }}>{layer.label}</span>
                      <span className="text-[10px] text-gray-600 font-[var(--font-mono)]">{layer.tech}</span>
                      {layer.sponsor && (
                        <span
                          className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ color: layer.color, background: `${layer.color}20`, border: `1px solid ${layer.color}50` }}
                        >
                          {layer.sponsor}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{layer.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Adversarial Defense</h3>
            <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/[0.03]">
              <div className="text-[11px] text-gray-300 leading-relaxed">
                Credibility scores gate fund allocation. The proof multiplier penalizes unverified agents:
              </div>
              <div className="mt-2 font-[var(--font-mono)] text-xs text-red-400 bg-black/30 rounded-lg px-3 py-2">
                proofMultiplier = min(0.15 + proofCount * 0.28, 1.0)
              </div>
              <div className="mt-2 flex gap-4 text-[10px]">
                <div><span className="text-red-400">0 proofs</span> <span className="text-gray-500">= 15% multiplier = ~10% of fund</span></div>
                <div><span className="text-emerald-400">3+ proofs</span> <span className="text-gray-500">= 99% multiplier = ~90% of fund</span></div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Why Each Integration Is Load-Bearing</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: '0G', consequence: 'No verifiable allocation, no audit trail, no programmable disbursement' },
                { name: 'AXL', consequence: 'No agent discovery, no tasking, no authenticated communication' },
                { name: 'ENS', consequence: 'No identity, no credibility history, no allocation gating' },
                { name: 'Astral', consequence: 'No ground-truth verification, coordinator trusts self-reported locations' },
              ].map((s, i) => (
                <div key={i} className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02]">
                  <div className="text-[11px] font-medium text-white">{s.name}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{s.consequence}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
