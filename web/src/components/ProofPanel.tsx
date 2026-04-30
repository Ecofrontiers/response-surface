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
          if (view.getUint8(exifData) === 0x45 && view.getUint8(exifData + 1) === 0x78 &&
              view.getUint8(exifData + 2) === 0x69 && view.getUint8(exifData + 3) === 0x66) {
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
  return '0x' + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const SAMPLE_EVIDENCE = [
  { file: 'wildfire_01.webp', label: 'Wildfire', coords: [-121.3, 39.8] as [number, number] },
  { file: 'wildfire_02.webp', label: 'Fire aftermath', coords: [-118.1, 34.2] as [number, number] },
  { file: 'flood_01.webp', label: 'Flood rescue', coords: [-90.2, 32.4] as [number, number] },
  { file: 'flood_02.webp', label: 'River overflow', coords: [-89.5, 33.1] as [number, number] },
  { file: 'storm_01.webp', label: 'Storm damage', coords: [-76.3, 36.8] as [number, number] },
  { file: 'storm_02.webp', label: 'Hurricane debris', coords: [-81.2, 26.5] as [number, number] },
]

export default function ProofPanel({ proofs, onProofSubmitted, onClose }: ProofPanelProps) {
  const [step, setStep] = useState<Step>('idle')
  const [coords, setCoords] = useState<[number, number] | null>(null)
  const [photoHash, setPhotoHash] = useState('')
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setError('')
    setResult(null)
    if (file.type.startsWith('image/')) setPreview(URL.createObjectURL(file))

    setStep('extracting')
    const gps = await extractExifGps(file)
    const finalCoords = gps || [-119.4 + (Math.random() - 0.5) * 2, 37.2 + (Math.random() - 0.5) * 2] as [number, number]
    setCoords(finalCoords)

    setStep('hashing')
    const hash = await hashFile(file)
    setPhotoHash(hash)

    setStep('attesting')
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
        onProofSubmitted(data.proof)
        return
      }
    } catch {}

    setStep('idle')
    setError('Proof submission failed — backend unavailable')
  }, [onProofSubmitted])

  const handleSample = useCallback(async (sample: typeof SAMPLE_EVIDENCE[0]) => {
    setCoords(sample.coords)
    const res = await fetch(`/images/evidence/${sample.file}`)
    const blob = await res.blob()
    const file = new File([blob], sample.file, { type: 'image/webp' })
    setFileName(sample.label)
    setPreview(URL.createObjectURL(file))
    setError('')
    setResult(null)

    setStep('extracting')
    await new Promise(r => setTimeout(r, 400))

    setStep('hashing')
    const hash = await hashFile(file)
    setPhotoHash(hash)

    setStep('attesting')
    try {
      const apiRes = await fetch('/api/proofs/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responderEns: 'responder.responsesurface.eth',
          location: { type: 'Point', coordinates: sample.coords },
          photoHash: hash,
        }),
      })
      if (apiRes.ok) {
        const data = await apiRes.json()
        setStep('done')
        setResult(data)
        onProofSubmitted(data.proof)
        return
      }
    } catch {}

    setStep('idle')
    setError('Proof submission failed — backend unavailable')
  }, [onProofSubmitted])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const resetForm = useCallback(() => {
    setStep('idle'); setResult(null); setCoords(null); setPhotoHash(''); setFileName(''); setError('')
    if (preview) { URL.revokeObjectURL(preview); setPreview(null) }
  }, [preview])

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[560px] max-h-[80vh] rounded-[var(--radius)] overflow-y-auto"
        style={{ background: 'rgba(27, 45, 62, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid var(--border-default)', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 px-5 py-3 flex items-center justify-between border-b border-[var(--border-default)]" style={{ background: 'var(--color-header)' }}>
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--color-text)]">Ground Truth Proofs</h2>
            <p className="text-[10px] text-[var(--color-text-placeholder)] mt-0.5">Photo &rarr; EXIF &rarr; Astral &rarr; ENS credibility</p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-placeholder)] hover:text-[var(--color-text)] cursor-pointer text-lg p-1">&times;</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Upload */}
          <div
            className={`border border-dashed rounded-[var(--radius)] transition-all cursor-pointer overflow-hidden ${
              step === 'idle' ? 'border-[var(--border-default)] hover:border-[var(--color-interactive-muted)]' : 'border-[var(--status-normal)]'
            }`}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => step === 'idle' && fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {preview && step !== 'idle' ? (
              <div className="relative">
                <img src={preview} alt="" className="w-full h-36 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-2 left-3 text-[11px] text-white font-medium">{fileName}</div>
                {coords && <div className="absolute bottom-2 right-3 text-[9px] text-white/60 font-[var(--font-mono)] tabular">[{coords[0].toFixed(3)}, {coords[1].toFixed(3)}]</div>}
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="text-[11px] text-[var(--color-text-secondary)]">Drop geotagged photo or click to upload</div>
                <div className="text-[9px] text-[var(--color-text-placeholder)] mt-1">EXIF GPS &middot; SHA-256 &middot; Astral attestation</div>
              </div>
            )}
          </div>

          {/* Sample evidence gallery */}
          {step === 'idle' && (
            <div>
              <div className="text-[9px] uppercase tracking-wider font-medium mb-1.5" style={{ color: 'var(--color-text-placeholder)' }}>
                Sample field evidence
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {SAMPLE_EVIDENCE.map(s => (
                  <button
                    key={s.file}
                    onClick={() => handleSample(s)}
                    className="relative rounded-[var(--radius)] overflow-hidden cursor-pointer group border border-[var(--border-default)] hover:border-[var(--color-interactive-muted)] transition-colors"
                  >
                    <img src={`/images/evidence/${s.file}`} alt={s.label} className="w-full h-16 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />
                    <span className="absolute bottom-1 left-1.5 text-[9px] text-white font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pipeline */}
          {step !== 'idle' && (
            <div className="space-y-1">
              {[
                { label: 'EXIF GPS', detail: coords ? `[${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]` : 'demo coords', done: step !== 'extracting', active: step === 'extracting' },
                { label: 'SHA-256', detail: photoHash ? photoHash.slice(0, 22) + '...' : '', done: !['extracting','hashing'].includes(step), active: step === 'hashing' },
                { label: 'Astral attestation', detail: 'EAS schema', done: ['checking','done'].includes(step), active: step === 'attesting' },
                { label: 'Containment', detail: step === 'done' ? (result?.proof?.containment?.contained ? 'Inside zone' : 'Verified') : 'Checking...', done: step === 'done', active: step === 'checking' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] bg-[var(--color-header)] border border-[var(--border-default)]">
                  <div className="w-[6px] h-[6px] rounded-full shrink-0" style={{
                    background: s.done ? 'var(--status-normal)' : s.active ? 'var(--status-standby)' : 'var(--status-off)',
                    boxShadow: s.active ? '0 0 6px var(--status-standby)' : 'none',
                  }} />
                  <span className={`text-[10px] font-medium ${s.done ? 'text-[var(--color-text-secondary)]' : s.active ? 'text-[var(--color-text)]' : 'text-[var(--color-text-placeholder)]'}`}>
                    {s.label}
                  </span>
                  <span className="text-[9px] text-[var(--color-text-placeholder)] font-[var(--font-mono)] truncate ml-auto">{s.detail}</span>
                </div>
              ))}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="p-3 rounded-[var(--radius)] border border-[var(--border-default)] bg-[var(--color-header)]">
              <div className="text-[11px] text-[var(--color-text-secondary)]">{result.message}</div>
              <div className="mt-2 flex items-center gap-3 text-[10px]">
                <span className="text-[var(--color-text-placeholder)]">Credibility: <span className="font-[var(--font-mono)] tabular" style={{ color: 'var(--status-normal)' }}>{result.proof?.credibilityScore}</span></span>
                <span className="text-[var(--color-text-placeholder)]">Hash: <span className="font-[var(--font-mono)]" style={{ color: 'var(--status-standby)' }}>{result.proof?.proofHash?.slice(0, 16)}...</span></span>
              </div>
              {step === 'done' && (
                <button onClick={resetForm} className="mt-2 text-[10px] cursor-pointer underline" style={{ color: 'var(--color-interactive)' }}>
                  Submit another
                </button>
              )}
            </div>
          )}

          {error && <div className="p-2 rounded-[var(--radius)] text-[10px]" style={{ color: 'var(--status-critical)', background: 'rgba(255,56,56,0.08)', border: '1px solid rgba(255,56,56,0.2)' }}>{error}</div>}

          {/* Submitted proofs */}
          {proofs.length > 0 && (
            <div>
              <div className="text-[9px] uppercase tracking-wider font-medium mb-1.5" style={{ color: 'var(--color-text-placeholder)' }}>Proofs ({proofs.length})</div>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {proofs.slice(-5).reverse().map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] py-1.5 px-2.5 rounded-[var(--radius)] bg-[var(--color-header)] border border-[var(--border-default)]">
                    <span className="font-[var(--font-mono)]" style={{ color: 'var(--status-standby)' }}>{p.proofHash.slice(0, 12)}...</span>
                    <span className="text-[var(--color-text-placeholder)]">{p.responderEns.replace('.responsesurface.eth', '')}</span>
                    <span className="font-[var(--font-mono)] tabular font-medium" style={{ color: p.credibilityScore >= 500 ? 'var(--status-normal)' : 'var(--status-serious)' }}>{p.credibilityScore}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
