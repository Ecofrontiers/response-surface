import type { EONETEvent } from '../types'

const EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events'

let cachedEvents: EONETEvent[] = []
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000

export async function getActiveDisasters(
  category?: string,
  days?: number,
): Promise<EONETEvent[]> {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (days) params.set('days', String(days))
  params.set('status', 'open')

  try {
    const res = await fetch(`${EONET_URL}?${params}`)
    if (!res.ok) throw new Error(`EONET API error: ${res.status}`)
    const data = await res.json()
    cachedEvents = data.events
    cacheTime = Date.now()
    return data.events
  } catch (e) {
    if (cachedEvents.length > 0 && Date.now() - cacheTime < CACHE_TTL) {
      console.warn(`[eonet] API failed, using cached data (${cachedEvents.length} events, ${Math.round((Date.now() - cacheTime) / 1000)}s old)`)
      return cachedEvents
    }
    throw e
  }
}

export async function getDisastersInBBox(
  bbox: { west: number; south: number; east: number; north: number },
  days = 30,
): Promise<EONETEvent[]> {
  const events = await getActiveDisasters(undefined, days)
  return events.filter(event => {
    const latest = event.geometry[event.geometry.length - 1]
    if (!latest || latest.type !== 'Point') return false
    const [lng, lat] = latest.coordinates
    return lng >= bbox.west && lng <= bbox.east && lat >= bbox.south && lat <= bbox.north
  })
}
