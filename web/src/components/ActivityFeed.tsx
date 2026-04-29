import { useEffect, useRef } from 'react'
import type { ActivityEvent } from '../App'

interface ActivityFeedProps {
  events: ActivityEvent[]
}

const TYPE_CONFIG: Record<ActivityEvent['type'], { dot: string; text: string }> = {
  disaster: { dot: 'var(--status-critical)', text: 'var(--status-critical)' },
  assessment: { dot: 'var(--status-standby)', text: 'var(--color-text-secondary)' },
  proof: { dot: 'var(--status-normal)', text: 'var(--color-text-secondary)' },
  allocation: { dot: 'var(--status-serious)', text: 'var(--color-text-secondary)' },
  flag: { dot: 'var(--status-critical)', text: 'var(--status-critical)' },
  system: { dot: 'var(--status-off)', text: 'var(--color-text-placeholder)' },
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}

export default function ActivityFeed({ events }: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [events.length])

  if (events.length === 0) {
    return <div className="text-[10px] text-[var(--color-text-placeholder)] text-center py-6">No activity yet</div>
  }

  return (
    <div ref={scrollRef} className="overflow-y-auto space-y-px">
      {events.slice(0, 40).map(event => {
        const cfg = TYPE_CONFIG[event.type]
        return (
          <div key={event.id} className="flex items-start gap-2 px-2 py-1.5 rounded-[var(--radius)] hover:bg-[var(--color-hover)] transition-colors">
            <div className="w-[6px] h-[6px] rounded-full mt-1 shrink-0" style={{ background: cfg.dot }} />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] leading-relaxed" style={{ color: cfg.text }}>
                {event.message}
              </span>
              {event.links && event.links.length > 0 && (
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                  {event.links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-[var(--font-mono)] hover:underline"
                      style={{ color: 'var(--color-interactive)' }}
                    >
                      {link.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[9px] font-[var(--font-mono)] tabular shrink-0" style={{ color: 'var(--color-text-placeholder)' }}>
              {timeAgo(event.timestamp)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
