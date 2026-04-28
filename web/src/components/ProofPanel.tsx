import type { Proof } from '../types'

interface ProofPanelProps {
  proofs: Proof[]
}

export default function ProofPanel({ proofs }: ProofPanelProps) {
  return (
    <div className="absolute bottom-6 right-6 z-10 w-80 bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
      <h2 className="text-sm font-medium text-gray-400 mb-4">Ground Truth Proofs</h2>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {proofs.length === 0 && (
          <div className="text-xs text-gray-600 text-center py-4">
            No proofs submitted
          </div>
        )}
        {proofs.slice(-8).reverse().map((p, i) => (
          <div key={i} className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-cyan-400 truncate max-w-[160px]">
                {p.responderEns}
              </span>
              <CredibilityBadge score={p.credibilityScore} />
            </div>
            <div className="text-xs text-gray-500">
              {p.disasterId} &middot; {new Date(p.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CredibilityBadge({ score }: { score: number }) {
  const pct = score / 10
  const color = pct >= 70 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'
  return (
    <span className={`text-xs font-medium font-[var(--font-mono)] ${color}`}>
      {pct.toFixed(0)}%
    </span>
  )
}
