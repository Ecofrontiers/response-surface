import { useState, useRef } from 'react'
import type { ActivityEvent } from '../App'
import type { Agent, Disaster, Allocation, CycleMapState } from '../types'

interface CycleSimulatorProps {
  agents: Agent[]
  disasters: Disaster[]
  cycleNumber: number
  onActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void
  onAllocations: (allocations: Allocation[]) => void
  onCycleAdvance: () => void
  onAgentUpdate: (ensName: string, updates: Partial<Agent>) => void
  onFundUpdate: (balance: bigint, allocated: bigint) => void
  onMapState?: (state: CycleMapState) => void
}

interface BackendEvent {
  type: 'system' | 'assessment' | 'proof' | 'allocation' | 'flag'
  agent?: string
  message: string
  timestamp: number
  links?: { label: string; url: string }[]
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

const PHASES = [
  { key: 'collecting', label: 'COLLECT', color: 'var(--status-critical)' },
  { key: 'axl', label: 'AXL', color: 'var(--viz-3)' },
  { key: 'ens_gate', label: 'ENS', color: 'var(--status-standby)' },
  { key: 'credibility', label: 'SCORE', color: 'var(--status-serious)' },
  { key: 'tee', label: 'TEE', color: 'var(--status-serious)' },
  { key: 'allocating', label: 'FUND', color: 'var(--status-normal)' },
  { key: 'storage', label: 'AUDIT', color: 'var(--status-serious)' },
  { key: 'ens_write', label: 'WRITE', color: 'var(--status-standby)' },
]

function phaseIndex(key: string): number {
  return PHASES.findIndex(p => p.key === key)
}

export default function CycleSimulator({
  agents, disasters, cycleNumber, onActivity, onAllocations, onCycleAdvance, onAgentUpdate, onFundUpdate, onMapState,
}: CycleSimulatorProps) {
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState('')
  const [mode, setMode] = useState<'live' | 'offline' | ''>('')
  const cancelledRef = useRef(false)

  const emitMap = (phase: string, activeAgent?: string, allocationShares: Record<string, number> = {}) => {
    onMapState?.({ phase, activeAgent, allocationShares })
  }

  const playBackEvents = async (events: BackendEvent[], allocShares: Record<string, number>) => {
    for (const event of events) {
      if (cancelledRef.current) return

      if (event.type === 'assessment') {
        setPhase('collecting')
        emitMap('collecting', event.agent)
      } else if (event.type === 'system' && event.message.startsWith('AXL')) {
        setPhase('axl')
        emitMap('axl')
      } else if (event.type === 'system' && event.message.startsWith('ENS') && !event.message.includes('updated')) {
        setPhase('ens_gate')
        emitMap('ens_gate')
      } else if (event.type === 'proof' || event.type === 'flag') {
        setPhase('credibility')
        emitMap('credibility', event.agent)
      } else if (event.type === 'system' && event.message.startsWith('0G Compute')) {
        setPhase('tee')
        emitMap('tee')
      } else if (event.type === 'allocation') {
        setPhase('allocating')
        emitMap('allocating', event.agent, allocShares)
      } else if (event.type === 'system' && event.message.startsWith('ResponseFund')) {
        setPhase('allocating')
        emitMap('allocating', undefined, allocShares)
      } else if (event.type === 'system' && event.message.startsWith('0G Storage')) {
        setPhase('storage')
        emitMap('storage', undefined, allocShares)
      } else if (event.type === 'system' && event.message.includes('ENS updated')) {
        setPhase('ens_write')
        emitMap('ens_write', event.agent, allocShares)
      }

      onActivity({ type: event.type, agent: event.agent, message: event.message, links: event.links })
      const d = event.type === 'assessment' ? 1500
        : event.type === 'allocation' ? 1200
        : event.type === 'flag' ? 1800
        : event.type === 'proof' ? 1000
        : event.message.startsWith('AXL') ? 2500
        : event.message.startsWith('0G Compute') ? 3000
        : event.message.startsWith('0G Storage') ? 2000
        : 800
      await delay(d)
    }
  }

  const runCycleLive = async () => {
    setPhase('collecting')
    setMode('live')
    emitMap('collecting')
    const res = await fetch('/api/cycle/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycleNumber }),
    })
    if (!res.ok) throw new Error(`Backend returned ${res.status}`)
    const result: CycleResult = await res.json()

    const allocShares: Record<string, number> = {}
    result.allocations.forEach(a => { allocShares[a.ensName] = a.share })

    await playBackEvents(result.events, allocShares)
    for (const a of result.assessments) onAgentUpdate(a.agentEns, { credibilityScore: a.credibility })
    const newAllocations: Allocation[] = result.allocations.map(a => ({
      agent: a.ensName, ensName: a.ensName, amount: BigInt(a.amount),
      disasterId: a.disasterId, timestamp: a.timestamp,
      assessmentHash: a.assessmentHash, teeVerified: a.teeVerified,
    }))
    onAllocations(newAllocations)
    const totalAllocated = result.totalAllocated ? BigInt(result.totalAllocated) : newAllocations.reduce((s, a) => s + a.amount, 0n)
    const balance = result.fundBalance ? BigInt(result.fundBalance) : 10000000000000000000n - totalAllocated
    onFundUpdate(balance > 0n ? balance : 0n, totalAllocated)
  }

  const runCycleOffline = async () => {
    setPhase('collecting')
    setMode('offline')
    emitMap('collecting')
    onActivity({ type: 'system', message: `Cycle ${cycleNumber} (LOCAL)` })
    await delay(600)
    const fundPool = 10000000000000000000n
    const assessmentAgents = agents.filter(a => a.role === 'agent' || a.role === 'adversary')
    const scored: { ensName: string; severity: number; proofCount: number; credibility: number; weight: number }[] = []
    for (const agent of assessmentAgents) {
      if (cancelledRef.current) return
      const isRogue = agent.role === 'adversary'
      const severity = isRogue ? 9 : Math.floor(Math.random() * 5) + 4
      const proofCount = isRogue ? 0 : Math.floor(Math.random() * 3) + 2
      const raw = 400 + Math.min(severity * 30, 300) + Math.min(proofCount * 150, 300)
      const mult = Math.min(0.15 + proofCount * 0.28, 1.0)
      const credibility = Math.min(Math.round(raw * mult), 1000)
      scored.push({ ensName: agent.ensName, severity, proofCount, credibility, weight: credibility * severity })
      emitMap('collecting', agent.ensName)
      onActivity({ type: 'assessment', agent: agent.ensName, message: `${agent.ensName}: severity ${severity}, ${proofCount} proofs` })
      await delay(1500)
    }

    setPhase('axl')
    emitMap('axl')
    onActivity({ type: 'system', message: 'AXL offline — local relay' })
    await delay(2500)

    setPhase('ens_gate')
    emitMap('ens_gate')
    await delay(800)

    setPhase('credibility')
    for (const s of scored) {
      if (cancelledRef.current) return
      const isRogue = s.proofCount === 0
      emitMap('credibility', s.ensName)
      onActivity({ type: isRogue ? 'flag' : 'proof', agent: s.ensName, message: `${s.ensName}: credibility ${s.credibility}/1000${isRogue ? ' — 0 proofs' : ''}` })
      onAgentUpdate(s.ensName, { credibilityScore: s.credibility })
      await delay(isRogue ? 1800 : 1000)
    }

    setPhase('tee')
    emitMap('tee')
    onActivity({ type: 'system', message: 'TEE unavailable — local allocation' })
    await delay(3000)

    setPhase('allocating')
    const totalWeight = scored.reduce((s, a) => s + a.weight, 0)
    const newAllocations: Allocation[] = scored.map(s => ({
      agent: s.ensName, ensName: s.ensName,
      amount: BigInt(Math.floor(Number(fundPool) * (totalWeight > 0 ? s.weight / totalWeight : 0))),
      disasterId: disasters[0]?.id || 'sim', timestamp: Date.now(),
      assessmentHash: `0x${Math.random().toString(16).slice(2, 18)}`, teeVerified: false,
    }))
    const allocShares: Record<string, number> = {}
    const totalAmount = newAllocations.reduce((s, a) => s + a.amount, 0n)
    newAllocations.forEach(a => { allocShares[a.ensName] = totalAmount > 0n ? Number(a.amount) / Number(totalAmount) : 0 })

    for (const alloc of newAllocations) {
      if (cancelledRef.current) return
      const pct = ((Number(alloc.amount) / Number(fundPool)) * 100).toFixed(1)
      const isRogue = agents.find(a => a.ensName === alloc.ensName)?.role === 'adversary'
      emitMap('allocating', alloc.ensName, allocShares)
      onActivity({ type: 'allocation', agent: alloc.ensName, message: `${alloc.ensName}: ${pct}%${isRogue ? ' (gated)' : ''}` })
      await delay(1200)
    }
    onAllocations(newAllocations)
    const totalAllocated = newAllocations.reduce((s, a) => s + a.amount, 0n)
    onFundUpdate(fundPool - totalAllocated, totalAllocated)

    setPhase('storage')
    emitMap('storage', undefined, allocShares)
    onActivity({ type: 'system', message: '0G Storage — audit log committed locally' })
    await delay(2000)

    setPhase('ens_write')
    for (const s of scored) {
      if (cancelledRef.current) return
      emitMap('ens_write', s.ensName, allocShares)
      onActivity({ type: 'system', message: `ENS updated — ${s.ensName.split('.')[0]} credibility → ${s.credibility}/1000` })
      await delay(800)
    }

    onActivity({ type: 'system', message: `Cycle ${cycleNumber} complete` })
  }

  const runCycle = async () => {
    if (running || disasters.length === 0) return
    setRunning(true)
    cancelledRef.current = false
    try { await runCycleLive() } catch { await runCycleOffline() }
    emitMap('complete')
    await delay(2000)
    emitMap('idle')
    onCycleAdvance()
    setPhase('')
    setMode('')
    setRunning(false)
  }

  const activeIdx = phaseIndex(phase)

  return (
    <div>
      {/* Phase stepper */}
      {phase && (
        <div className="mb-3 p-2 rounded-[var(--radius)] border border-[var(--border-default)] bg-[var(--color-header)]">
          <div className="flex items-center gap-px mb-1.5">
            {PHASES.map((p, i) => {
              const isDone = i < activeIdx
              const isActive = i === activeIdx
              return (
                <div key={p.key} className="flex-1 h-1 rounded-[1px]" style={{
                  background: isDone ? 'var(--status-normal)' : isActive ? p.color : 'var(--border-default)',
                  opacity: isDone ? 0.5 : isActive ? 1 : 0.3,
                }} />
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-[6px] h-[6px] rounded-full ${mode === 'live' ? 'status-glow-normal' : ''}`}
              style={{ background: mode === 'live' ? 'var(--status-normal)' : 'var(--status-serious)' }} />
            <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">
              {PHASES[activeIdx]?.label}
            </span>
            {mode === 'offline' && <span className="text-[9px] ml-auto font-[var(--font-mono)]" style={{ color: 'var(--status-serious)' }}>LOCAL</span>}
          </div>
        </div>
      )}

      {/* CTA — Astro interactive blue */}
      <button
        onClick={runCycle}
        disabled={running || disasters.length === 0}
        className={`w-full px-4 py-2.5 rounded-[var(--radius)] text-[12px] font-medium uppercase tracking-wider transition-all ${
          disasters.length === 0
            ? 'opacity-30 cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-placeholder)] border border-[var(--border-default)]'
            : running
            ? 'cursor-wait text-[var(--color-interactive)] border border-[var(--color-interactive-muted)]'
            : 'cursor-pointer text-[var(--color-text-inverse)] border border-[var(--color-interactive)] hover:brightness-110'
        }`}
        style={!running && disasters.length > 0 ? {
          background: 'var(--color-interactive)',
          boxShadow: '0 0 12px rgba(77, 172, 255, 0.3)',
        } : running ? {
          background: 'rgba(77, 172, 255, 0.12)',
        } : undefined}
      >
        {running ? 'Running...' : `Run Cycle ${cycleNumber}`}
      </button>
    </div>
  )
}
