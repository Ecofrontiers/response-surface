import { useState, useRef } from 'react'
import type { ActivityEvent } from '../App'
import type { Agent, Disaster, Allocation, Proof, CycleMapState, AgentMessage } from '../types'

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
  onMessage?: (msg: AgentMessage) => void
  onProofs?: (proofs: Proof[]) => void
}

const EVIDENCE_MAP: Record<string, { file: string; type: string; coords: [number, number]; zone: string }> = {
  'pacific.responsesurface.eth': { file: 'wildfire_01.webp', type: 'Wildfire', coords: [-121.3, 39.8], zone: 'California foothills' },
  'mountain.responsesurface.eth': { file: 'wildfire_02.webp', type: 'Wildfire', coords: [-110.5, 44.2], zone: 'Yellowstone perimeter' },
  'central.responsesurface.eth': { file: 'storm_01.webp', type: 'Storm damage', coords: [-97.4, 38.5], zone: 'Kansas tornado corridor' },
  'lakes.responsesurface.eth': { file: 'flood_01.webp', type: 'Flood', coords: [-87.6, 42.1], zone: 'Lake Michigan shore' },
  'delta.responsesurface.eth': { file: 'flood_02.webp', type: 'Flood', coords: [-90.2, 32.4], zone: 'Mississippi basin' },
  'gulf.responsesurface.eth': { file: 'wildfire_01.webp', type: 'Wildfire', coords: [-97.8, 31.5], zone: 'Texas brush country' },
  'atlantic.responsesurface.eth': { file: 'storm_02.webp', type: 'Storm', coords: [-76.3, 36.8], zone: 'Carolina coast' },
  'northeast.responsesurface.eth': { file: 'storm_01.webp', type: 'Storm', coords: [-72.1, 43.2], zone: 'Vermont highlands' },
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
  allocations: { ensName: string; amount: string; disasterId: string; timestamp: number; assessmentHash: string; teeVerified: boolean; credibility: number; share: number; disasterCount?: number; proofDensity?: number; weight?: number; severity?: number }[]
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
  agents, disasters, cycleNumber, onActivity, onAllocations, onCycleAdvance, onAgentUpdate, onFundUpdate, onMapState, onMessage, onProofs,
}: CycleSimulatorProps) {
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState('')
  const [error, setError] = useState('')
  const cancelledRef = useRef(false)

  const emitMap = (phase: string, activeAgent?: string, allocationShares: Record<string, number> = {}) => {
    onMapState?.({ phase, activeAgent, allocationShares })
  }

  const emitMsg = (sender: string, content: string, phase: string, type: AgentMessage['type'], receiver?: string) => {
    onMessage?.({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      sender,
      receiver,
      content,
      phase,
      type,
    })
  }

  const playBackEvents = async (events: BackendEvent[], allocShares: Record<string, number>) => {
    let currentMsgPhase = 'COLLECT'
    for (const event of events) {
      if (cancelledRef.current) return

      if (event.type === 'assessment') {
        setPhase('collecting')
        emitMap('collecting', event.agent)
        currentMsgPhase = 'COLLECT'
        if (event.agent) emitMsg(event.agent, event.message.replace(`${event.agent}: `, ''), currentMsgPhase, 'report', 'coordinator.responsesurface.eth')
      } else if (event.type === 'system' && event.message.startsWith('AXL')) {
        setPhase('axl')
        emitMap('axl')
        currentMsgPhase = 'AXL'
        emitMsg('coordinator.responsesurface.eth', event.message, currentMsgPhase, 'relay')
      } else if (event.type === 'system' && event.message.startsWith('ENS') && !event.message.includes('updated')) {
        setPhase('ens_gate')
        emitMap('ens_gate')
        currentMsgPhase = 'ENS GATE'
        emitMsg('coordinator.responsesurface.eth', event.message, currentMsgPhase, 'query')
      } else if (event.type === 'proof' || event.type === 'flag') {
        setPhase('credibility')
        emitMap('credibility', event.agent)
        currentMsgPhase = 'SCORE'
        emitMsg('coordinator.responsesurface.eth', event.message, currentMsgPhase, event.type === 'flag' ? 'alert' : 'result')
      } else if (event.type === 'system' && event.message.startsWith('0G Compute')) {
        setPhase('tee')
        emitMap('tee')
        currentMsgPhase = 'TEE'
        emitMsg('coordinator.responsesurface.eth', event.message, currentMsgPhase, 'query', '0G Compute')
      } else if (event.type === 'allocation') {
        setPhase('allocating')
        emitMap('allocating', event.agent, allocShares)
        currentMsgPhase = 'FUND'
        emitMsg('coordinator.responsesurface.eth', event.message, currentMsgPhase, 'result')
      } else if (event.type === 'system' && event.message.startsWith('ResponseFund')) {
        setPhase('allocating')
        emitMap('allocating', undefined, allocShares)
        emitMsg('coordinator.responsesurface.eth', event.message, currentMsgPhase, 'relay', 'ResponseFund')
      } else if (event.type === 'system' && event.message.startsWith('0G Storage')) {
        setPhase('storage')
        emitMap('storage', undefined, allocShares)
        currentMsgPhase = 'AUDIT'
        emitMsg('coordinator.responsesurface.eth', event.message, currentMsgPhase, 'relay', '0G Storage')
      } else if (event.type === 'system' && event.message.includes('ENS updated')) {
        setPhase('ens_write')
        emitMap('ens_write', event.agent, allocShares)
        currentMsgPhase = 'WRITE'
        emitMsg('coordinator.responsesurface.eth', event.message, currentMsgPhase, 'result')
      }

      if (event.type !== 'assessment') {
        onActivity({ type: event.type, agent: event.agent, message: event.message, links: event.links })
      }
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

  const runCycle = async () => {
    if (running || disasters.length === 0) return
    setRunning(true)
    setError('')
    cancelledRef.current = false
    try {
      setPhase('collecting')
      emitMap('collecting')
      emitMsg('coordinator.responsesurface.eth', `Initiating allocation cycle ${cycleNumber}`, 'COLLECT', 'report')
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

      const newProofs: Proof[] = []
      for (const a of result.assessments) {
        if (a.proofDensity > 0) {
          const evidence = EVIDENCE_MAP[a.agentEns]
          if (evidence) {
            newProofs.push({
              responderEns: `responder.responsesurface.eth`,
              agentEns: a.agentEns,
              location: { type: 'Point', coordinates: evidence.coords },
              credibilityScore: a.credibility,
              disasterId: `cycle-${cycleNumber}`,
              timestamp: Date.now(),
              proofHash: `0x${crypto.randomUUID().replace(/-/g, '')}`,
              astralVerified: true,
              containment: { contained: true, zone: evidence.zone },
              evidenceImage: evidence.file,
              evidenceType: evidence.type,
              proofDensity: a.proofDensity,
            })
          }
        }
      }

      // Adversarial agents ATTEMPT proofs that fail Astral verification
      const ADVERSARIAL_ATTEMPTS: Record<string, { file: string; type: string; coords: [number, number]; zone: string; reason: string }> = {
        'rogue.responsesurface.eth': { file: 'wildfire_02.webp', type: 'Fabricated wildfire', coords: [-150.0, 61.2], zone: 'Alaska (outside claimed region)', reason: 'Location 2,400km from nearest reported disaster' },
        'phantom.responsesurface.eth': { file: 'flood_01.webp', type: 'Fabricated flood', coords: [-92.5, 40.0], zone: 'Iowa (no active flood)', reason: 'No corroborating data from USGS or EONET' },
      }
      for (const a of result.assessments) {
        const attempt = ADVERSARIAL_ATTEMPTS[a.agentEns]
        if (attempt) {
          newProofs.push({
            responderEns: a.agentEns,
            agentEns: a.agentEns,
            location: { type: 'Point', coordinates: attempt.coords },
            credibilityScore: a.credibility,
            disasterId: `cycle-${cycleNumber}`,
            timestamp: Date.now(),
            proofHash: `0x${crypto.randomUUID().replace(/-/g, '')}`,
            astralVerified: false,
            containment: { contained: false, zone: attempt.zone },
            evidenceImage: attempt.file,
            evidenceType: attempt.type,
            proofDensity: 0,
          })
          onActivity({
            type: 'flag',
            agent: a.agentEns.replace('.responsesurface.eth', ''),
            message: `REJECTED: ${a.agentEns.split('.')[0]} submitted proof from ${attempt.zone} — ${attempt.reason}`,
          })
        }
      }

      if (newProofs.length > 0) onProofs?.(newProofs)

      const newAllocations: Allocation[] = result.allocations.map(a => ({
        agent: a.ensName, ensName: a.ensName, amount: BigInt(a.amount),
        disasterId: a.disasterId, timestamp: a.timestamp,
        assessmentHash: a.assessmentHash, teeVerified: a.teeVerified,
        credibility: a.credibility, severity: a.severity,
        disasterCount: a.disasterCount, proofDensity: a.proofDensity,
        weight: a.weight, share: a.share,
      }))
      onAllocations(newAllocations)
      const totalAllocated = result.totalAllocated ? BigInt(result.totalAllocated) : newAllocations.reduce((s, a) => s + a.amount, 0n)
      const balance = result.fundBalance ? BigInt(result.fundBalance) : 0n
      onFundUpdate(balance > 0n ? balance : 0n, totalAllocated)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Cycle failed: ${msg}`)
      onActivity({ type: 'system', message: `Cycle ${cycleNumber} failed — ${msg}` })
      emitMsg('coordinator.responsesurface.eth', `Cycle failed: ${msg}`, 'COLLECT', 'alert')
    }
    emitMap('complete')
    await delay(2000)
    emitMap('idle')
    onCycleAdvance()
    setPhase('')
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
            <div className="w-[6px] h-[6px] rounded-full status-glow-normal"
              style={{ background: 'var(--status-normal)' }} />
            <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">
              {PHASES[activeIdx]?.label}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 px-3 py-2 rounded-[var(--radius)] text-[10px] leading-relaxed"
          style={{ background: 'rgba(255,56,56,0.08)', border: '1px solid rgba(255,56,56,0.2)', color: 'var(--status-critical)' }}>
          {error}
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
