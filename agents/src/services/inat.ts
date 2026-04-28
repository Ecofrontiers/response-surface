import type { BBox, INatObservation } from '../types'

const INAT_URL = 'https://api.inaturalist.org/v1'

export async function getObservationsInBBox(
  bbox: BBox,
  options: { threatened?: boolean; quality_grade?: string; per_page?: number } = {},
): Promise<INatObservation[]> {
  const params = new URLSearchParams({
    nelat: String(bbox.north),
    nelng: String(bbox.east),
    swlat: String(bbox.south),
    swlng: String(bbox.west),
    quality_grade: options.quality_grade || 'research',
    per_page: String(options.per_page || 30),
    order_by: 'observed_on',
  })
  if (options.threatened) params.set('threatened', 'true')

  const res = await fetch(`${INAT_URL}/observations?${params}`)
  if (!res.ok) throw new Error(`iNaturalist API error: ${res.status}`)
  const data = await res.json()
  return data.results
}

export async function getThreatenedInBBox(
  bbox: BBox,
  limit = 30,
): Promise<INatObservation[]> {
  return getObservationsInBBox(bbox, { threatened: true, per_page: limit })
}
