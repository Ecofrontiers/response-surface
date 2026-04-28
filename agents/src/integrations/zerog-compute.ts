import { ethers } from 'ethers'
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker'
import type { AgentAssessment, AllocationPlan } from '../types'

const ZG_RPC = process.env.ZG_RPC || 'https://evmrpc-testnet.0g.ai'

export async function createComputeBroker(privateKey: string) {
  const provider = new ethers.JsonRpcProvider(ZG_RPC)
  const wallet = new ethers.Wallet(privateKey, provider)
  return createZGComputeNetworkBroker(wallet)
}

export async function runCoordinatorInference(
  broker: any,
  providerAddress: string,
  assessments: AgentAssessment[],
): Promise<AllocationPlan> {
  const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress)
  const headers = await broker.inference.getRequestHeaders(providerAddress)

  const systemPrompt = `You are a disaster response coordinator. Given environmental assessments from multiple bioregional agents, produce an optimal fund allocation plan. Consider: severity, urgency, species at risk, affected population, available resources, and responder credibility scores. Output JSON with allocation amounts per zone.

Output format:
{
  "zones": [
    {
      "disasterId": "EONET event ID",
      "ensName": "agent ENS name",
      "amount": "allocation in wei as string",
      "rationale": "one sentence"
    }
  ]
}`

  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(assessments) },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) throw new Error(`0G Compute error: ${res.status} ${await res.text()}`)
  const data = await res.json()

  const chatID = res.headers.get('ZG-Res-Key') || data.id
  const isValid = await broker.inference.processResponse(providerAddress, chatID)

  return {
    plan: JSON.parse(data.choices[0].message.content),
    teeVerified: isValid,
    chatID,
  }
}
