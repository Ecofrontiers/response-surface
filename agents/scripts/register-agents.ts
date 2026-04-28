import 'dotenv/config'
import { createEnsWalletClient, createAgentIdentity, linkERC8004 } from '../src/integrations/ens-identity'

const ERC8004_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e'

const AGENTS = [
  {
    name: 'fire',
    description: 'Wildfire detection agent — Western US bioregion',
    bounds: 'POLYGON((-124.4,32.5,-114.1,42.0))',
    dataSources: ['EONET', 'FIRMS', 'GBIF', 'AirNow'],
    role: 'agent' as const,
  },
  {
    name: 'water',
    description: 'Water contamination agent — Mississippi basin',
    bounds: 'POLYGON((-95.0,29.0,-88.0,37.0))',
    dataSources: ['USGS', 'GBIF', 'iNaturalist'],
    role: 'agent' as const,
  },
  {
    name: 'coordinator',
    description: 'Coordinator — aggregates assessments, runs sealed inference',
    bounds: 'POLYGON((-124.4,24.4,-66.9,49.4))',
    dataSources: ['all'],
    role: 'coordinator' as const,
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
        axlPubkey: 'TBD',
      })
      console.log(`  Created: ${fullName}`)

      // ERC-8004 linking (if contract available on Sepolia)
      // Uncomment when ERC-8004 is deployed:
      // const agentId = 1
      // await linkERC8004(wallet, fullName, ERC8004_REGISTRY, agentId)
      // console.log(`  Linked to ERC-8004 registry`)
    } catch (e) {
      console.error(`  Failed: ${(e as Error).message}`)
    }
  }
}

main().catch(console.error)
