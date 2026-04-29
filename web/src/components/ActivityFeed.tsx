import { useEffect, useRef } from 'react'
import type { ActivityEvent } from '../App'

interface ActivityFeedProps {
  events: ActivityEvent[]
}

const TYPE_STYLES: Record<ActivityEvent['type'], { icon: string; color: string; bg: string }> = {
  disaster: { icon: '⚠', color: 'text-red-400', bg: 'bg-red-500/5' },
  assessment: { icon: '◉', color: 'text-blue-400', bg: 'bg-blue-500/5' },
  proof: { icon: '✦', color: 'text-cyan-400', bg: 'bg-cyan-500/5' },
  allocation: { icon: '◈', color: 'text-amber-400', bg: 'bg-amber-500/5' },
  flag: { icon: '⚑', color: 'text-red-500', bg: 'bg-red-500/8' },
  system: { icon: '▸', color: 'text-gray-500', bg: '' },
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [events.length])

  if (events.length === 0) {
    return (
      <div className="text-[10px] text-gray-600 text-center py-4">
        Run an allocation cycle to see activity here
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="overflow-y-auto max-h-64 divide-y divide-white/[0.03]">
      {events.slice(0, 30).map(event => {
        const style = TYPE_STYLES[event.type]
        const isCycleBorder = event.type === 'system' && event.message.includes('── Cycle')
        return (
          <div
            key={event.id}
            className={`px-1 py-1.5 flex items-start gap-2 text-xs ${style.bg} ${isCycleBorder ? 'border-l-2 border-cyan-500/40' : ''}`}
          >
            <span className={`${style.color} flex-shrink-0 mt-0.5 w-3 text-center`}>{style.icon}</span>
            <span className={`flex-1 leading-relaxed ${isCycleBorder ? 'text-cyan-400 font-medium' : 'text-gray-400'}`}>
              {event.message}
            </span>
            <span className="text-gray-600 flex-shrink-0 tabular-nums text-[10px]">{timeAgo(event.timestamp)}</span>
          </div>
        )
      })}
    </div>
  )
}
