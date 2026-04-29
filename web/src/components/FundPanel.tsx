import type { Allocation } from '../types'

interface FundPanelProps {
  balance: bigint
  totalAllocated: bigint
  allocations: Allocation[]
  cycleNumber: number
}

function formatEth(wei: bigint): string {
  const eth = Math.max(0, Number(wei) / 1e18)
  return eth.toFixed(4)
}

const AGENT_COLORS: Record<string, string> = {
  fire: '#ff3838',
  water: '#2dccff',
  coordinator: '#ffb302',
  rogue: '#ff3838',
}

function agentShortName(ensName: string): string {
  return ensName.replace('.responsesurface.eth', '')
}

function AllocationBar({ allocations }: { allocations: Allocation[] }) {
  const total = allocations.reduce((s, a) => s + a.amount, 0n)
  if (total === 0n) return null

  const slices = allocations.map(a => ({
    name: agentShortName(a.ensName),
    color: AGENT_COLORS[agentShortName(a.ensName)] || 'var(--status-off)',
    share: Number(a.amount) / Number(total),
  }))

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border-default)]">
      {/* Stacked bar — FIRMS style, 4px height */}
      <div className="flex h-1 rounded-[1px] overflow-hidden gap-px">
        {slices.map((s, i) => (
          <div key={i} className="h-full rounded-[1px]" style={{ width: `${s.share * 100}%`, background: s.color, opacity: 0.8 }} />
        ))}
      </div>
      <div className="mt-2 space-y-0.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px]">
            <div className="w-[6px] h-[6px] rounded-[1px] shrink-0" style={{ background: s.color }} />
            <span className="text-[var(--color-text-placeholder)] flex-1">{s.name}</span>
            <span className="font-[var(--font-mono)] tabular text-[var(--color-text-secondary)]">
              {(s.share * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FundPanel({ balance, totalAllocated, allocations }: FundPanelProps) {
  const total = balance + totalAllocated
  const pct = total > 0n ? Number((totalAllocated * 100n) / total) : 0

  return (
    <div>
      {/* Hero number — light weight, large */}
      <div className="text-[28px] font-light text-[var(--color-text)] font-[var(--font-mono)] tabular leading-none">
        {formatEth(balance)}
      </div>
      <div className="text-[10px] text-[var(--color-text-placeholder)] uppercase tracking-widest mt-1">fUSD available</div>

      {/* Allocation bar */}
      <div className="flex items-center gap-2 mt-3">
        <div className="flex-1 h-[3px] bg-[var(--border-default)] rounded-[1px] overflow-hidden">
          <div
            className="h-full rounded-[1px] transition-all duration-700"
            style={{ width: `${pct}%`, background: 'var(--status-serious)' }}
          />
        </div>
        <span className="text-[10px] text-[var(--color-text-placeholder)] font-[var(--font-mono)] tabular">
          {formatEth(totalAllocated)} out
        </span>
      </div>

      {allocations.length > 0 && <AllocationBar allocations={allocations} />}
    </div>
  )
}
