import type { AQIReading } from '../types'

const AIRNOW_URL = 'https://www.airnowapi.org/aq/observation/latLong/current'

export async function getAirQuality(
  lat: number,
  lng: number,
): Promise<AQIReading[]> {
  const key = process.env.EPA_AIRNOW_KEY
  if (!key) throw new Error('EPA_AIRNOW_KEY not set')

  const params = new URLSearchParams({
    format: 'application/json',
    latitude: String(lat),
    longitude: String(lng),
    distance: '50',
    API_KEY: key,
  })
  const res = await fetch(`${AIRNOW_URL}?${params}`)
  if (!res.ok) throw new Error(`AirNow API error: ${res.status}`)
  return res.json()
}

export function categorizeAQI(aqi: number): { level: string; color: string } {
  if (aqi <= 50) return { level: 'Good', color: '#22c55e' }
  if (aqi <= 100) return { level: 'Moderate', color: '#f59e0b' }
  if (aqi <= 150) return { level: 'Unhealthy (Sensitive)', color: '#f97316' }
  if (aqi <= 200) return { level: 'Unhealthy', color: '#ef4444' }
  if (aqi <= 300) return { level: 'Very Unhealthy', color: '#a855f7' }
  return { level: 'Hazardous', color: '#7f1d1d' }
}
