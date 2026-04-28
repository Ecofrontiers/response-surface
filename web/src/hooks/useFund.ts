import { useState, useEffect } from 'react'
import type { Allocation } from '../types'
import { fetchFundState } from '../services/api'

interface FundState {
  balance: bigint
  totalAllocated: bigint
  cycleNumber: number
  allocations: Allocation[]
}

export function useFund(pollInterval = 15000) {
  const [state, setState] = useState<FundState>({
    balance: 0n,
    totalAllocated: 0n,
    cycleNumber: 1,
    allocations: [],
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function poll() {
      try {
        const data = await fetchFundState()
        if (mounted) {
          setState(data)
          setError(null)
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to fetch fund')
      }
    }

    poll()
    const interval = setInterval(poll, pollInterval)
    return () => { mounted = false; clearInterval(interval) }
  }, [pollInterval])

  return { ...state, error }
}
