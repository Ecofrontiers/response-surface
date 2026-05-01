interface DocsPanelProps {
  onClose: () => void
}

const VERIFIABILITY_CHAIN = [
  {
    name: 'ENS',
    color: '#06b6d4',
    what: 'Any agent submitting an assessment must have a registered subname under responsesurface.eth. The coordinator reads credibility.score and credibility.proofs from the agent\'s text records before accepting the assessment. No subname = no allocation.',
  },
  {
    name: 'Gensyn AXL',
    color: '#8b5cf6',
    what: 'Assessments are relayed between agents and the coordinator over an Ed25519-authenticated P2P mesh. Each message is signed by the sender\'s private key — the coordinator can cryptographically verify which agent sent each assessment, preventing impersonation.',
  },
  {
    name: 'Astral',
    color: '#22c55e',
    what: 'Ground responders upload geotagged evidence. Astral\'s containment API checks whether the evidence location falls within the declared disaster zone. Verified containment feeds the agent\'s credibility score.',
  },
  {
    name: '0G Compute (TEE)',
    color: '#f59e0b',
    what: 'All assessments and credibility scores enter a trusted execution environment. The allocation plan is computed inside the enclave — neither the coordinator operator nor any agent can see or tamper with intermediate calculations.',
  },
  {
    name: '0G Chain',
    color: '#f59e0b',
    what: 'The ResponseFund contract holds fUSD tokens. Each cycle, the TEE-computed allocation plan triggers onchain transfers. Every disbursement is a verifiable transaction.',
  },
  {
    name: '0G Storage',
    color: '#f59e0b',
    what: 'Every assessment, allocation plan, and proof is hashed and stored permanently. The merkle root anchors the audit log — anyone can verify that a specific assessment existed at a specific time.',
  },
]

const LAYERS = [
  {
    label: 'Detection',
    color: '#ef4444',
    tech: 'NASA EONET, FIRMS, USGS, GBIF, AirNow, iNaturalist',
    desc: '6 government APIs feed real-time disaster events, fire hotspots, stream gauge levels, air quality indices, biodiversity records, and threatened species observations to regional agents. Each agent monitors a defined geographic area and synthesizes these feeds into a disaster severity assessment.',
    sponsor: null,
  },
  {
    label: 'Ground Truth',
    color: '#22c55e',
    tech: 'Astral on Base Sepolia',
    desc: 'Before assessments are relayed, ground responders upload geotagged photos from disaster zones. Astral\'s containment API verifies that each photo\'s GPS coordinates fall within the declared disaster boundary. Verified containment stamps feed the submitting agent\'s credibility score, distinguishing agents with real field evidence from those reporting remotely.',
    sponsor: 'Astral',
  },
  {
    label: 'Communication',
    color: '#8b5cf6',
    tech: 'Gensyn AXL',
    desc: 'Verified assessments are relayed between agents and the coordinator over an Ed25519-authenticated P2P mesh. 10 AXL nodes form the communication backbone. Each message is signed by the sender\'s private key, so the coordinator can cryptographically attribute every assessment to a specific agent.',
    sponsor: 'Gensyn AXL',
  },
  {
    label: 'Identity + Credibility',
    color: '#06b6d4',
    tech: 'ENS on Sepolia',
    desc: 'Each agent holds an ENS subname under responsesurface.eth with text records storing its role, region bounds, data sources, and credibility scores. The coordinator reads these records before accepting any assessment. An agent without a registered subname is excluded from allocation entirely.',
    sponsor: 'ENS',
  },
  {
    label: 'Sealed Decision',
    color: '#f59e0b',
    tech: '0G Compute (TEE)',
    desc: 'All assessments and credibility scores are submitted to a trusted execution environment. The allocation plan — how much of the response fund each region receives — is computed inside the enclave. Neither the coordinator operator nor any individual agent can observe or alter intermediate calculations.',
    sponsor: '0G',
  },
  {
    label: 'Execution',
    color: '#f59e0b',
    tech: '0G Chain (fUSD)',
    desc: 'The ResponseFund contract holds fUSD tokens on 0G Chain. Each allocation cycle disburses 3% of the pool, weighted by the credibility-adjusted severity scores computed in the TEE. Every transfer is an onchain transaction, publicly auditable.',
    sponsor: '0G',
  },
  {
    label: 'Audit',
    color: '#f59e0b',
    tech: '0G Storage',
    desc: 'Every assessment, allocation plan, credibility score, and proof is hashed and written to 0G Storage. The merkle root anchors the full audit trail — any third party can independently verify that a specific assessment or allocation existed at a specific time without trusting the coordinator.',
    sponsor: '0G',
  },
]

const TRUST_CHAIN = [
  { icon: 'GEO', label: 'Astral proves location', color: '#22c55e' },
  { icon: 'AXL', label: 'AXL proves sender', color: '#8b5cf6' },
  { icon: 'ID', label: 'ENS proves identity', color: '#06b6d4' },
  { icon: 'TEE', label: '0G proves decision', color: '#f59e0b' },
  { icon: 'TX', label: 'Chain proves execution', color: '#f59e0b' },
  { icon: 'LOG', label: 'Storage proves history', color: '#f59e0b' },
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
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Disaster Response Allocator</h2>
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
                11 AI agents monitor regions of the continental United States using government APIs (NASA, USGS, EPA, GBIF, iNaturalist).
                Each agent has a verifiable identity on ENS and communicates through an encrypted P2P mesh (Gensyn AXL).
              </p>
              <p>
                A coordinator agent collects assessments, verifies identities via ENS, checks location proofs via Astral,
                runs sealed inference in a 0G TEE, then allocates response funds onchain. 2 adversarial agents (rogue, phantom)
                test the credibility gate by submitting inflated data with zero verified proofs.
              </p>
              <p>
                Every step in the pipeline produces a verifiable artifact. Identity is attested onchain via ENS. Location evidence
                is validated against declared disaster boundaries by Astral. The allocation decision is sealed inside a TEE. Fund
                transfers are onchain transactions. The full audit trail is anchored by a merkle root in permanent storage.
              </p>
            </div>
          </div>

          {/* Verifiability Chain */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">Verifiability Chain</h3>
            <p className="text-[11px] text-[var(--color-text-placeholder)] mb-3 leading-relaxed">
              Each integration makes a specific part of the disaster response pipeline verifiable. Without any one of them, the coordinator
              must trust unverified claims at that stage.
            </p>
            <div className="space-y-2">
              {VERIFIABILITY_CHAIN.map((v, i) => (
                <div
                  key={i}
                  className="p-3 rounded-[var(--radius)] border bg-[var(--color-header)]"
                  style={{ borderColor: `${v.color}25` }}
                >
                  <div className="text-[11px] font-medium mb-1" style={{ color: v.color }}>{v.name}</div>
                  <div className="text-[11px] text-[var(--color-text-placeholder)] leading-relaxed">{v.what}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust chain visual */}
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
                Credibility scores gate fund allocation. The proof multiplier is applied during the credibility-weighted allocation phase:
                after the TEE computes raw allocation shares based on disaster severity, each agent's share is scaled by their proof multiplier.
                An agent with 0 verified proofs is completely excluded from allocation — it receives nothing regardless of reported severity or disaster count.
              </div>
              <div className="mt-2 font-[var(--font-mono)] text-xs text-red-400 bg-[var(--color-base)] rounded-[var(--radius)] px-3 py-2">
                proofMultiplier = proofs == 0 ? 0 : min(0.15 + proofCount * 0.28, 1.0)
              </div>
              <div className="mt-2 flex gap-4 text-[10px]">
                <div><span className="text-red-400">0 proofs</span> <span className="text-[var(--color-text-placeholder)]">= EXCLUDED (zero allocation)</span></div>
                <div><span className="text-yellow-400">1 proof</span> <span className="text-[var(--color-text-placeholder)]">= 43% multiplier</span></div>
                <div><span className="text-emerald-400">3+ proofs</span> <span className="text-[var(--color-text-placeholder)]">= 99% multiplier (full credibility)</span></div>
              </div>
            </div>
          </div>

          {/* Contracts */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-placeholder)] mb-3">Deployed Contracts</h3>
            <div className="space-y-1.5">
              {[
                { label: 'ResponseFund', chain: '0G Testnet', addr: '0x7e0D9cf6045dd4ba622cd410a9F137a7A6d935a0', url: 'https://chainscan-galileo.0g.ai/address/0x7e0D9cf6045dd4ba622cd410a9F137a7A6d935a0' },
                { label: 'FakeUSD (fUSD)', chain: '0G Testnet', addr: '0x6Cf1ed8721aB2B408d2a25797d6F71c9a17923A8', url: 'https://chainscan-galileo.0g.ai/address/0x6Cf1ed8721aB2B408d2a25797d6F71c9a17923A8' },
                { label: 'ENS Public Resolver', chain: 'Sepolia', addr: '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5', url: 'https://sepolia.etherscan.io/address/0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5' },
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

          {/* Footer with social links */}
          <div className="pt-2 border-t border-[var(--border-default)]">
            <div className="flex items-center justify-center gap-4">
              <a href="https://ecofrontiers.xyz/" target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-[var(--color-text-placeholder)] hover:text-[var(--color-interactive)] transition-colors">
                ecofrontiers.xyz
              </a>
              <span className="text-[var(--color-text-placeholder)] text-[8px]">/</span>
              <a href="https://x.com/ecofrontiers/" target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-[var(--color-text-placeholder)] hover:text-[var(--color-interactive)] transition-colors">
                @ecofrontiers
              </a>
              <span className="text-[var(--color-text-placeholder)] text-[8px]">/</span>
              <a href="https://ecofrontiers.xyz/blog" target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-[var(--color-text-placeholder)] hover:text-[var(--color-interactive)] transition-colors">
                blog
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
