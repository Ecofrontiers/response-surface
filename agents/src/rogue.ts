import 'dotenv/config'
import { AXLClient } from './integrations/axl-client'
import { getActiveDisasters } from './services/nasa-eonet'
import {
  checkContainmentREST,
  verifyProofViaREST,
  computeCredibilityScore,
  type LocationProofV02,
} from './integrations/astral-proofs'
import type { AgentAssessment, EONETEvent } from './types'

const AXL_PORT = 9032
const ROGUE_ENS = 'rogue.responsesurface.eth'

function fabricateProof(coords: [number, number]): LocationProofV02 {
  const now = Math.floor(Date.now() / 1000)
  return {
    claim: {
      lpVersion: '0.2',
      locationType: 'geojson',
      srs: 'EPSG:4326',
      location: { type: 'Point', coordinates: coords },
      subject: { scheme: 'ethereum', value: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' },
      radius: 10,
      time: { start: now - 3600, end: now },
      altitude: 0,
    },
    evidence: [{ type: 'self-attestation', data: { note: 'Trust me bro' } }],
    stamps: [
      {
        lpVersion: '0.2',
        locationType: 'geojson',
        srs: 'EPSG:4326',
        location: { type: 'Point', coordinates: coords },
        subject: { scheme: 'ethereum', value: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' },
        radius: 10,
        time: { start: now - 3600, end: now },
        altitude: 0,
        provider: 'self',
        signature: '0xfabricated00000000000000000000000000000000000000000000000000000000',
      },
    ],
  }
}

function fabricateAssessment(disaster: EONETEvent, coords: [number, number]): AgentAssessment {
  return {
    agentEns: ROGUE_ENS,
    bioregion: {
      bbox: { west: coords[0] - 1, south: coords[1] - 1, east: coords[0] + 1, north: coords[1] + 1 },
      center: coords,
    },
    disasters: [disaster],
    severity: 9,
    speciesAtRisk: [],
    needsAssessment: { capital: 9000, labor: 45, compute: 3, data: 2 },
    proofDensity: 5,
    timestamp: new Date().toISOString(),
  }
}

async function runRogue() {
  console.log(`[${ROGUE_ENS}] ADVERSARIAL AGENT starting`)
  console.log(`[${ROGUE_ENS}] Strategy: hijack real disasters, fabricate location proofs, inflate severity`)

  const axl = new AXLClient(`http://127.0.0.1:${AXL_PORT}`)
  let coordinatorPeerId = ''

  try {
    const topo = await axl.getTopology()
    coordinatorPeerId = topo.peers[0]?.peerId || ''
    console.log(`[${ROGUE_ENS}] Connected to AXL mesh`)
  } catch {
    console.warn(`[${ROGUE_ENS}] AXL not available — running in standalone demo mode`)
  }

  console.log(`\n[${ROGUE_ENS}] === PHASE 1: Reconnaissance ===`)
  const disasters = await getActiveDisasters(undefined, 5)
  console.log(`[${ROGUE_ENS}] Found ${disasters.length} real disasters to exploit`)

  if (disasters.length === 0) {
    console.log(`[${ROGUE_ENS}] No disasters to exploit. Exiting.`)
    return
  }

  const target = disasters[0]
  const realCoords = target.geometry[target.geometry.length - 1]?.coordinates as [number, number]
  console.log(`[${ROGUE_ENS}] Target: "${target.title}"`)
  console.log(`[${ROGUE_ENS}] Real coordinates: [${realCoords[0].toFixed(2)}, ${realCoords[1].toFixed(2)}]`)

  console.log(`\n[${ROGUE_ENS}] === PHASE 2: Spatial Containment Attack ===`)
  console.log(`[${ROGUE_ENS}] Fabricating a disaster zone polygon around the real event...`)

  const polygon = {
    type: 'Polygon' as const,
    coordinates: [[
      [realCoords[0] - 2, realCoords[1] - 2],
      [realCoords[0] + 2, realCoords[1] - 2],
      [realCoords[0] + 2, realCoords[1] + 2],
      [realCoords[0] - 2, realCoords[1] + 2],
      [realCoords[0] - 2, realCoords[1] - 2],
    ]],
  }

  const claimedPoint = { type: 'Point' as const, coordinates: realCoords }

  try {
    const containment = await checkContainmentREST(polygon, claimedPoint)
    console.log(`[${ROGUE_ENS}] Containment check: ${containment.result}`)
    console.log(`[${ROGUE_ENS}] ⚠ Spatial containment PASSES — point is inside the real disaster zone`)
    console.log(`[${ROGUE_ENS}] This is expected: the rogue agent claims to be at the real location`)
  } catch (e) {
    console.log(`[${ROGUE_ENS}] Containment check failed: ${(e as Error).message}`)
  }

  console.log(`\n[${ROGUE_ENS}] === PHASE 3: Proof Fabrication Attack ===`)
  console.log(`[${ROGUE_ENS}] Creating a fake LocationProof v0.2 with self-signed stamps...`)

  const fakeProof = fabricateProof(realCoords)

  try {
    const verification = await verifyProofViaREST(fakeProof)
    console.log(`[${ROGUE_ENS}] Verification result: credibility=${verification.credibility}`)
    console.log(`[${ROGUE_ENS}] Details: ${JSON.stringify(verification.details).slice(0, 200)}`)

    if (verification.credibility < 100) {
      console.log(`[${ROGUE_ENS}] ✗ CAUGHT — Astral rejected the fabricated proof (credibility: ${verification.credibility}/1000)`)
    } else {
      console.log(`[${ROGUE_ENS}] ✓ Proof accepted (unexpected — investigate stamp validation)`)
    }
  } catch (e) {
    const msg = (e as Error).message
    console.log(`[${ROGUE_ENS}] ✗ CAUGHT — Astral threw: ${msg.slice(0, 200)}`)
    console.log(`[${ROGUE_ENS}] The verification API rejects proofs with unrecognized stamp providers`)
  }

  console.log(`\n[${ROGUE_ENS}] === PHASE 4: Credibility Score Impact ===`)

  const honestScore = computeCredibilityScore(true, 3, 7)
  console.log(`[${ROGUE_ENS}] Honest agent score:  ${honestScore}/1000 (containment=true, proofs=3, severity=7)`)

  const rogueScore = computeCredibilityScore(true, 0, 9)
  console.log(`[${ROGUE_ENS}] Rogue agent score:   ${rogueScore}/1000 (containment=true, proofs=0, severity=9)`)

  const rogueNoContain = computeCredibilityScore(false, 0, 9)
  console.log(`[${ROGUE_ENS}] Rogue (no contain):  ${rogueNoContain}/1000 (containment=false, proofs=0, severity=9)`)

  console.log(`\n[${ROGUE_ENS}] The rogue has high severity but ZERO verified proofs.`)
  console.log(`[${ROGUE_ENS}] Honest: ${honestScore} vs Rogue: ${rogueScore} — ${((honestScore - rogueScore) / honestScore * 100).toFixed(0)}% advantage for honest agents`)

  console.log(`\n[${ROGUE_ENS}] === PHASE 5: Attempting Fund Allocation ===`)
  const assessment = fabricateAssessment(target, realCoords)
  console.log(`[${ROGUE_ENS}] Fabricated assessment: severity=${assessment.severity}, proofDensity=${assessment.proofDensity}`)

  if (coordinatorPeerId) {
    try {
      await axl.send(coordinatorPeerId, Buffer.from(JSON.stringify(assessment)))
      console.log(`[${ROGUE_ENS}] Sent fraudulent assessment to coordinator`)
    } catch (e) {
      console.log(`[${ROGUE_ENS}] AXL send failed: ${(e as Error).message}`)
    }
  }

  console.log(`\n[${ROGUE_ENS}] The coordinator will:`)
  console.log(`  1. See severity=9 (inflated) but proofDensity=5 (fabricated)`)
  console.log(`  2. Query Astral to verify proofs → will find ZERO verified stamps`)
  console.log(`  3. Compute credibility: ${rogueScore}/1000 (${((1 - rogueScore / honestScore) * 100).toFixed(0)}% less credible than honest agents)`)
  console.log(`  4. Allocation weighted by credibility → rogue gets near-zero funding`)
  console.log(`  5. ENS credibility record updated: rogue.responsesurface.eth score=${rogueScore}`)

  console.log(`\n[${ROGUE_ENS}] === ATTACK SUMMARY ===`)
  console.log(`  ✓ Spatial containment: PASSED (rogue used real disaster coordinates)`)
  console.log(`  ✗ Proof verification:  FAILED (Astral rejects fabricated stamps)`)
  console.log(`  ✗ Credibility score:   ${rogueScore}/1000 (honest agents: ${honestScore}/1000)`)
  console.log(`  ✗ Fund allocation:     NEAR-ZERO (weighted by credibility)`)
  console.log(`  ✗ On-chain record:     Permanent low credibility in ENS text records`)
  console.log(`\n  Response Surface's multi-layer defense prevents fund theft even when`)
  console.log(`  the attacker has real disaster data and passes basic spatial checks.`)
}

runRogue().catch(console.error)
