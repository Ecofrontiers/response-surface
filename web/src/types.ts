export interface Agent {
  ensName: string
  role: 'agent' | 'responder' | 'coordinator' | 'adversary'
  bioregion: {
    bbox: { west: number; south: number; east: number; north: number }
    center: [number, number]
  }
  dataSources: string[]
  axlPubkey: string
  status: 'active' | 'idle' | 'error' | 'flagged'
  credibilityScore?: number
}

export interface Disaster {
  id: string
  title: string
  category: string
  geometry: GeoJSON.Geometry
  severity: number
}

export interface Allocation {
  agent: string
  ensName: string
  amount: bigint
  disasterId: string
  timestamp: number
  assessmentHash: string
  teeVerified: boolean
}

export interface Proof {
  responderEns: string
  agentEns: string
  location: GeoJSON.Point
  credibilityScore: number
  disasterId: string
  timestamp: number
  proofHash: string
}

export interface CycleMapState {
  phase: string
  activeAgent?: string
  allocationShares: Record<string, number>
}

export interface AgentMessage {
  id: string
  timestamp: number
  sender: string
  receiver?: string
  content: string
  phase: string
  type: 'report' | 'relay' | 'query' | 'result' | 'alert'
}
