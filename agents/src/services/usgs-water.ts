import type { BBox, USGSSite } from '../types'

const USGS_URL = 'https://waterservices.usgs.gov/nwis/iv'

const MAX_BBOX_WIDTH = 3.5

export async function getStreamflow(bbox: BBox): Promise<USGSSite[]> {
  const tiles = tileBBox(bbox)
  const results: USGSSite[] = []

  for (const tile of tiles) {
    const params = new URLSearchParams({
      format: 'json',
      bBox: `${tile.west},${tile.south},${tile.east},${tile.north}`,
      parameterCd: '00060,00065',
      siteStatus: 'active',
    })
    const res = await fetch(`${USGS_URL}?${params}`)
    if (!res.ok) {
      console.warn(`USGS tile error: ${res.status} for bbox ${JSON.stringify(tile)}`)
      continue
    }
    const data = await res.json()
    results.push(...parseUSGSResponse(data))
  }

  return results
}

export function tileBBox(bbox: BBox): BBox[] {
  const width = bbox.east - bbox.west
  if (width <= MAX_BBOX_WIDTH) return [bbox]

  const tiles: BBox[] = []
  let west = bbox.west
  while (west < bbox.east) {
    const east = Math.min(west + MAX_BBOX_WIDTH, bbox.east)
    tiles.push({ west, south: bbox.south, east, north: bbox.north })
    west = east
  }
  return tiles
}

function parseUSGSResponse(data: any): USGSSite[] {
  const ts = data?.value?.timeSeries
  if (!Array.isArray(ts)) return []

  const siteMap = new Map<string, USGSSite>()

  for (const series of ts) {
    const info = series.sourceInfo
    const code = info?.siteCode?.[0]?.value
    if (!code) continue

    if (!siteMap.has(code)) {
      siteMap.set(code, {
        siteCode: code,
        siteName: info.siteName || code,
        latitude: info.geoLocation?.geogLocation?.latitude || 0,
        longitude: info.geoLocation?.geogLocation?.longitude || 0,
        parameters: [],
      })
    }

    const site = siteMap.get(code)!
    const variable = series.variable
    const values = series.values?.[0]?.value
    const latest = values?.[values.length - 1]

    if (latest) {
      site.parameters.push({
        code: variable?.variableCode?.[0]?.value || '',
        name: variable?.variableName || '',
        value: parseFloat(latest.value),
        unit: variable?.unit?.unitCode || '',
        dateTime: latest.dateTime,
      })
    }
  }

  return Array.from(siteMap.values())
}
