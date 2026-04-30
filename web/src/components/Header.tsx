import { useEffect, useState } from 'react'

type Status = 'normal' | 'caution' | 'critical' | 'standby' | 'off'

interface HeaderProps {
  onDocsClick: () => void
  onENSClick: () => void
  onProofsClick: () => void
  agentCount?: number
  proofCount?: number
  axlNodes?: number
}

export default function Header({
  onDocsClick, onENSClick, onProofsClick,
  agentCount = 0, proofCount = 0, axlNodes = 0,
}: HeaderProps) {
  const [zgStatus, setZgStatus] = useState<Status>('standby')
  const [sepoliaStatus, setSepoliaStatus] = useState<Status>('standby')
  const [axlStatus, setAxlStatus] = useState<Status>('standby')

  useEffect(() => {
    fetch('https://evmrpc-testnet.0g.ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
    })
      .then(r => r.json())
      .then(() => setZgStatus('normal'))
      .catch(() => setZgStatus('critical'))

    fetch('https://ethereum-sepolia-rpc.publicnode.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
    })
      .then(r => r.json())
      .then(() => setSepoliaStatus('normal'))
      .catch(() => setSepoliaStatus('critical'))

    fetch('/api/axl/status')
      .then(r => r.json())
      .then(data => setAxlStatus(data.status === 'connected' ? 'normal' : data.status === 'partial' ? 'caution' : 'standby'))
      .catch(() => setAxlStatus('standby'))
  }, [])

  return (
    <header className="shrink-0 bg-[var(--color-header)] border-b border-[var(--border-default)]">
      <div className="px-5 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="var(--color-interactive)" strokeWidth="1.5" fill="none" />
              <circle cx="12" cy="12" r="3" fill="var(--color-interactive)" opacity="0.8" />
              <circle cx="12" cy="12" r="1.5" fill="var(--color-text)" />
            </svg>
            <span className="text-sm font-semibold tracking-tight text-[var(--color-text)]">
              Response Surface
            </span>
          </div>

          <button
            onClick={onDocsClick}
            className="w-[22px] h-[22px] rounded-full flex items-center justify-center cursor-pointer transition-all border border-[var(--border-default)] hover:border-[var(--color-interactive-muted)] hover:bg-[var(--color-hover)]"
            title="System documentation"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="var(--color-text-placeholder)" strokeWidth="1" />
              <text x="6" y="8.5" textAnchor="middle" fill="var(--color-text-placeholder)" fontSize="8" fontWeight="600">i</text>
            </svg>
          </button>

          <div className="h-4 w-px bg-[var(--border-default)]" />

          <div className="flex items-center gap-4">
            <StatusDot label="0G Chain" status={zgStatus} />
            <StatusDot label="Sepolia" status={sepoliaStatus} />
            <StatusDot label={`AXL${axlNodes > 0 ? ` (${axlNodes})` : ''}`} status={axlStatus} />
          </div>
        </div>

        <nav className="flex items-center gap-1.5">
          {[
            { label: 'ENS Identity', icon: '◈', color: '#06b6d4', badge: agentCount > 0 ? String(agentCount) : '', onClick: onENSClick },
            { label: 'Proofs', icon: '◉', color: '#22c55e', badge: proofCount > 0 ? String(proofCount) : '', onClick: onProofsClick },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              className="text-[10px] font-medium tracking-wide cursor-pointer px-2.5 py-1 rounded-[var(--radius)] transition-all flex items-center gap-1.5 border"
              style={{
                color: btn.color,
                borderColor: `color-mix(in srgb, ${btn.color} 30%, transparent)`,
                background: `color-mix(in srgb, ${btn.color} 6%, transparent)`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `color-mix(in srgb, ${btn.color} 15%, transparent)`
                e.currentTarget.style.borderColor = `color-mix(in srgb, ${btn.color} 50%, transparent)`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = `color-mix(in srgb, ${btn.color} 6%, transparent)`
                e.currentTarget.style.borderColor = `color-mix(in srgb, ${btn.color} 30%, transparent)`
              }}
            >
              <span className="text-[11px]">{btn.icon}</span>
              {btn.label}
              {btn.badge && (
                <span
                  className="text-[8px] font-[var(--font-mono)] tabular px-1 py-px rounded-[2px] font-semibold"
                  style={{ background: `color-mix(in srgb, ${btn.color} 25%, transparent)` }}
                >
                  {btn.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}

const STATUS_COLORS: Record<Status, string> = {
  normal: 'var(--status-normal)',
  caution: 'var(--status-caution)',
  critical: 'var(--status-critical)',
  standby: 'var(--status-standby)',
  off: 'var(--status-off)',
}

function StatusDot({ label, status }: { label: string; status: Status }) {
  const glow = status === 'normal' ? 'status-glow-normal' : status === 'critical' ? 'status-glow-critical' : ''
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-[8px] h-[8px] rounded-full ${glow}`}
        style={{ background: STATUS_COLORS[status] }}
      />
      <span className="text-[11px] text-[var(--color-text-placeholder)]">{label}</span>
    </div>
  )
}
