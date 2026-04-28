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

export default function FundPanel({ balance, totalAllocated, allocations, cycleNumber }: FundPanelProps) {
  return (
    <div className="absolute bottom-6 left-6 z-10 w-80 bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-400">Response Fund</h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
          Cycle {cycleNumber}
        </span>
      </div>

      <div className="mb-4">
        <div className="text-3xl font-semibold text-amber-400 font-[var(--font-mono)]">
          {formatEth(balance)} <span className="text-lg text-gray-500">0G</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {formatEth(totalAllocated)} allocated total
        </div>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {allocations.length === 0 && (
          <div className="text-xs text-gray-600 text-center py-4">
            No allocations yet
          </div>
        )}
        {allocations.slice(-5).reverse().map((a, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-amber-400 font-[var(--font-mono)]">
              {formatEth(a.amount)}
            </span>
            <span className="text-gray-400 truncate ml-2 max-w-[140px]">
              {a.ensName}
            </span>
            {a.teeVerified && (
              <span className="text-green-400 ml-1" title="TEE verified">T</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
