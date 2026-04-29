import { useState, useRef } from 'react'
import type { ActivityEvent } from '../App'
import type { Agent, Disaster, Allocation } from '../types'

interface CycleSimulatorProps {
  agents: Agent[]
  disasters: Disaster[]
  cycleNumber: number
  onActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void
  onAllocations: (allocations: Allocation[]) => void
  onCycleAdvance: () => void
  onAgentUpdate: (ensName: string, updates: Partial<Agent>) => void
  onFundUpdate: (balance: bigint, allocated: bigint) => void
}

interface BackendEvent {
  type: 'system' | 'assessment' | 'proof' | 'allocation' | 'flag'
  agent?: string
  message: string
  timestamp: number
}

interface CycleResult {
  cycleNumber: number
  events: BackendEvent[]
  assessments: { agentEns: string; severity: number; proofDensity: number; credibility: number; disasterCount: number; speciesAtRisk: number }[]
  allocations: { ensName: string; amount: string; disasterId: string; timestamp: number; assessmentHash: string; teeVerified: boolean; credibility: number; share: number }[]
  teeVerified: boolean
  axlOnline: boolean
  ensGateActive: boolean
  ensUpdated: boolean
  storageUploaded: boolean
  fundBalance: string
  totalAllocated: string
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const PHASE_LABELS: Record<string, string> = {
  collecting: 'Querying NASA EONET, FIRMS, USGS, GBIF, AirNow, iNaturalist...',
  axl: 'Relaying assessments via AXL P2P mesh (Ed25519 authenticated)...',
  ens_gate: 'Reading ENS credibility text records on Sepolia...',
  credibility: 'Scoring: proofMultiplier = min(0.15 + proofs × 0.28, 1.0)...',
  tee: 'Running sealed inference in 0G Compute TEE...',
  allocating: 'Transferring fUSD on 0G Chain weighted by credibility...',
  storage: 'Writing immutable audit log to 0G Storage...',
  ens_write: 'Updating ENS text records with new credibility scores...',
  complete: '',
}

export default function CycleSimulator({
  agents,
  disasters,
  cycleNumber,
  onActivity,
  onAllocations,
  onCycleAdvance,
  onAgentUpdate,
  onFundUpdate,
}: CycleSimulatorProps) {
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState('')
  const [mode, setMode] = useState<'live' | 'offline' | ''>('')
  const cancelledRef = useRef(false)

  const playBackEvents = async (events: BackendEvent[]) => {
    for (const event of events) {
      if (cancelledRef.current) return

      if (event.type === 'system' && event.message.startsWith('AXL')) setPhase(PHASE_LABELS.axl)
      else if (event.type === 'system' && event.message.startsWith('ENS gate')) setPhase(PHASE_LABELS.ens_gate)
      else if (event.type === 'system' && event.message.startsWith('0G Compute')) setPhase(PHASE_LABELS.tee)
      else if (event.type === 'system' && event.message.startsWith('0G Chain')) setPhase(PHASE_LABELS.allocating)
      else if (event.type === 'system' && event.message.startsWith('0G Storage')) setPhase(PHASE_LABELS.storage)
      else if (event.type === 'system' && event.message.startsWith('ENS write')) setPhase(PHASE_LABELS.ens_write)
      else if (event.type === 'assessment') setPhase(PHASE_LABELS.collecting)

      onActivity({ type: event.type, agent: event.agent, message: event.message })

      const delayMs = event.type === 'assessment' ? 500
        : event.type === 'allocation' ? 400
        : event.type === 'flag' ? 600
        : 300
      await delay(delayMs)
    }
  }

  const runCycleLive = async () => {
    setPhase(PHASE_LABELS.collecting)
    setMode('live')

    const res = await fetch('/api/cycle/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycleNumber }),
    })

    if (!res.ok) throw new Error(`Backend returned ${res.status}`)
    const result: CycleResult = await res.json()

    await playBackEvents(result.events)

    for (const a of result.assessments) {
      onAgentUpdate(a.agentEns, { credibilityScore: a.credibility })
    }

    const newAllocations: Allocation[] = result.allocations.map(a => ({
      agent: a.ensName,
      ensName: a.ensName,
      amount: BigInt(a.amount),
      disasterId: a.disasterId,
      timestamp: a.timestamp,
      assessmentHash: a.assessmentHash,
      teeVerified: a.teeVerified,
    }))

    onAllocations(newAllocations)

    const fundPool = 10000000000000000000n
    const totalAllocated = newAllocations.reduce((s, a) => s + a.amount, 0n)
    const balance = result.fundBalance ? BigInt(result.fundBalance) : fundPool - totalAllocated
    onFundUpdate(balance > 0n ? balance : fundPool - totalAllocated, totalAllocated)
  }

  const runCycleOffline = async () => {
    setPhase(PHASE_LABELS.collecting)
    setMode('offline')
    onActivity({ type: 'system', message: `── Cycle ${cycleNumber} starting (LOCAL — backend not running on :3001) ──` })
    onActivity({ type: 'system', message: 'Running same credibility algorithm locally. Start backend for real API data + onchain txns.' })
    await delay(600)

    const fundPool = 10000000000000000000n
    const assessmentAgents = agents.filter(a => a.role === 'agent' || a.role === 'adversary')
    const scored: { ensName: string; severity: number; proofCount: number; credibility: number; weight: number }[] = []

    for (const agent of assessmentAgents) {
      if (cancelledRef.current) return
      const isRogue = agent.role === 'adversary'
      const severity = isRogue ? 9 : Math.floor(Math.random() * 5) + 4
      const proofCount = isRogue ? 0 : Math.floor(Math.random() * 3) + 2
      const containmentBase = 400
      const severityBonus = Math.min(severity * 30, 300)
      const proofBonus = Math.min(proofCount * 150, 300)
      const raw = containmentBase + severityBonus + proofBonus
      const mult = Math.min(0.15 + proofCount * 0.28, 1.0)
      const credibility = Math.min(Math.round(raw * mult), 1000)

      scored.push({ ensName: agent.ensName, severity, proofCount, credibility, weight: credibility * severity })
      onActivity({ type: 'assessment', agent: agent.ensName, message: `${agent.ensName} submits assessment (severity ${severity}, ${proofCount} proofs) [LOCAL]` })
      await delay(400)
    }

    setPhase(PHASE_LABELS.credibility)
    for (const s of scored) {
      if (cancelledRef.current) return
      const isRogue = s.proofCount === 0
      onActivity({ type: isRogue ? 'flag' : 'proof', agent: s.ensName, message: `${s.ensName}: credibility ${s.credibility}/1000${isRogue ? ' — no verified proofs' : ''} [LOCAL]` })
      onAgentUpdate(s.ensName, { credibilityScore: s.credibility })
      await delay(300)
    }

    setPhase(PHASE_LABELS.allocating)
    onActivity({ type: 'system', message: '0G Compute: TEE unavailable — offline credibility-weighted allocation' })
    await delay(400)

    const totalWeight = scored.reduce((s, a) => s + a.weight, 0)
    const newAllocations: Allocation[] = scored.map(s => {
      const share = totalWeight > 0 ? s.weight / totalWeight : 0
      return {
        agent: s.ensName,
        ensName: s.ensName,
        amount: BigInt(Math.floor(Number(fundPool) * share)),
        disasterId: disasters[0]?.id || 'sim',
        timestamp: Date.now(),
        assessmentHash: `0x${Math.random().toString(16).slice(2, 18)}`,
        teeVerified: false,
      }
    })

    for (const alloc of newAllocations) {
      if (cancelledRef.current) return
      const pct = ((Number(alloc.amount) / Number(fundPool)) * 100).toFixed(1)
      const isRogue = agents.find(a => a.ensName === alloc.ensName)?.role === 'adversary'
      onActivity({ type: 'allocation', agent: alloc.ensName, message: `${alloc.ensName}: ${pct}% of fund${isRogue ? ' (reduced by credibility gate)' : ''} [LOCAL]` })
      await delay(300)
    }

    onAllocations(newAllocations)
    const totalAllocated = newAllocations.reduce((s, a) => s + a.amount, 0n)
    onFundUpdate(fundPool - totalAllocated, totalAllocated)

    onActivity({ type: 'system', message: `── Cycle ${cycleNumber} complete (LOCAL) ──` })
  }

  const runCycle = async () => {
    if (running || disasters.length === 0) return
    setRunning(true)
    cancelledRef.current = false

    try {
      await runCycleLive()
    } catch {
      await runCycleOffline()
    }

    onCycleAdvance()
    setPhase('')
    setMode('')
    setRunning(false)
  }

  return (
    <div>
      {phase && (
        <div className="mb-3 px-3 py-2 bg-white/[0.03] border border-white/5 rounded-lg text-xs flex items-center gap-2">
          {mode === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
          {mode === 'offline' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
          <span className={mode === 'offline' ? 'text-amber-400' : 'text-cyan-400'}>
            {phase}
          </span>
          {mode === 'offline' && <span className="text-[9px] text-amber-500/70 ml-auto shrink-0">LOCAL</span>}
        </div>
      )}
      <button
        onClick={runCycle}
        disabled={running || disasters.length === 0}
        className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
          disasters.length === 0
            ? 'opacity-40 cursor-not-allowed bg-gray-500/20 text-gray-500 border border-gray-500/20'
            : running
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 cursor-wait'
            : 'bg-cyan-500 text-gray-900 hover:bg-cyan-400 cursor-pointer shadow-lg shadow-cyan-500/20'
        }`}
      >
        {running ? 'Running Cycle...' : `Run Allocation Cycle ${cycleNumber}`}
      </button>
    </div>
  )
}
