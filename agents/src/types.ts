export interface BBox {
  west: number
  south: number
  east: number
  north: number
}

export interface EONETEvent {
  id: string
  title: string
  categories: { id: string; title: string }[]
  geometry: { date: string; type: string; coordinates: number[] }[]
}

export interface FireHotspot {
  latitude: number
  longitude: number
  brightness: number
  confidence: string
  acq_date: string
  acq_time: string
  frp: number
}

export interface GBIFOccurrence {
  key: number
  species: string
  decimalLatitude: number
  decimalLongitude: number
  eventDate: string
  basisOfRecord: string
  iucnRedListCategory?: string
}

export interface AQIReading {
  DateObserved: string
  HourObserved: number
  ParameterName: string
  AQI: number
  Category: { Number: number; Name: string }
  ReportingArea: string
  StateCode: string
}

export interface USGSSite {
  siteCode: string
  siteName: string
  latitude: number
  longitude: number
  parameters: { code: string; name: string; value: number; unit: string; dateTime: string }[]
}

export interface INatObservation {
  id: number
  species_guess: string
  taxon: { name: string; preferred_common_name: string; threatened: boolean } | null
  location: string
  observed_on: string
  photos: { url: string }[]
  quality_grade: 'research' | 'needs_id' | 'casual'
}

export interface AgentAssessment {
  agentEns: string
  bioregion: { bbox: BBox; center: [number, number] }
  disasters: EONETEvent[]
  severity: number
  speciesAtRisk: GBIFOccurrence[]
  needsAssessment: {
    capital: number
    labor: number
    compute: number
    data: number
  }
  proofDensity: number
  timestamp: string
}

export interface AllocationPlan {
  plan: { zones: { disasterId: string; ensName: string; amount: string; rationale: string }[] }
  teeVerified: boolean
  chatID: string
}

export interface AgentMetadata {
  description: string
  bounds: string
  dataSources: string[]
  axlPubkey: string
  role: 'agent' | 'responder' | 'coordinator'
  zgAddress?: string
}

export interface CredibilityRecord {
  score: number
  totalProofs: number
}

export interface AuditEntry {
  type: 'assessment' | 'allocation' | 'proof'
  agentEns: string
  data: unknown
  cycleNumber: number
}
