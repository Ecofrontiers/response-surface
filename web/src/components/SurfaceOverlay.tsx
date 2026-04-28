import { useEffect } from 'react'
import type mapboxgl from 'mapbox-gl'

interface SurfaceOverlayProps {
  map: mapboxgl.Map | null
  allocatedZones: GeoJSON.FeatureCollection
  unmetZones: GeoJSON.FeatureCollection
}

export default function SurfaceOverlay({ map, allocatedZones, unmetZones }: SurfaceOverlayProps) {
  useEffect(() => {
    if (!map) return

    if (!map.getSource('allocated-zones')) {
      map.addSource('allocated-zones', { type: 'geojson', data: allocatedZones })
      map.addLayer({
        id: 'allocated-heat',
        type: 'heatmap',
        source: 'allocated-zones',
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': 0.6,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(245,158,11,0)',
            0.5, 'rgba(245,158,11,0.3)',
            1, 'rgba(245,158,11,0.6)',
          ],
          'heatmap-radius': 40,
        },
      })
    } else {
      (map.getSource('allocated-zones') as mapboxgl.GeoJSONSource).setData(allocatedZones)
    }

    if (!map.getSource('unmet-zones')) {
      map.addSource('unmet-zones', { type: 'geojson', data: unmetZones })
      map.addLayer({
        id: 'unmet-heat',
        type: 'heatmap',
        source: 'unmet-zones',
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': 0.6,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(239,68,68,0)',
            0.5, 'rgba(239,68,68,0.3)',
            1, 'rgba(239,68,68,0.6)',
          ],
          'heatmap-radius': 40,
        },
      })
    } else {
      (map.getSource('unmet-zones') as mapboxgl.GeoJSONSource).setData(unmetZones)
    }
  }, [map, allocatedZones, unmetZones])

  return null
}
