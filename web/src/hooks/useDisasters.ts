import { useState, useEffect } from 'react'
import type { Disaster } from '../types'
import { fetchDisasters } from '../services/api'

export function useDisasters(pollInterval = 30000) {
  const [disasters, setDisasters] = useState<Disaster[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function poll() {
      try {
        const data = await fetchDisasters()
        if (mounted) {
          setDisasters(data)
          setError(null)
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to fetch disasters')
      }
    }

    poll()
    const interval = setInterval(poll, pollInterval)
    return () => { mounted = false; clearInterval(interval) }
  }, [pollInterval])

  return { disasters, error }
}
