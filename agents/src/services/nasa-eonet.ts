import type { EONETEvent } from '../types'

const EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events'

export async function getActiveDisasters(
  category?: string,
  days?: number,
): Promise<EONETEvent[]> {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (days) params.set('days', String(days))
  params.set('status', 'open')

  const res = await fetch(`${EONET_URL}?${params}`)
  if (!res.ok) throw new Error(`EONET API error: ${res.status}`)
  const data = await res.json()
  return data.events
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
