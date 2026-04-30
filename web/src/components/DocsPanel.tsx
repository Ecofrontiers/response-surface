interface DocsPanelProps {
  onClose: () => void
}

const LAYERS = [
  {
    label: 'Detection',
    color: '#ef4444',
    tech: 'NASA EONET, FIRMS, USGS, GBIF, AirNow, iNaturalist',
    desc: '6 government APIs feed real-time disaster, air quality, water flow, and biodiversity data to regional agents.',
    sponsor: null,
  },
  {
    label: 'Communication',
    color: '#8b5cf6',
    tech: 'Gensyn AXL',
    desc: 'Ed25519-authenticated P2P mesh. 10 AXL nodes relay assessments between agents and coordinator.',
    sponsor: 'Gensyn AXL',
  },
  {
    label: 'Identity + Credibility',
    color: '#06b6d4',
    tech: 'ENS on Sepolia',
    desc: 'Each agent has an ENS subname with text records storing role, region bounds, data sources, and credibility scores. No ENS subname = no allocation.',
    sponsor: 'ENS',
  },
  {
    label: 'Ground Truth',
    color: '#22c55e',
    tech: 'Astral on Base Sepolia',
    desc: 'Responders upload geotagged photos. Astral verifies location containment within disaster zones. Verified stamps feed credibility scores.',
    sponsor: 'Astral',
  },
  {
    label: 'Sealed Decision',
    color: '#f59e0b',
    tech: '0G Compute (TEE)',
    desc: 'Assessments + credibility scores enter a trusted execution environment. The allocation plan is computed inside the enclave where nobody can tamper with it.',
    sponsor: '0G',
  },
  {
    label: 'Execution',
    color: '#f59e0b',
    tech: '0G Chain (fUSD)',
    desc: 'ResponseFund contract holds fUSD tokens. Each cycle allocates 3% of the pool, weighted by credibility. Every transfer is onchain.',
    sponsor: '0G',
  },
  {
    label: 'Audit',
    color: '#f59e0b',
    tech: '0G Storage',
    desc: 'Every assessment, allocation, and proof is hashed and stored permanently. Immutable audit log with merkle proofs.',
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

export default function DocsPanel({ onClose }: DocsPanelProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[780px] max-h-[90vh] bg-[var(--color-surface)] backdrop-blur-xl border border-[var(--border-default)] rounded-[var(--radius)] overflow-y-auto scrollbar-thin"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-[var(--color-interactive)] via-[var(--status-caution)] to-[var(--color-interactive)]" />
        <div className="sticky top-0 bg-[var(--color-header)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Response Surface</h2>
            <p className="text-[11px] text-[var(--color-text-placeholder)] mt-0.5">
              Credibility-weighted disaster response coordination on verifiable infrastructure
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-placeholder)] hover:text-[var(--color-text)] text-xl cursor-pointer leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* What this is */}
          <div className="p-4 rounded-[var(--radius)] border border-[var(--color-interactive-muted)] bg-[var(--color-interactive)]/.04">
            <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed space-y-2">
              <p>
                11 AI agents monitor US bioregions using government APIs (NASA, USGS, EPA, GBIF, iNaturalist).
                Each agent has a verifiable identity on ENS and communicates through an encrypted P2P mesh (Gensyn AXL).
              </p>
              <p>
                A coordinator agent collects assessments, verifies identities via ENS, checks location proofs via Astral,
                runs sealed inference in a 0G TEE, then allocates response funds onchain. 2 adversarial agents (rogue, phantom)
                test the credibility gate by submitting inflated data with zero verified proofs.
              </p>
              <p>
                Every step is verifiable. Remove any single integration and the system breaks in a specific, demonstrable way.
              </p>
            </div>
          </div>

          {/* Trust chain */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">Trust Chain</h3>
            <div className="flex items-center gap-1 flex-wrap">
              {TRUST_CHAIN.map((t, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius)] border text-[10px] font-medium"
                    style={{ borderColor: `${t.color}30`, color: t.color, background: `${t.color}08` }}
                  >
                    <span className="font-[var(--font-mono)] text-[9px] opacity-70">{t.icon}</span>
                    <span>{t.label}</span>
                  </div>
                  {i < TRUST_CHAIN.length - 1 && <span className="text-[var(--color-text-placeholder)] text-[10px]">&rarr;</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">Pipeline Layers</h3>
            <div className="space-y-2">
              {LAYERS.map((layer, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-[var(--radius)] border bg-[var(--color-header)]"
                  style={{ borderColor: `${layer.color}20` }}
                >
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: layer.color }} />
                    {i < LAYERS.length - 1 && <div className="w-px h-6 bg-[var(--border-default)]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: layer.color }}>{layer.label}</span>
                      <span className="text-[10px] text-[var(--color-text-placeholder)] font-[var(--font-mono)]">{layer.tech}</span>
                      {layer.sponsor && (
                        <span
                          className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ color: layer.color, background: `${layer.color}20`, border: `1px solid ${layer.color}50` }}
                        >
                          {layer.sponsor}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-placeholder)] mt-1 leading-relaxed">{layer.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Adversarial */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">Adversarial Defense</h3>
            <div className="p-3 rounded-[var(--radius)] border border-red-500/20 bg-red-500/[0.03]">
              <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                Credibility scores gate fund allocation. The proof multiplier penalizes unverified agents:
              </div>
              <div className="mt-2 font-[var(--font-mono)] text-xs text-red-400 bg-[var(--color-base)] rounded-[var(--radius)] px-3 py-2">
                proofMultiplier = min(0.15 + proofCount * 0.28, 1.0)
              </div>
              <div className="mt-2 flex gap-4 text-[10px]">
                <div><span className="text-red-400">0 proofs</span> <span className="text-[var(--color-text-placeholder)]">= 15% multiplier</span></div>
                <div><span className="text-emerald-400">3+ proofs</span> <span className="text-[var(--color-text-placeholder)]">= 99% multiplier</span></div>
              </div>
            </div>
          </div>

          {/* Why each is needed */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">Remove Any One, The System Breaks</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: '0G', consequence: 'No verifiable allocation, no audit trail, no programmable fund disbursement' },
                { name: 'AXL', consequence: 'No agent discovery, no authenticated communication, no multi-node coordination' },
                { name: 'ENS', consequence: 'No identity, no credibility history, no allocation gating' },
                { name: 'Astral', consequence: 'No ground-truth verification, coordinator would trust self-reported locations' },
              ].map((s, i) => (
                <div key={i} className="p-2.5 rounded-[var(--radius)] border border-[var(--border-default)] bg-[var(--color-header)]">
                  <div className="text-[11px] font-medium text-[var(--color-text)]">{s.name}</div>
                  <div className="text-[10px] text-[var(--color-text-placeholder)] mt-0.5">{s.consequence}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Contracts */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">Deployed Contracts</h3>
            <div className="space-y-1.5">
              {[
                { label: 'ResponseFund', chain: '0G Testnet', addr: '0x7e0D9cf6045dd4ba622cd410a9F137a7A6d935a0', url: 'https://chainscan-galileo.0g.ai/address/0x7e0D9cf6045dd4ba622cd410a9F137a7A6d935a0' },
                { label: 'FakeUSD (fUSD)', chain: '0G Testnet', addr: '0x6Cf1ed8721aB2B408d2a25797d6F71c9a17923A8', url: 'https://chainscan-galileo.0g.ai/address/0x6Cf1ed8721aB2B408d2a25797d6F71c9a17923A8' },
                { label: 'ERC-8004 Identity', chain: 'Sepolia', addr: '0x8004A818BFB912233c491871b3d84c89A494BD9e', url: 'https://sepolia.etherscan.io/address/0x8004A818BFB912233c491871b3d84c89A494BD9e' },
                { label: 'ENS Parent', chain: 'Sepolia', addr: 'responsesurface.eth', url: 'https://app.ens.domains/responsesurface.eth' },
              ].map((c, i) => (
                <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius)] border border-[var(--border-default)] bg-[var(--color-header)] hover:border-[var(--color-interactive-muted)] transition-colors"
                >
                  <span className="text-[11px] font-medium text-[var(--color-text)]">{c.label}</span>
                  <span className="text-[9px] text-[var(--color-text-placeholder)]">{c.chain}</span>
                  <span className="text-[9px] font-[var(--font-mono)] text-[var(--color-interactive)] ml-auto truncate max-w-[300px]">{c.addr} &uarr;</span>
                </a>
              ))}
            </div>
          </div>

          {/* Data sources */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">Live Data Sources</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { name: 'NASA EONET', desc: 'Active disasters', color: '#ef4444' },
                { name: 'NASA FIRMS', desc: 'Fire hotspots (VIIRS)', color: '#f97316' },
                { name: 'USGS Water', desc: 'Stream gauges', color: '#3b82f6' },
                { name: 'EPA AirNow', desc: 'Air quality index', color: '#8b5cf6' },
                { name: 'GBIF', desc: 'Biodiversity records', color: '#22c55e' },
                { name: 'iNaturalist', desc: 'Threatened species', color: '#10b981' },
              ].map((ds, i) => (
                <div key={i} className="px-2.5 py-2 rounded-[var(--radius)] border bg-[var(--color-header)]"
                  style={{ borderColor: `${ds.color}20` }}>
                  <div className="text-[10px] font-medium" style={{ color: ds.color }}>{ds.name}</div>
                  <div className="text-[9px] text-[var(--color-text-placeholder)] mt-0.5">{ds.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
