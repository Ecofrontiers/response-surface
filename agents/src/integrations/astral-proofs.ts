const { AstralSDK } = require('@decentralized-geo/astral-sdk')
import type { Point, Polygon } from 'geojson'

const ASTRAL_API = process.env.ASTRAL_API || 'https://staging-api.astral.global'
const CHAIN_ID = Number(process.env.ASTRAL_CHAIN_ID) || 84532
const COMPUTE_SCHEMA_UID = process.env.ASTRAL_COMPUTE_SCHEMA || '0x0000000000000000000000000000000000000000000000000000000000000000'

export function createAstralClient(signer?: unknown) {
  return new AstralSDK({
    chainId: CHAIN_ID,
    apiUrl: ASTRAL_API,
    ...(signer ? { signer } : {}),
  })
}

export async function createOffchainAttestation(
  astral: any,
  location: unknown,
  memo?: string,
  recipient?: string,
) {
  return astral.location.offchain.create({
    location,
    memo,
    recipient,
    timestamp: new Date(),
  })
}

export async function verifyOffchainAttestation(
  astral: any,
  attestation: unknown,
) {
  return astral.location.offchain.verify(attestation)
}

export async function checkContainment(
  astral: any,
  disasterZonePolygon: Polygon,
  responderProofUid: string,
) {
  return astral.compute.contains(
    disasterZonePolygon,
    responderProofUid,
    { schema: COMPUTE_SCHEMA_UID },
  )
}

// Direct REST call to compute.contains — works without SDK signer
export async function checkContainmentREST(
  container: Polygon,
  containee: Point | string,
  schema?: string,
): Promise<{ result: boolean; attestation: unknown }> {
  const res = await fetch(`${ASTRAL_API}/compute/v0/contains`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      container,
      containee,
      chainId: CHAIN_ID,
      schema: schema || COMPUTE_SCHEMA_UID,
    }),
  })
  if (!res.ok) throw new Error(`Astral compute/contains error: ${res.status} ${await res.text()}`)
  return res.json()
}

// Location Proof v0.2 spec for the verify endpoint
export interface LocationProofV02 {
  claim: {
    lpVersion: '0.2'
    locationType: 'geojson'
    srs: 'EPSG:4326'
    location: Point | Polygon
    subject: { scheme: string; value: string }
    radius: number
    time: { start: number; end: number }
    altitude: number
  }
  evidence: { type: string; data: unknown }[]
  stamps: LocationStampV02[]
}

export interface LocationStampV02 {
  lpVersion: '0.2'
  locationType: 'geojson'
  srs: 'EPSG:4326'
  location: Point
  subject: { scheme: string; value: string }
  radius: number
  time: { start: number; end: number }
  altitude: number
  provider: string
  signature: string
}

export async function verifyProofViaREST(
  proof: LocationProofV02,
): Promise<{ credibility: number; details: unknown }> {
  const res = await fetch(`${ASTRAL_API}/verify/v0/proof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proof }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Astral verify/proof error: ${res.status} ${text.slice(0, 200)}`)
  }
  return res.json()
}

export async function verifyStampViaREST(
  stamp: LocationStampV02,
): Promise<{ valid: boolean; details: unknown }> {
  const res = await fetch(`${ASTRAL_API}/verify/v0/stamp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stamp }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Astral verify/stamp error: ${res.status} ${text.slice(0, 200)}`)
  }
  return res.json()
}

export async function getVerificationPlugins(): Promise<{ plugins: { name: string; version: string; description: string }[] }> {
  const res = await fetch(`${ASTRAL_API}/verify/v0/plugins`)
  if (!res.ok) throw new Error(`Astral plugins error: ${res.status}`)
  return res.json()
}

// Build a credibility score from available signals (used by coordinator)
// Proofs act as a multiplier — without verified proofs, containment alone
// is insufficient (public disaster coordinates are not a secret).
export function computeCredibilityScore(
  containmentResult: boolean,
  proofCount: number,
  severity: number,
): number {
  const containmentBase = containmentResult ? 400 : 0
  const severityBonus = Math.min(severity * 30, 300)
  const proofBonus = Math.min(proofCount * 150, 300)
  const rawScore = containmentBase + severityBonus + proofBonus

  // Proof multiplier: 0 proofs → 15% of raw score, each proof adds 28%
  const proofMultiplier = Math.min(0.15 + proofCount * 0.28, 1.0)
  return Math.min(Math.round(rawScore * proofMultiplier), 1000)
}
