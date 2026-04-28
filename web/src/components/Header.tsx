import { useEffect, useState } from 'react'

type Status = 'green' | 'yellow' | 'red'

export default function Header() {
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
      .catch(() => setAxlStatus('red'))
  }, [])

  return (
    <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-[#0a0e17] to-transparent">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Response Surface
        </h1>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
          LIVE
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <StatusDot label="0G Chain" color={zgStatus} />
        <StatusDot label="Sepolia" color={sepoliaStatus} />
        <StatusDot label="AXL Mesh" color={axlStatus} />
      </div>
    </header>
  )
}

function StatusDot({ label, color }: { label: string; color: Status }) {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${colors[color]} ${color === 'green' ? 'animate-pulse' : ''}`} />
      <span>{label}</span>
    </div>
  )
}
