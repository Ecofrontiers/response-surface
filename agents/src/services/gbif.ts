import type { BBox, GBIFOccurrence } from '../types'

const GBIF_URL = 'https://api.gbif.org/v1'

export async function getSpeciesInBBox(
  bbox: BBox,
  limit = 50,
): Promise<GBIFOccurrence[]> {
  const params = new URLSearchParams({
    decimalLatitude: `${bbox.south},${bbox.north}`,
    decimalLongitude: `${bbox.west},${bbox.east}`,
    hasCoordinate: 'true',
    limit: String(limit),
  })
  const res = await fetch(`${GBIF_URL}/occurrence/search?${params}`)
  if (!res.ok) throw new Error(`GBIF API error: ${res.status}`)
  const data = await res.json()
  return data.results
}

export async function getThreatenedSpeciesInBBox(
  bbox: BBox,
  limit = 50,
): Promise<GBIFOccurrence[]> {
  const occurrences = await getSpeciesInBBox(bbox, limit * 3)
  return occurrences.filter(
    o => o.iucnRedListCategory && !['LC', 'NE', 'DD'].includes(o.iucnRedListCategory),
  )
}
