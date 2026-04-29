import { useState, useRef, useCallback } from 'react'
import type { Proof } from '../types'

interface ProofPanelProps {
  proofs: Proof[]
  onProofSubmitted: (proof: Proof) => void
  onClose: () => void
}

type Step = 'idle' | 'extracting' | 'hashing' | 'attesting' | 'checking' | 'done' | 'error'

function extractExifGps(file: File): Promise<[number, number] | null> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => {
      const view = new DataView(reader.result as ArrayBuffer)
      if (view.getUint16(0) !== 0xFFD8) return resolve(null)

      let offset = 2
      while (offset < view.byteLength - 2) {
        const marker = view.getUint16(offset)
        if (marker === 0xFFE1) {
          const exifData = offset + 4
          const tiffStart = exifData + 6
          if (
            view.getUint8(exifData) === 0x45 &&
            view.getUint8(exifData + 1) === 0x78 &&
            view.getUint8(exifData + 2) === 0x69 &&
            view.getUint8(exifData + 3) === 0x66
          ) {
            const bigEndian = view.getUint16(tiffStart) === 0x4D4D
            const ifdOffset = view.getUint32(tiffStart + 4, !bigEndian)
            const numEntries = view.getUint16(tiffStart + ifdOffset, !bigEndian)
            let gpsOffset = 0
            for (let i = 0; i < numEntries; i++) {
              const entryOffset = tiffStart + ifdOffset + 2 + i * 12
              if (view.getUint16(entryOffset, !bigEndian) === 0x8825) {
                gpsOffset = view.getUint32(entryOffset + 8, !bigEndian)
                break
              }
            }
            if (gpsOffset) {
              try {
                const gpsEntries = view.getUint16(tiffStart + gpsOffset, !bigEndian)
                let lat = 0, lng = 0, latRef = 'N', lngRef = 'E'
                for (let i = 0; i < gpsEntries; i++) {
                  const entryOff = tiffStart + gpsOffset + 2 + i * 12
                  const tag = view.getUint16(entryOff, !bigEndian)
                  if (tag === 1) latRef = String.fromCharCode(view.getUint8(entryOff + 8))
                  if (tag === 3) lngRef = String.fromCharCode(view.getUint8(entryOff + 8))
                  if (tag === 2 || tag === 4) {
                    const valOff = tiffStart + view.getUint32(entryOff + 8, !bigEndian)
                    const deg = view.getUint32(valOff, !bigEndian) / view.getUint32(valOff + 4, !bigEndian)
                    const min = view.getUint32(valOff + 8, !bigEndian) / view.getUint32(valOff + 12, !bigEndian)
                    const sec = view.getUint32(valOff + 16, !bigEndian) / view.getUint32(valOff + 20, !bigEndian)
                    const decimal = deg + min / 60 + sec / 3600
                    if (tag === 2) lat = decimal
                    if (tag === 4) lng = decimal
                  }
                }
                if (latRef === 'S') lat = -lat
                if (lngRef === 'W') lng = -lng
                if (lat !== 0 || lng !== 0) return resolve([lng, lat])
              } catch {}
            }
          }
          resolve(null)
          return
        }
        const segLen = view.getUint16(offset + 2)
        offset += 2 + segLen
      }
      resolve(null)
    }
    reader.readAsArrayBuffer(file)
  })
}

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function ProofPanel({ proofs, onProofSubmitted, onClose }: ProofPanelProps) {
  const [step, setStep] = useState<Step>('idle')
  const [coords, setCoords] = useState<[number, number] | null>(null)
  const [photoHash, setPhotoHash] = useState('')
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setError('')
    setResult(null)

    setStep('extracting')
    const gps = await extractExifGps(file)

    if (!gps) {
      setCoords([-119.4 + (Math.random() - 0.5) * 2, 37.2 + (Math.random() - 0.5) * 2])
    } else {
      setCoords(gps)
    }

    setStep('hashing')
    const hash = await hashFile(file)
    setPhotoHash(hash)

    setStep('attesting')
    const finalCoords = gps || [-119.4 + (Math.random() - 0.5) * 2, 37.2 + (Math.random() - 0.5) * 2]

    try {
      const res = await fetch('/api/proofs/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responderEns: 'responder.responsesurface.eth',
          location: { type: 'Point', coordinates: finalCoords },
          photoHash: hash,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setStep('done')
        setResult(data)
        onProofSubmitted({
          responderEns: data.proof.responderEns,
          agentEns: data.proof.agentEns,
          location: data.proof.location,
          credibilityScore: data.proof.credibilityScore,
          disasterId: data.proof.disasterId,
          timestamp: data.proof.timestamp,
          proofHash: data.proof.proofHash,
        })
        return
      }
    } catch {}

    // Fallback: simulate the flow locally
    setStep('checking')
    await new Promise(r => setTimeout(r, 600))

    const simProof: Proof = {
      responderEns: 'responder.responsesurface.eth',
      agentEns: 'fire.responsesurface.eth',
      location: { type: 'Point', coordinates: finalCoords },
      credibilityScore: 650,
      disasterId: 'sim-proof',
      timestamp: Date.now(),
      proofHash: hash,
    }
    setResult({
      success: true,
      proof: simProof,
      message: 'Proof recorded (simulated — API offline)',
    })
    setStep('done')
    onProofSubmitted(simProof)
  }, [onProofSubmitted])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const stepLabels: Record<Step, string> = {
    idle: '',
    extracting: 'Extracting EXIF GPS...',
    hashing: 'Computing SHA-256 hash...',
    attesting: 'Creating Astral attestation...',
    checking: 'Checking containment...',
    done: 'Proof submitted',
    error: 'Error',
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[640px] max-h-[85vh] bg-[#0d1117]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#0d1117]/95 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Ground Truth Proofs</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Geotagged photo upload &rarr; Astral verification &rarr; ENS credibility
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl cursor-pointer leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Upload Photo Proof</h3>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                step === 'idle' ? 'border-white/10 hover:border-emerald-500/40' : 'border-emerald-500/30 bg-emerald-500/[0.03]'
              }`}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => step === 'idle' && fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {step === 'idle' ? (
                <>
                  <div className="text-2xl mb-2 opacity-40">&#128247;</div>
                  <div className="text-xs text-gray-400">Drop a geotagged photo or click to upload</div>
                  <div className="text-[10px] text-gray-600 mt-1">EXIF GPS extracted automatically &middot; SHA-256 hashed</div>
                </>
              ) : (
                <>
                  <div className="text-xs text-emerald-400 font-medium">{fileName}</div>
                  <div className="text-[10px] text-gray-500 mt-1">{stepLabels[step]}</div>
                </>
              )}
            </div>
          </div>

          {step !== 'idle' && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Verification Pipeline</h3>
              <div className="space-y-2">
                <PipelineStep
                  label="EXIF GPS Extraction"
                  detail={coords ? `[${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]` : 'No GPS found — using demo coords'}
                  done={step !== 'extracting'}
                  active={step === 'extracting'}
                  color="#22c55e"
                />
                <PipelineStep
                  label="SHA-256 Photo Hash"
                  detail={photoHash ? `${photoHash.slice(0, 22)}...` : ''}
                  done={step !== 'extracting' && step !== 'hashing'}
                  active={step === 'hashing'}
                  color="#06b6d4"
                />
                <PipelineStep
                  label="Astral Offchain Attestation"
                  detail="EAS schema with mediaData[] + location"
                  done={step === 'checking' || step === 'done'}
                  active={step === 'attesting'}
                  color="#22c55e"
                />
                <PipelineStep
                  label="Containment Check"
                  detail={result?.proof?.containment?.contained ? `Inside: ${result.proof.containment.disasterTitle}` : 'Checking disaster zones...'}
                  done={step === 'done'}
                  active={step === 'checking'}
                  color="#f59e0b"
                />
              </div>
            </div>
          )}

          {result && (
            <div className={`p-3 rounded-xl border ${
              result.proof?.containment?.contained
                ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
                : 'border-amber-500/20 bg-amber-500/[0.03]'
            }`}>
              <div className="text-xs text-gray-300">{result.message}</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="text-[10px] text-gray-500">
                  Credibility: <span className="text-emerald-400 font-medium">{result.proof?.credibilityScore}/1000</span>
                </div>
                <div className="text-[10px] text-gray-500">
                  Hash: <span className="text-cyan-400 font-[var(--font-mono)]">{result.proof?.proofHash?.slice(0, 18)}...</span>
                </div>
              </div>
              {step === 'done' && (
                <button
                  className="mt-3 text-[10px] text-gray-400 hover:text-white cursor-pointer underline"
                  onClick={() => { setStep('idle'); setResult(null); setCoords(null); setPhotoHash(''); setFileName(''); }}
                >
                  Submit another proof
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/[0.03]">
              <div className="text-xs text-red-400">{error}</div>
            </div>
          )}

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">Submitted Proofs ({proofs.length})</h3>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {proofs.length === 0 && (
                <div className="text-[10px] text-gray-600 text-center py-3">
                  No proofs submitted yet
                </div>
              )}
              {proofs.slice(-6).reverse().map((p, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] py-1.5 px-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-cyan-400 font-[var(--font-mono)] text-[10px]">
                    {p.proofHash.slice(0, 14)}...
                  </span>
                  <span className="text-gray-500 text-[10px]">
                    {p.responderEns.replace('.responsesurface.eth', '')}
                  </span>
                  <span className={`text-[10px] font-medium ${p.credibilityScore >= 500 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {p.credibilityScore}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3">How It Works</h3>
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { label: 'Photo + EXIF', color: '#22c55e' },
                { label: 'SHA-256 hash', color: '#06b6d4' },
                { label: 'Astral attestation', color: '#22c55e' },
                { label: 'Containment check', color: '#f59e0b' },
                { label: 'ENS credibility', color: '#06b6d4' },
                { label: 'Fund allocation', color: '#f59e0b' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span
                    className="text-[10px] px-2 py-1 rounded-lg border font-medium"
                    style={{ borderColor: `${s.color}30`, color: s.color, background: `${s.color}08` }}
                  >
                    {s.label}
                  </span>
                  {i < 5 && <span className="text-gray-600 text-[10px]">&rarr;</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PipelineStep({ label, detail, done, active, color }: {
  label: string; detail: string; done: boolean; active: boolean; color: string
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-white/[0.02]" style={{ borderColor: done ? `${color}30` : 'rgba(255,255,255,0.05)' }}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium border ${
        done ? 'border-emerald-500/50 text-emerald-400' : active ? 'border-cyan-500/50 text-cyan-400 animate-pulse' : 'border-white/10 text-gray-600'
      }`}>
        {done ? '✓' : active ? '●' : '○'}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-medium ${done ? 'text-gray-300' : active ? 'text-white' : 'text-gray-600'}`}>{label}</div>
        {detail && <div className="text-[10px] text-gray-500 font-[var(--font-mono)] truncate">{detail}</div>}
      </div>
    </div>
  )
}
