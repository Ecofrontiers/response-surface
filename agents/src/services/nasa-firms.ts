import type { BBox, FireHotspot } from '../types'

const FIRMS_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv'

export async function getFireHotspots(
  bbox: BBox,
  source: 'VIIRS_SNPP_NRT' | 'MODIS_NRT' = 'VIIRS_SNPP_NRT',
  days = 1,
): Promise<FireHotspot[]> {
  const key = process.env.NASA_FIRMS_KEY
  if (!key) throw new Error('NASA_FIRMS_KEY not set')

  const area = `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`
  const url = `${FIRMS_URL}/${key}/${source}/${area}/${days}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`FIRMS API error: ${res.status}`)

  const csv = await res.text()
  return parseFireCSV(csv)
}

function parseFireCSV(csv: string): FireHotspot[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',')
  const latIdx = headers.indexOf('latitude')
  const lngIdx = headers.indexOf('longitude')
  const brightIdx = headers.indexOf('bright_ti4')
  const confIdx = headers.indexOf('confidence')
  const dateIdx = headers.indexOf('acq_date')
  const timeIdx = headers.indexOf('acq_time')
  const frpIdx = headers.indexOf('frp')

  return lines.slice(1).map(line => {
    const cols = line.split(',')
    return {
      latitude: parseFloat(cols[latIdx]),
      longitude: parseFloat(cols[lngIdx]),
      brightness: parseFloat(cols[brightIdx]) || 0,
      confidence: cols[confIdx] || 'nominal',
      acq_date: cols[dateIdx],
      acq_time: cols[timeIdx],
      frp: parseFloat(cols[frpIdx]) || 0,
    }
  })
}
