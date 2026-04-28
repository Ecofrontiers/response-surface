import { useState, useEffect } from 'react'
import type { Agent } from '../types'
import { fetchAgents } from '../services/api'

export function useAgents(pollInterval = 10000) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function poll() {
      try {
        const data = await fetchAgents()
        if (mounted) {
          setAgents(data)
          setError(null)
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to fetch agents')
      }
    }

    poll()
    const interval = setInterval(poll, pollInterval)
    return () => { mounted = false; clearInterval(interval) }
  }, [pollInterval])

  return { agents, error }
}
