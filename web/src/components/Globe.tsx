import { useEffect, useRef, useState, useCallback } from 'react'
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

function agentColor(agent: Agent): string {
  if (agent.role === 'adversary') return '#ef4444'
  if (agent.dataSources.includes('FIRMS')) return '#f97316'
  if (agent.dataSources.includes('USGS')) return '#3b82f6'
  if (agent.role === 'coordinator') return '#f59e0b'
  return '#6b7280'
}

function credibilityColor(score: number | undefined): string {
  if (score === undefined) return '#6b7280'
  if (score < 300) return '#ef4444'
  if (score < 600) return '#eab308'
  return '#22c55e'
}

function createArc(start: [number, number], end: [number, number], steps = 40): [number, number][] {
  const points: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const lng = start[0] + (end[0] - start[0]) * t
    const lat = start[1] + (end[1] - start[1]) * t
    const bulge = Math.sin(t * Math.PI) * 3
    points.push([lng, lat + bulge])
  }
  return points
}

// Real geographic boundaries for monitoring regions
// These trace actual coastlines and state borders (simplified for rendering)
const BIOREGION_POLYGONS: Record<string, [number, number][]> = {
  'fire.responsesurface.eth': [
    // California + Nevada — Pacific coast south, AZ/MX border east, OR border north
    [-124.4, 42.0],
    [-124.3, 40.8],
    [-124.0, 40.4],
    [-123.7, 39.4],
    [-123.0, 38.3],
    [-122.5, 37.8],
    [-122.1, 36.8],
    [-121.5, 36.1],
    [-120.6, 35.2],
    [-120.1, 34.7],
    [-119.4, 34.3],
    [-118.5, 34.0],
    [-117.9, 33.5],
    [-117.3, 33.0],
    [-117.0, 32.5],
    [-114.7, 32.7],
    [-114.6, 35.0],
    [-114.1, 36.2],
    [-114.1, 42.0],
    [-124.4, 42.0],
  ],
  'water.responsesurface.eth': [
    // Lower Mississippi basin — LA, MS, AR state boundaries approximated
    [-94.6, 36.5],
    [-92.0, 36.5],
    [-90.2, 36.5],
    [-89.5, 35.8],
    [-88.8, 34.5],
    [-88.1, 33.0],
    [-88.4, 31.0],
    [-88.9, 30.2],
    [-89.6, 29.2],
    [-90.5, 29.0],
    [-91.8, 29.4],
    [-93.0, 29.6],
    [-93.8, 29.8],
    [-94.0, 30.5],
    [-94.0, 33.0],
    [-94.5, 34.0],
    [-94.6, 36.5],
  ],
}

function agentIconSvg(name: string, color: string, s = 20): string {
  if (name === 'fire') {
    return `<svg width="${s}" height="${s}" viewBox="0 0 20 20"><path d="M10 2C10 2 5 8 5 12C5 15.3 7.2 18 10 18C12.8 18 15 15.3 15 12C15 8 10 2 10 2Z" fill="${color}" stroke="white" stroke-width="1.2"/></svg>`
  }
  if (name === 'water') {
    return `<svg width="${s}" height="${s}" viewBox="0 0 20 20"><path d="M10 2C10 2 4 9 4 13C4 16 6.7 18 10 18C13.3 18 16 16 16 13C16 9 10 2 10 2Z" fill="${color}" stroke="white" stroke-width="1.2"/></svg>`
  }
  if (name === 'coordinator') {
    return `<svg width="${s}" height="${s}" viewBox="0 0 20 20"><polygon points="10,1 12.2,7.2 19,7.6 13.8,11.8 15.4,18.5 10,14.8 4.6,18.5 6.2,11.8 1,7.6 7.8,7.2" fill="${color}" stroke="white" stroke-width="0.8"/></svg>`
  }
  return `<svg width="${s}" height="${s}" viewBox="0 0 20 20"><path d="M10 2L18 17H2L10 2Z" fill="${color}" stroke="white" stroke-width="1.2"/><text x="10" y="14" text-anchor="middle" fill="white" font-size="9" font-weight="bold">!</text></svg>`
}

function createDisasterIcon(color: string, shape: 'triangle' | 'diamond' | 'circle', size = 32): { width: number; height: number; data: Uint8ClampedArray } {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38

  ctx.fillStyle = color
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'
  ctx.lineWidth = 1.5

  if (shape === 'triangle') {
    ctx.beginPath()
    ctx.moveTo(cx, cy - r)
    ctx.lineTo(cx + r * 0.87, cy + r * 0.5)
    ctx.lineTo(cx - r * 0.87, cy + r * 0.5)
    ctx.closePath()
  } else if (shape === 'diamond') {
    ctx.beginPath()
    ctx.moveTo(cx, cy - r)
    ctx.lineTo(cx + r * 0.7, cy)
    ctx.lineTo(cx, cy + r)
    ctx.lineTo(cx - r * 0.7, cy)
    ctx.closePath()
  } else {
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2)
  }

  ctx.fill()
  ctx.stroke()

  const imgData = ctx.getImageData(0, 0, size, size)
  return { width: size, height: size, data: imgData.data }
}

export default function Globe({ agents, disasters, allocations, proofs, onAgentClick }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const animFrameRef = useRef<number>(0)
  const prevAllocCountRef = useRef(0)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-98, 37],
      zoom: 3.4,
      projection: 'globe',
      attributionControl: false,
      logoPosition: 'bottom-right',
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
      // Load disaster icon images (canvas-rendered)
      map.addImage('icon-wildfire', createDisasterIcon('#ef4444', 'triangle'), { pixelRatio: 2 })
      map.addImage('icon-flood', createDisasterIcon('#3b82f6', 'diamond'), { pixelRatio: 2 })
      map.addImage('icon-storm', createDisasterIcon('#a855f7', 'diamond'), { pixelRatio: 2 })
      map.addImage('icon-ice', createDisasterIcon('#06b6d4', 'circle'), { pixelRatio: 2 })
      map.addImage('icon-volcano', createDisasterIcon('#f97316', 'triangle'), { pixelRatio: 2 })
      map.addImage('icon-default', createDisasterIcon('#f59e0b', 'circle'), { pixelRatio: 2 })

      // === SOURCES ===
      map.addSource('bioregions', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addSource('disasters', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addSource('axl-arcs', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addSource('proofs', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addSource('allocation-pulses', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // === LAYERS (bottom to top) ===

      // Bioregion boundaries — real geographic polygons
      map.addLayer({
        id: 'bioregion-fill',
        type: 'fill',
        source: 'bioregions',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.06,
        },
      })

      map.addLayer({
        id: 'bioregion-border',
        type: 'line',
        source: 'bioregions',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.5,
          'line-opacity': 0.35,
          'line-dasharray': [4, 2],
        },
      })

      // AXL mesh arcs
      map.addLayer({
        id: 'axl-arcs-glow',
        type: 'line',
        source: 'axl-arcs',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 6,
          'line-opacity': 0.15,
          'line-blur': 6,
        },
      })

      map.addLayer({
        id: 'axl-arcs-line',
        type: 'line',
        source: 'axl-arcs',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.5,
          'line-opacity': 0.6,
          'line-dasharray': [2, 3],
        },
      })

      // Disaster pulse ring (animated, behind icons)
      map.addLayer({
        id: 'disaster-pulse',
        type: 'circle',
        source: 'disasters',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'severity'],
            1, 12,
            5, 22,
            10, 35,
          ],
          'circle-color': 'transparent',
          'circle-stroke-width': ['interpolate', ['linear'], ['get', 'severity'],
            1, 1,
            5, 1.5,
            10, 2.5,
          ],
          'circle-stroke-color': ['match', ['get', 'category'],
            'wildfires', '#ef4444',
            'floods', '#3b82f6',
            'severeStorms', '#a855f7',
            'seaLakeIce', '#06b6d4',
            'volcanoes', '#f97316',
            '#f59e0b',
          ],
          'circle-stroke-opacity': 0.4,
        },
      })

      // Disaster icon markers (symbol layer — triangles, diamonds, circles by category)
      map.addLayer({
        id: 'disaster-icons',
        type: 'symbol',
        source: 'disasters',
        layout: {
          'icon-image': ['match', ['get', 'category'],
            'wildfires', 'icon-wildfire',
            'floods', 'icon-flood',
            'severeStorms', 'icon-storm',
            'seaLakeIce', 'icon-ice',
            'volcanoes', 'icon-volcano',
            'icon-default',
          ],
          'icon-size': ['interpolate', ['linear'], ['get', 'severity'],
            1, 0.8,
            5, 1.2,
            10, 1.8,
          ],
          'icon-allow-overlap': true,
        },
      })

      // Proof markers
      map.addLayer({
        id: 'proof-markers',
        type: 'circle',
        source: 'proofs',
        paint: {
          'circle-radius': 5,
          'circle-color': '#06b6d4',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0a0e17',
        },
      })

      // Allocation pulse ring
      map.addLayer({
        id: 'allocation-pulse-ring',
        type: 'circle',
        source: 'allocation-pulses',
        paint: {
          'circle-radius': 20,
          'circle-color': 'transparent',
          'circle-stroke-width': 2,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-opacity': 0.6,
        },
      })

      // === EVENT HANDLERS ===
      map.on('click', 'disaster-icons', (e) => {
        const feature = e.features?.[0]
        if (!feature || !e.lngLat) return
        const props = feature.properties as { title: string; category: string; severity: number }
        new mapboxgl.Popup({ closeButton: false, maxWidth: '260px' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family:Inter,sans-serif;font-size:12px;color:#e5e7eb;background:#1f2937;padding:8px 12px;border-radius:6px;border:1px solid #ef444440">
              <div style="font-weight:600;color:#ef4444">${props.title}</div>
              <div style="margin-top:2px;opacity:0.7">${props.category}</div>
              <div style="margin-top:4px;font-size:10px;color:#9ca3af">Severity: ${props.severity}/10 · NASA EONET</div>
            </div>
          `)
          .addTo(map)
      })

      map.on('mouseenter', 'disaster-icons', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'disaster-icons', () => { map.getCanvas().style.cursor = '' })

      // === ANIMATION ===
      let frame = 0
      const animate = () => {
        frame++
        if (map.getLayer('disaster-pulse')) {
          const t = frame * 0.03
          map.setPaintProperty('disaster-pulse', 'circle-radius', [
            'interpolate', ['linear'], ['get', 'severity'],
            1, 12 + Math.sin(t * 0.5) * 4,
            5, 22 + Math.sin(t) * 6,
            10, 35 + Math.sin(t * 2) * 10,
          ])
          map.setPaintProperty('disaster-pulse', 'circle-stroke-opacity',
            0.15 + Math.abs(Math.sin(t)) * 0.35,
          )
        }
        if (map.getLayer('axl-arcs-line')) {
          const dashPhase = (frame * 0.08) % 5
          map.setPaintProperty('axl-arcs-line', 'line-dasharray', [2, 3 + Math.sin(dashPhase) * 0.5])
        }
        animFrameRef.current = requestAnimationFrame(animate)
      }
      animFrameRef.current = requestAnimationFrame(animate)

      setIsLoaded(true)
    })

    mapRef.current = map
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Agent markers with type-specific icons + credibility rings
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return
    const map = mapRef.current

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    agents.forEach(agent => {
      const color = agentColor(agent)
      const name = agent.ensName.replace('.responsesurface.eth', '')
      const isFlagged = agent.status === 'flagged'
      const credColor = credibilityColor(agent.credibilityScore)
      const credPct = (agent.credibilityScore ?? 0) / 1000

      const iconSize = 22
      const ringSize = iconSize + 10 + Math.round(credPct * 8)

      const el = document.createElement('div')
      el.style.position = 'relative'
      el.style.width = `${ringSize}px`
      el.style.height = `${ringSize}px`
      el.style.cursor = 'pointer'

      const ring = document.createElement('div')
      ring.style.position = 'absolute'
      ring.style.inset = '0'
      ring.style.borderRadius = '50%'
      ring.style.border = `${1 + Math.round(credPct * 2.5)}px solid ${credColor}`
      ring.style.opacity = String(0.3 + credPct * 0.5)
      el.appendChild(ring)

      const iconWrapper = document.createElement('div')
      iconWrapper.style.position = 'absolute'
      iconWrapper.style.width = `${iconSize}px`
      iconWrapper.style.height = `${iconSize}px`
      iconWrapper.style.top = `${(ringSize - iconSize) / 2}px`
      iconWrapper.style.left = `${(ringSize - iconSize) / 2}px`
      iconWrapper.style.filter = `drop-shadow(0 0 4px ${color}80)`
      iconWrapper.innerHTML = agentIconSvg(name, color, iconSize)
      el.appendChild(iconWrapper)

      if (isFlagged) {
        ring.style.borderColor = '#ef4444'
        ring.style.animation = 'pulse-ring 1.5s ease-in-out infinite'
      }

      el.addEventListener('click', () => onAgentClick(agent.ensName))

      const credLabel = agent.credibilityScore !== undefined
        ? `<div style="margin-top:4px;display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:3px;background:#374151;border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${credPct * 100}%;background:${credColor};border-radius:2px"></div>
            </div>
            <span style="color:${credColor};font-size:10px;font-family:monospace">${agent.credibilityScore}/1000</span>
          </div>`
        : ''

      const dataSrcPills = agent.dataSources
        .map(ds => `<span style="font-size:9px;padding:1px 5px;background:${color}20;color:${color};border-radius:8px;border:1px solid ${color}30">${ds}</span>`)
        .join(' ')

      const popup = new mapboxgl.Popup({ offset: ringSize / 2 + 4, closeButton: false })
        .setHTML(`
          <div style="font-family:Inter,sans-serif;font-size:12px;color:#e5e7eb;background:#1f2937;padding:10px 14px;border-radius:8px;border:1px solid ${color}40;min-width:180px">
            <div style="font-weight:600;color:${color}">${agent.ensName}</div>
            <div style="margin-top:2px;opacity:0.7">${agent.role}${isFlagged ? ' — FLAGGED' : ''}</div>
            ${credLabel}
            <div style="margin-top:6px;display:flex;gap:3px;flex-wrap:wrap">${dataSrcPills}</div>
          </div>
        `)

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(agent.bioregion.center)
        .setPopup(popup)
        .addTo(map)

      markersRef.current.push(marker)
    })

    // Bioregion polygon fills — real geographic shapes
    const bioregionFeatures = agents
      .filter(a => BIOREGION_POLYGONS[a.ensName])
      .map(a => ({
        type: 'Feature' as const,
        properties: { color: agentColor(a), name: a.ensName },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [BIOREGION_POLYGONS[a.ensName]],
        },
      }))

    const bioSrc = map.getSource('bioregions') as mapboxgl.GeoJSONSource
    if (bioSrc) {
      bioSrc.setData({ type: 'FeatureCollection', features: bioregionFeatures })
    }

    // AXL arcs from agents to coordinator
    const coordinator = agents.find(a => a.role === 'coordinator')
    if (coordinator) {
      const arcFeatures = agents
        .filter(a => a.role !== 'coordinator')
        .map(a => ({
          type: 'Feature' as const,
          properties: {
            color: a.role === 'adversary' ? '#ef4444' : '#8b5cf6',
            from: a.ensName,
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: createArc(a.bioregion.center, coordinator.bioregion.center),
          },
        }))

      const arcSrc = map.getSource('axl-arcs') as mapboxgl.GeoJSONSource
      if (arcSrc) {
        arcSrc.setData({ type: 'FeatureCollection', features: arcFeatures })
      }
    }
  }, [isLoaded, agents, onAgentClick])

  // Disaster data — live from NASA EONET
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return
    const src = mapRef.current.getSource('disasters') as mapboxgl.GeoJSONSource
    if (!src) return

    src.setData({
      type: 'FeatureCollection',
      features: disasters.map(d => ({
        type: 'Feature' as const,
        properties: { id: d.id, title: d.title, category: d.category, severity: d.severity || 5 },
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

  // Allocation pulse animation
  const triggerAllocationPulse = useCallback(() => {
    if (!mapRef.current || !isLoaded) return
    const map = mapRef.current

    const totalAmount = allocations.reduce((s, a) => s + a.amount, 0n)
    const pulseFeatures = allocations.map(a => {
      const agent = agents.find(ag => ag.ensName === a.ensName)
      if (!agent) return null
      const share = totalAmount > 0n ? Number(a.amount) / Number(totalAmount) : 0
      return {
        type: 'Feature' as const,
        properties: { agent: a.ensName, color: agentColor(agent), share },
        geometry: { type: 'Point' as const, coordinates: agent.bioregion.center },
      }
    }).filter(Boolean)

    const pulseSrc = map.getSource('allocation-pulses') as mapboxgl.GeoJSONSource
    if (!pulseSrc) return
    pulseSrc.setData({ type: 'FeatureCollection', features: pulseFeatures as any })

    let radius = 10
    const expand = () => {
      radius += 1.2
      if (radius > 55) {
        map.setPaintProperty('allocation-pulse-ring', 'circle-stroke-opacity', 0)
        pulseSrc.setData({ type: 'FeatureCollection', features: [] })
        return
      }
      const opacity = Math.max(0, 0.7 * (1 - (radius - 10) / 45))
      map.setPaintProperty('allocation-pulse-ring', 'circle-radius', radius)
      map.setPaintProperty('allocation-pulse-ring', 'circle-stroke-opacity', opacity)
      requestAnimationFrame(expand)
    }
    map.setPaintProperty('allocation-pulse-ring', 'circle-stroke-opacity', 0.7)
    requestAnimationFrame(expand)
  }, [isLoaded, allocations, agents])

  useEffect(() => {
    if (allocations.length > 0 && allocations.length !== prevAllocCountRef.current) {
      prevAllocCountRef.current = allocations.length
      triggerAllocationPulse()
    }
  }, [allocations, triggerAllocationPulse])

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.15); }
        }
        .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { display: none !important; }
      `}</style>
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      {/* Map legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-[#0d1117]/90 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-[10px] space-y-1.5">
        <div className="text-[9px] text-gray-500 uppercase tracking-wider font-medium mb-2">Map Key</div>
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 20 20" className="shrink-0">
            <polygon points="10,3 17.7,13 2.3,13" fill="#ef4444" stroke="white" strokeWidth="1.5"/>
          </svg>
          <span className="text-gray-400">Wildfire / volcano — live NASA EONET</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 20 20" className="shrink-0">
            <polygon points="10,3 16,10 10,17 4,10" fill="#3b82f6" stroke="white" strokeWidth="1.5"/>
          </svg>
          <span className="text-gray-400">Flood / storm — live NASA EONET</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 20 20" className="shrink-0">
            <path d="M10 2C10 2 5 8 5 12C5 15.3 7.2 18 10 18C12.8 18 15 15.3 15 12C15 8 10 2 10 2Z" fill="#f97316" stroke="white" strokeWidth="1.2"/>
          </svg>
          <span className="text-gray-400">Agent — icon by type, ring = credibility score</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 20 20" className="shrink-0">
            <path d="M10 2L18 17H2L10 2Z" fill="#ef4444" stroke="white" strokeWidth="1.2"/>
          </svg>
          <span className="text-gray-400">Flagged adversarial agent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="shrink-0 border-t border-dashed border-purple-400/60" style={{ width: 12 }} />
          <span className="text-gray-400">AXL P2P mesh link (Ed25519)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2.5 rounded-sm shrink-0" style={{ background: 'rgba(249,115,22,0.1)', border: '1px dashed rgba(249,115,22,0.4)' }} />
          <span className="text-gray-400">Monitoring bioregion boundary</span>
        </div>
      </div>
    </>
  )
}
