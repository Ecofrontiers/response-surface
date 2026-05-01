import { useEffect, useState } from 'react'
import { Globe, Article } from '@phosphor-icons/react'

type Status = 'normal' | 'caution' | 'critical' | 'standby' | 'off'

interface HeaderProps {
  onDocsClick: () => void
  axlNodes?: number
}

export default function Header({
  onDocsClick,
  axlNodes = 0,
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
              Disaster Response Allocator
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

        <div className="flex items-center gap-2">
          <a href="https://ecofrontiers.xyz/" target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-placeholder)] hover:text-[var(--color-text)] transition-colors" title="ecofrontiers.xyz">
            <Globe size={16} weight="bold" />
          </a>
          <a href="https://ecofrontiers.xyz/blog" target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-placeholder)] hover:text-[var(--color-text)] transition-colors" title="Blog">
            <Article size={16} weight="bold" />
          </a>
          <a href="https://x.com/ecofrontiers" target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-placeholder)] hover:text-[var(--color-text)] transition-colors" title="@ecofrontiers">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://github.com/ecofrontiers" target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-placeholder)] hover:text-[var(--color-text)] transition-colors" title="ecofrontiers">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          </a>
        </div>
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
