import type { ActivityEvent } from '../App'

interface ActivityFeedProps {
  events: ActivityEvent[]
}

const TYPE_STYLES: Record<ActivityEvent['type'], { icon: string; color: string }> = {
  disaster: { icon: '⚠', color: 'text-red-400' },
  assessment: { icon: '◉', color: 'text-blue-400' },
  proof: { icon: '✦', color: 'text-cyan-400' },
  allocation: { icon: '◈', color: 'text-amber-400' },
  flag: { icon: '⚑', color: 'text-red-500' },
  system: { icon: '▸', color: 'text-gray-500' },
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}

export default function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) return null

  return (
    <div className="absolute top-16 right-6 z-10 w-72 max-h-56 bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">Activity</span>
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      </div>
      <div className="overflow-y-auto max-h-52 divide-y divide-gray-800/50">
        {events.slice(0, 20).map(event => {
          const style = TYPE_STYLES[event.type]
          return (
            <div key={event.id} className="px-4 py-2 flex items-start gap-2 text-xs">
              <span className={`${style.color} flex-shrink-0 mt-0.5`}>{style.icon}</span>
              <span className="text-gray-300 flex-1 leading-relaxed">{event.message}</span>
              <span className="text-gray-600 flex-shrink-0 tabular-nums">{timeAgo(event.timestamp)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
