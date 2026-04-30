import { useEffect, useState } from 'react'

type Status = 'normal' | 'caution' | 'critical' | 'standby' | 'off'

interface HeaderProps {
  onArchitectureClick: () => void
  onMeshClick: () => void
  onProofsClick: () => void
  onENSClick: () => void
}

export default function Header({
  onArchitectureClick, onMeshClick, onProofsClick, onENSClick,
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
        <div className="flex items-center gap-5">
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

          <div className="h-4 w-px bg-[var(--border-default)]" />

          <div className="flex items-center gap-4">
            <StatusDot label="0G Chain" status={zgStatus} />
            <StatusDot label="Sepolia" status={sepoliaStatus} />
            <StatusDot label="AXL" status={axlStatus} />
          </div>
        </div>

        <nav className="flex items-center gap-1.5">
          {[
            { label: 'Architecture', icon: '◇', color: '#f59e0b', onClick: onArchitectureClick },
            { label: 'AXL Mesh', icon: '⬡', color: '#8b5cf6', onClick: onMeshClick },
            { label: 'ENS', icon: '◈', color: '#06b6d4', onClick: onENSClick },
            { label: 'Proofs', icon: '◉', color: '#22c55e', onClick: onProofsClick },
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
