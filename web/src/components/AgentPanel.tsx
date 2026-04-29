import type { Agent, Proof } from '../types'

interface AgentPanelProps {
  ensName: string
  agent: Agent
  textRecords: Record<string, string>
  proofs: Proof[]
  onClose: () => void
}

export default function AgentPanel({ ensName, agent, textRecords, proofs, onClose }: AgentPanelProps) {
  if (!agent) return null

  return (
    <div className="absolute top-0 right-0 bottom-0 z-20 w-96 bg-gray-900/95 backdrop-blur-sm border-l border-gray-800 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold truncate">{ensName}</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors text-xl leading-none"
        >
          &times;
        </button>
      </div>

      <div className="space-y-4">
        <Section title="Role">
          <Badge
            color={agent.role === 'coordinator' ? 'amber' : agent.role === 'adversary' ? 'red' : agent.role === 'agent' ? 'blue' : 'cyan'}
            text={agent.role}
          />
          {agent.status === 'flagged' && (
            <div className="mt-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              FLAGGED — credibility below threshold, allocations reduced
            </div>
          )}
        </Section>

        <Section title="Data Sources">
          <div className="flex flex-wrap gap-1.5">
            {agent.dataSources.map(ds => (
              <span key={ds} className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-300">
                {ds}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Bioregion">
          <code className="text-xs text-gray-400 font-[var(--font-mono)]">
            {agent.bioregion.bbox.west.toFixed(1)}, {agent.bioregion.bbox.south.toFixed(1)} →{' '}
            {agent.bioregion.bbox.east.toFixed(1)}, {agent.bioregion.bbox.north.toFixed(1)}
          </code>
        </Section>

        {agent.credibilityScore !== undefined && (
          <Section title="Credibility">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${agent.credibilityScore < 300 ? 'bg-red-500' : agent.credibilityScore < 600 ? 'bg-amber-500' : 'bg-cyan-500'}`}
                  style={{ width: `${(agent.credibilityScore / 1000) * 100}%` }}
                />
              </div>
              <span className={`text-xs font-[var(--font-mono)] ${agent.credibilityScore < 300 ? 'text-red-400' : agent.credibilityScore < 600 ? 'text-amber-400' : 'text-cyan-400'}`}>
                {agent.credibilityScore}/1000
              </span>
            </div>
          </Section>
        )}

        {Object.keys(textRecords).length > 0 && (
          <Section title="ENS Records">
            <div className="space-y-1">
              {Object.entries(textRecords).map(([key, value]) => (
                <div key={key} className="flex text-xs">
                  <span className="text-gray-500 w-28 flex-shrink-0 truncate">{key}</span>
                  <span className="text-gray-300 truncate">{value}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title={`Proofs (${proofs.length})`}>
          {proofs.length === 0 ? (
            <div className="text-xs text-gray-600 text-center py-2">No proofs yet</div>
          ) : (
            <div className="space-y-2">
              {proofs.slice(-5).reverse().map((p, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400">{p.responderEns}</span>
                    <span className="text-gray-500">
                      {new Date(p.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-gray-500 mt-1">
                    Score: {p.credibilityScore}/1000
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-2">{title}</div>
      {children}
    </div>
  )
}

function Badge({ color, text }: { color: 'amber' | 'blue' | 'cyan' | 'red'; text: string }) {
  const colors = {
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
      {text}
    </span>
  )
}
