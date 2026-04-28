import type { Agent, Disaster, Allocation } from '../types'

const API_BASE = '/api'

export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_BASE}/agents`)
  if (!res.ok) throw new Error(`Failed to fetch agents: ${res.status}`)
  return res.json()
}

export async function fetchDisasters(): Promise<Disaster[]> {
  const res = await fetch(`${API_BASE}/disasters`)
  if (!res.ok) throw new Error(`Failed to fetch disasters: ${res.status}`)
  return res.json()
}

export async function fetchFundState(): Promise<{
  balance: bigint
  totalAllocated: bigint
  cycleNumber: number
  allocations: Allocation[]
}> {
  const res = await fetch(`${API_BASE}/fund`)
  if (!res.ok) throw new Error(`Failed to fetch fund: ${res.status}`)
  const data = await res.json()
  return {
    ...data,
    balance: BigInt(data.balance),
    totalAllocated: BigInt(data.totalAllocated),
    allocations: data.allocations.map((a: any) => ({
      ...a,
      amount: BigInt(a.amount),
    })),
  }
}
