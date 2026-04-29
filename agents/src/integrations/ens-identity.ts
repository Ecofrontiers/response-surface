import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { addEnsContracts } from '@ensdomains/ensjs'
import { createSubname, setRecords } from '@ensdomains/ensjs/wallet'
import { getTextRecord } from '@ensdomains/ensjs/public'
import type { AgentMetadata, CredibilityRecord } from '../types'

const RESOLVER = '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5'
const PARENT_NAME = process.env.ENS_PARENT_NAME || 'responsesurface.eth'
const RPC = process.env.SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com'

export function createEnsWalletClient(privateKey: `0x${string}`) {
  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: addEnsContracts(sepolia),
    transport: http(RPC),
  })
}

export function createEnsPublicClient() {
  return createPublicClient({
    chain: addEnsContracts(sepolia),
    transport: http(RPC),
  })
}

export async function createAgentIdentity(
  wallet: ReturnType<typeof createEnsWalletClient>,
  agentName: string,
  metadata: AgentMetadata,
): Promise<string> {
  const fullName = `${agentName}.${PARENT_NAME}`

  try {
    await createSubname(wallet, {
      name: fullName,
      owner: wallet.account.address,
      contract: 'registry',
      resolverAddress: RESOLVER,
    })
  } catch (e) {
    console.warn(`  Subname ${fullName} may already exist: ${(e as Error).message?.slice(0, 80)}`)
  }

  await setRecords(wallet, {
    name: fullName,
    resolverAddress: RESOLVER,
    texts: [
      { key: 'description', value: metadata.description },
      { key: 'bioregion.bounds', value: metadata.bounds },
      { key: 'data.sources', value: metadata.dataSources.join(',') },
      { key: 'axl.pubkey', value: metadata.axlPubkey || '' },
      { key: 'role', value: metadata.role },
      { key: '0g.address', value: metadata.zgAddress || '' },
    ],
  })

  return fullName
}

export async function updateCredibility(
  wallet: ReturnType<typeof createEnsWalletClient>,
  ensName: string,
  credibility: CredibilityRecord,
): Promise<void> {
  await setRecords(wallet, {
    name: ensName,
    resolverAddress: RESOLVER,
    texts: [
      { key: 'credibility.score', value: String(credibility.score) },
      { key: 'credibility.proofs', value: String(credibility.totalProofs) },
      { key: 'credibility.lastUpdate', value: new Date().toISOString() },
    ],
  })
}

export async function linkERC8004(
  wallet: ReturnType<typeof createEnsWalletClient>,
  ensName: string,
  registryAddress: string,
  agentId: number,
): Promise<void> {
  await setRecords(wallet, {
    name: ensName,
    resolverAddress: RESOLVER,
    texts: [
      { key: `agent-registration[${registryAddress}][${agentId}]`, value: '1' },
    ],
  })
}

export async function getAgentMetadata(
  client: ReturnType<typeof createEnsPublicClient>,
  ensName: string,
): Promise<Record<string, string>> {
  const keys = [
    'description', 'bioregion.bounds', 'data.sources', 'axl.pubkey', 'role',
    '0g.address', 'credibility.score', 'credibility.proofs', 'credibility.lastUpdate',
  ]
  const results: Record<string, string> = {}
  for (const key of keys) {
    const val = await getTextRecord(client, { name: ensName, key })
    if (val) results[key] = val
  }
  return results
}
