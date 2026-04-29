import { useEffect, useState } from 'react'

type Status = 'green' | 'yellow' | 'red'

interface HeaderProps {
  onArchitectureClick: () => void
  onMeshClick: () => void
  onProofsClick: () => void
  onENSClick: () => void
}

export default function Header({
  onArchitectureClick, onMeshClick, onProofsClick, onENSClick,
}: HeaderProps) {
  const [zgStatus, setZgStatus] = useState<Status>('yellow')
  const [sepoliaStatus, setSepoliaStatus] = useState<Status>('yellow')
  const [axlStatus, setAxlStatus] = useState<Status>('yellow')

  useEffect(() => {
    fetch('https://evmrpc-testnet.0g.ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
    })
      .then(r => r.json())
      .then(() => setZgStatus('green'))
      .catch(() => setZgStatus('red'))

    fetch('https://ethereum-sepolia-rpc.publicnode.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
    })
      .then(r => r.json())
      .then(() => setSepoliaStatus('green'))
      .catch(() => setSepoliaStatus('red'))

    fetch('/api/axl/status')
      .then(r => r.json())
      .then(data => setAxlStatus(data.status === 'connected' ? 'green' : data.status === 'partial' ? 'yellow' : 'red'))
      .catch(() => setAxlStatus('yellow'))
  }, [])

  return (
    <header className="bg-[#0d1117] border-b border-white/5 px-5 h-11 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-semibold tracking-tight text-white">Response Surface</h1>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <StatusDot label="0G Chain" color={zgStatus} />
          <StatusDot label="ENS Sepolia" color={sepoliaStatus} />
          <StatusDot label="AXL Mesh" color={axlStatus} />
        </div>
      </div>
      <div className="flex items-center gap-1">
        {[
          { label: 'Architecture', onClick: onArchitectureClick },
          { label: 'AXL Mesh', onClick: onMeshClick },
          { label: 'ENS Registry', onClick: onENSClick },
          { label: 'Proofs', onClick: onProofsClick },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            className="text-[10px] text-gray-500 hover:text-white transition-colors cursor-pointer px-2.5 py-1 rounded hover:bg-white/5"
          >
            {btn.label}
          </button>
        ))}
      </div>
    </header>
  )
}

function StatusDot({ label, color }: { label: string; color: Status }) {
  const colors = {
    green: 'bg-emerald-400',
    yellow: 'bg-amber-400',
    red: 'bg-red-400',
  }
  return (
    <div className="flex items-center gap-1">
      <div className={`w-1.5 h-1.5 rounded-full ${colors[color]} ${color === 'green' ? 'animate-pulse' : ''}`} />
      <span>{label}</span>
    </div>
  )
}
