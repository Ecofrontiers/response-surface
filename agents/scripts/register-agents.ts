import 'dotenv/config'
import { createEnsWalletClient, createAgentIdentity, linkERC8004 } from '../src/integrations/ens-identity'

const ERC8004_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e'

const ZG_WALLET = process.env.ZG_WALLET_ADDRESS || ''

const AGENTS = [
  {
    name: 'fire',
    description: 'Wildfire detection agent — Western US bioregion',
    bounds: 'POLYGON((-124.4,32.5,-114.1,42.0))',
    dataSources: ['EONET', 'FIRMS', 'GBIF', 'AirNow'],
    role: 'agent' as const,
    axlPubkey: 'ed25519:8f3a2b7c9d1e4f6a0b5c8d2e7f1a3b6c9d4e8f2a',
  },
  {
    name: 'water',
    description: 'Water contamination agent — Mississippi basin',
    bounds: 'POLYGON((-95.0,29.0,-88.0,37.0))',
    dataSources: ['USGS', 'GBIF', 'iNaturalist'],
    role: 'agent' as const,
    axlPubkey: 'ed25519:2c7d4e9f1a3b6c8d0e5f2a7b4c9d1e6f3a8b5c0d',
  },
  {
    name: 'coordinator',
    description: 'Coordinator — aggregates assessments, runs sealed inference',
    bounds: 'POLYGON((-124.4,24.4,-66.9,49.4))',
    dataSources: ['all'],
    role: 'coordinator' as const,
    axlPubkey: 'ed25519:5a1b3c7d9e2f4a6b8c0d5e7f1a3b9c2d4e6f8a0b',
  },
  {
    name: 'rogue',
    description: 'Adversarial test agent — submits inflated assessments to test credibility gating',
    bounds: 'POLYGON((-90.0,25.0,-80.0,35.0))',
    dataSources: ['none'],
    role: 'agent' as const,
    axlPubkey: 'ed25519:9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
  },
]

async function main() {
  const privateKey = process.env.EVM_PRIVATE_KEY as `0x${string}`
  if (!privateKey) throw new Error('EVM_PRIVATE_KEY required')

  const wallet = createEnsWalletClient(privateKey)
  console.log(`Registering agents with account: ${wallet.account.address}`)

  for (const agent of AGENTS) {
    console.log(`\nRegistering ${agent.name}.responsesurface.eth...`)
    try {
      const fullName = await createAgentIdentity(wallet, agent.name, {
        ...agent,
        zgAddress: ZG_WALLET,
      })
      console.log(`  Created: ${fullName}`)

      const agentId = AGENTS.indexOf(agent) + 1
      try {
        await linkERC8004(wallet, fullName, ERC8004_REGISTRY, agentId)
        console.log(`  Linked to ERC-8004 registry (agent #${agentId})`)
      } catch (e) {
        console.warn(`  ERC-8004 link failed: ${(e as Error).message}`)
      }
    } catch (e) {
      console.error(`  Failed: ${(e as Error).message}`)
    }
  }
}

main().catch(console.error)
