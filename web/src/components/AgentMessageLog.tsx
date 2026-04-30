import { useEffect, useRef } from 'react'
import type { AgentMessage } from '../types'

const AGENT_COLORS: Record<string, string> = {
  pacific: '#f97316',
  mountain: '#ef4444',
  central: '#f59e0b',
  lakes: '#3b82f6',
  delta: '#06b6d4',
  gulf: '#8b5cf6',
  atlantic: '#10b981',
  northeast: '#6366f1',
  coordinator: '#ffb302',
  rogue: '#ff3838',
  phantom: '#ff3838',
}

const PHASE_COLORS: Record<string, string> = {
  COLLECT: 'var(--status-critical)',
  AXL: 'var(--viz-3)',
  'ENS GATE': 'var(--status-standby)',
  SCORE: 'var(--status-serious)',
  TEE: 'var(--status-serious)',
  FUND: 'var(--status-normal)',
  AUDIT: 'var(--status-serious)',
  WRITE: 'var(--status-standby)',
}

const TYPE_MARKERS: Record<AgentMessage['type'], { symbol: string; color: string }> = {
  report: { symbol: '>', color: 'var(--color-text-secondary)' },
  relay: { symbol: '~', color: 'var(--viz-3)' },
  query: { symbol: '?', color: 'var(--status-standby)' },
  result: { symbol: '+', color: 'var(--status-normal)' },
  alert: { symbol: '!', color: 'var(--status-critical)' },
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function shortName(ens: string): string {
  return ens.replace('.responsesurface.eth', '')
}

export default function AgentMessageLog({ messages }: { messages: AgentMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <div className="text-[20px] opacity-20">{"///"}</div>
        <div className="text-[10px] text-[var(--color-text-placeholder)] text-center">
          Run a cycle to see agent communications
        </div>
      </div>
    )
  }

  let currentPhase = ''

  return (
    <div ref={scrollRef} className="overflow-y-auto font-[var(--font-mono)]" style={{ fontSize: '10px' }}>
      {messages.map(msg => {
        const sender = shortName(msg.sender)
        const senderColor = AGENT_COLORS[sender] || 'var(--viz-2)'
        const showPhaseHeader = msg.phase !== currentPhase
        if (showPhaseHeader) currentPhase = msg.phase
        const marker = TYPE_MARKERS[msg.type]

        return (
          <div key={msg.id}>
            {showPhaseHeader && (
              <div className="flex items-center gap-2 pt-3 pb-1 px-1 first:pt-1">
                <span
                  className="text-[9px] font-medium uppercase tracking-wider shrink-0"
                  style={{ color: PHASE_COLORS[msg.phase] || 'var(--color-interactive-muted)' }}
                >
                  {msg.phase}
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
              </div>
            )}
            <div className="flex items-start gap-1.5 px-1 py-[3px] hover:bg-[var(--color-hover)] rounded-[var(--radius)] transition-colors leading-relaxed">
              <span className="shrink-0 tabular opacity-40" style={{ color: 'var(--color-text-placeholder)' }}>
                {formatTime(msg.timestamp)}
              </span>
              <span className="shrink-0 w-[7px] text-center" style={{ color: marker.color }}>
                {marker.symbol}
              </span>
              <span className="shrink-0 font-medium" style={{ color: senderColor }}>
                {sender}
              </span>
              {msg.receiver && (
                <>
                  <span style={{ color: 'var(--color-text-placeholder)' }}>{'→'}</span>
                  <span className="shrink-0" style={{ color: AGENT_COLORS[shortName(msg.receiver)] || 'var(--viz-2)' }}>
                    {shortName(msg.receiver)}
                  </span>
                </>
              )}
              <span className="text-[var(--color-text-secondary)] break-words min-w-0">
                {msg.content}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
