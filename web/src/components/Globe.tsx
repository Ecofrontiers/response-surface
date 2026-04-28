import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import type { Agent, Disaster, Allocation, Proof } from '../types'

interface GlobeProps {
  agents: Agent[]
  disasters: Disaster[]
  allocations: Allocation[]
  proofs: Proof[]
  selectedAgent: string | null
  onAgentClick: (ensName: string) => void
}

const AGENT_COLORS: Record<string, string> = {
  agent: '#3b82f6',
  coordinator: '#f59e0b',
  adversary: '#ef4444',
}

function agentColor(agent: Agent): string {
  if (agent.role === 'adversary') return '#ef4444'
  if (agent.dataSources.includes('FIRMS')) return '#ef4444'
  if (agent.dataSources.includes('USGS')) return '#3b82f6'
  return AGENT_COLORS[agent.role] || '#6b7280'
}

export default function Globe({ agents, disasters, proofs, onAgentClick }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-95, 35],
      zoom: 2.8,
      projection: 'globe',
      attributionControl: false,
    })

    map.on('style.load', () => {
      map.setFog({
        color: '#0a0e17',
        'high-color': '#111827',
        'horizon-blend': 0.1,
        'space-color': '#0a0e17',
        'star-intensity': 0.3,
      })
    })

    map.on('load', () => {
      map.addSource('disasters', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'disaster-markers',
        type: 'circle',
        source: 'disasters',
        paint: {
          'circle-radius': 6,
          'circle-color': ['match', ['get', 'category'],
            'wildfires', '#ef4444',
            'floods', '#3b82f6',
            'severeStorms', '#a855f7',
            'seaLakeIce', '#06b6d4',
            'volcanoes', '#f97316',
            '#f59e0b',
          ],
          'circle-opacity': 0.7,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.3,
        },
      })

      map.addSource('bioregions', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'bioregion-fill',
        type: 'fill',
        source: 'bioregions',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.08,
        },
      })

      map.addLayer({
        id: 'bioregion-outline',
        type: 'line',
        source: 'bioregions',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.5,
          'line-opacity': 0.4,
          'line-dasharray': [4, 2],
        },
      })

      map.addSource('proofs', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'proof-markers',
        type: 'circle',
        source: 'proofs',
        paint: {
          'circle-radius': 4,
          'circle-color': '#06b6d4',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0a0e17',
        },
      })

      map.on('click', 'disaster-markers', (e) => {
        const feature = e.features?.[0]
        if (!feature || !e.lngLat) return
        const { title, category } = feature.properties as { title: string; category: string }
        new mapboxgl.Popup({ closeButton: false, maxWidth: '240px' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family:Inter,sans-serif;font-size:12px;color:#e5e7eb;background:#1f2937;padding:8px 12px;border-radius:6px;border:1px solid #ef444440">
              <div style="font-weight:600;color:#ef4444">${title}</div>
              <div style="margin-top:2px;opacity:0.7">${category}</div>
              <div style="margin-top:4px;font-size:10px;color:#9ca3af">Source: NASA EONET</div>
            </div>
          `)
          .addTo(map)
      })

      map.on('mouseenter', 'disaster-markers', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'disaster-markers', () => { map.getCanvas().style.cursor = '' })

      setIsLoaded(true)
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return
    const map = mapRef.current

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    agents.forEach(agent => {
      const color = agentColor(agent)
      const isFlagged = agent.status === 'flagged'

      const size = agent.role === 'coordinator' ? '18px' : isFlagged ? '18px' : '14px'
      const el = document.createElement('div')
      el.style.width = size
      el.style.height = size
      el.style.borderRadius = '50%'
      el.style.backgroundColor = color
      el.style.border = `2px solid ${isFlagged ? '#ef4444' : 'rgba(255,255,255,0.5)'}`
      el.style.cursor = 'pointer'
      el.style.boxShadow = isFlagged ? `0 0 16px ${color}, 0 0 4px ${color}` : `0 0 8px ${color}80`
      el.style.zIndex = isFlagged ? '10' : '1'
      if (isFlagged) {
        el.style.animation = 'pulse 1.5s ease-in-out infinite'
      }
      el.addEventListener('click', () => onAgentClick(agent.ensName))

      const popup = new mapboxgl.Popup({ offset: 12, closeButton: false })
        .setHTML(`
          <div style="font-family:Inter,sans-serif;font-size:12px;color:#e5e7eb;background:#1f2937;padding:8px 12px;border-radius:6px;border:1px solid ${color}40">
            <div style="font-weight:600;color:${color}">${agent.ensName}</div>
            <div style="margin-top:2px;opacity:0.7">${agent.role}${isFlagged ? ' — FLAGGED' : ''}</div>
            ${agent.credibilityScore !== undefined ? `<div style="margin-top:2px">Credibility: ${agent.credibilityScore}/1000</div>` : ''}
          </div>
        `)

      const marker = new mapboxgl.Marker(el)
        .setLngLat(agent.bioregion.center)
        .setPopup(popup)
        .addTo(map)

      markersRef.current.push(marker)
    })

    const bioregionFeatures = agents
      .filter(a => a.role !== 'coordinator' && a.role !== 'adversary')
      .map(a => ({
        type: 'Feature' as const,
        properties: { color: agentColor(a), name: a.ensName },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[
            [a.bioregion.bbox.west, a.bioregion.bbox.south],
            [a.bioregion.bbox.east, a.bioregion.bbox.south],
            [a.bioregion.bbox.east, a.bioregion.bbox.north],
            [a.bioregion.bbox.west, a.bioregion.bbox.north],
            [a.bioregion.bbox.west, a.bioregion.bbox.south],
          ]],
        },
      }))

    const bioSrc = map.getSource('bioregions') as mapboxgl.GeoJSONSource
    if (bioSrc) {
      bioSrc.setData({ type: 'FeatureCollection', features: bioregionFeatures })
    }
  }, [isLoaded, agents, onAgentClick])

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return
    const src = mapRef.current.getSource('disasters') as mapboxgl.GeoJSONSource
    if (!src) return

    src.setData({
      type: 'FeatureCollection',
      features: disasters.map(d => ({
        type: 'Feature' as const,
        properties: { id: d.id, title: d.title, category: d.category },
        geometry: d.geometry,
      })),
    })
  }, [isLoaded, disasters])

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return
    const src = mapRef.current.getSource('proofs') as mapboxgl.GeoJSONSource
    if (!src) return

    src.setData({
      type: 'FeatureCollection',
      features: proofs.map(p => ({
        type: 'Feature' as const,
        properties: { responder: p.responderEns, credibility: p.credibilityScore },
        geometry: p.location,
      })),
    })
  }, [isLoaded, proofs])

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
    </>
  )
}
