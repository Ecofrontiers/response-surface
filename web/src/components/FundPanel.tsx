import type { Allocation } from '../types'

interface FundPanelProps {
  balance: bigint
  totalAllocated: bigint
  allocations: Allocation[]
  cycleNumber: number
}

function formatEth(wei: bigint): string {
  const eth = Number(wei) / 1e18
  return eth.toFixed(4)
}

const AGENT_COLORS: Record<string, string> = {
  fire: '#f97316',
  water: '#3b82f6',
  coordinator: '#f59e0b',
  rogue: '#ef4444',
}

function agentShortName(ensName: string): string {
  return ensName.replace('.responsesurface.eth', '')
}

function agentColorFromName(ensName: string): string {
  const name = agentShortName(ensName)
  return AGENT_COLORS[name] || '#6b7280'
}

function AllocationDonut({ allocations }: { allocations: Allocation[] }) {
  const total = allocations.reduce((s, a) => s + a.amount, 0n)
  if (total === 0n) return null

  const slices = allocations.map(a => ({
    name: agentShortName(a.ensName),
    color: agentColorFromName(a.ensName),
    share: Number(a.amount) / Number(total),
    amount: a.amount,
  }))

  const r = 32
  const stroke = 8
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
      <svg width={80} height={80} viewBox="0 0 80 80">
        {slices.map((s, i) => {
          const dashLen = circumference * s.share
          const dashGap = circumference - dashLen
          const currentOffset = offset
          offset += dashLen
          return (
            <circle
              key={i}
              cx={40} cy={40} r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${dashLen} ${dashGap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="round"
              opacity={0.85}
              transform="rotate(-90 40 40)"
            />
          )
        })}
        <text x={40} y={38} textAnchor="middle" fill="#e5e7eb" fontSize="11" fontWeight="600" fontFamily="monospace">
          {formatEth(total).replace(/\.?0+$/, '')}
        </text>
        <text x={40} y={50} textAnchor="middle" fill="#6b7280" fontSize="8">
          fUSD out
        </text>
      </svg>
      <div className="flex-1 space-y-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px]">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-gray-400 flex-1">{s.name}</span>
            <span className="font-[var(--font-mono)] text-gray-300">{(s.share * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FundPanel({ balance, totalAllocated, allocations, cycleNumber }: FundPanelProps) {
  const total = balance + totalAllocated
  const pct = total > 0n ? Number((totalAllocated * 100n) / total) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Response Fund</h3>
        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20">
          Cycle {cycleNumber}
        </span>
      </div>

      <div className="mb-1">
        <div className="text-xl font-semibold text-amber-400 font-[var(--font-mono)] leading-tight">
          {formatEth(balance)} <span className="text-sm text-amber-400/50">fUSD</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-gray-500 font-[var(--font-mono)]">{formatEth(totalAllocated)} out</span>
        </div>
      </div>

      <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">
        Held in the ResponseFund contract on 0G Chain. Allocations are weighted by credibility — agents with verified proofs receive more.{allocations.length === 0 ? ' Run an allocation cycle to distribute funds.' : ''}
      </p>

      {allocations.length > 0 && (
        <AllocationDonut allocations={allocations} />
      )}
    </div>
  )
}
