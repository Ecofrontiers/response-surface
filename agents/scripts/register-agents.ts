import 'dotenv/config'
import { createEnsWalletClient, createAgentIdentity, linkERC8004 } from '../src/integrations/ens-identity'

const ERC8004_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e'

const ZG_WALLET = process.env.ZG_WALLET_ADDRESS || ''

const AGENTS = [
  {
    name: 'pacific',
    description: 'Wildfire detection agent — Pacific Coast (CA, OR, WA)',
    bounds: 'POLYGON((-124.8,32.5,-114.0,49.0))',
    dataSources: ['EONET', 'FIRMS', 'GBIF', 'AirNow'],
    axlPubkey: '',
    role: 'agent' as const,
  },
  {
    name: 'mountain',
    description: 'Wildfire detection agent — Rocky Mountains (MT, WY, CO, ID, UT)',
    bounds: 'POLYGON((-117.0,37.0,-104.0,49.0))',
    dataSources: ['EONET', 'FIRMS', 'GBIF'],
    axlPubkey: '',
    role: 'agent' as const,
  },
  {
    name: 'central',
    description: 'Severe weather agent — Central Plains (ND, SD, NE, KS, MN, IA)',
    bounds: 'POLYGON((-104.0,37.0,-90.0,49.0))',
    dataSources: ['EONET', 'FIRMS', 'GBIF'],
    axlPubkey: '',
    role: 'agent' as const,
  },
  {
    name: 'lakes',
    description: 'Flood monitoring agent — Great Lakes (WI, MI, IL, IN, OH)',
    bounds: 'POLYGON((-92.0,38.0,-80.5,49.0))',
    dataSources: ['EONET', 'USGS', 'GBIF', 'iNaturalist'],
    axlPubkey: '',
    role: 'agent' as const,
  },
  {
    name: 'delta',
    description: 'Flood monitoring agent — Mississippi Delta (LA, MS, AR, AL)',
    bounds: 'POLYGON((-95.0,29.0,-85.0,37.0))',
    dataSources: ['EONET', 'USGS', 'GBIF', 'iNaturalist'],
    axlPubkey: '',
    role: 'agent' as const,
  },
  {
    name: 'gulf',
    description: 'Storm & fire agent — Gulf Coast (TX, OK)',
    bounds: 'POLYGON((-107.0,25.5,-93.0,37.0))',
    dataSources: ['EONET', 'FIRMS', 'USGS'],
    axlPubkey: '',
    role: 'agent' as const,
  },
  {
    name: 'atlantic',
    description: 'Hurricane & flood agent — Atlantic Seaboard (GA, FL, SC, NC)',
    bounds: 'POLYGON((-85.0,24.5,-75.0,37.0))',
    dataSources: ['EONET', 'USGS', 'GBIF'],
    axlPubkey: '',
    role: 'agent' as const,
  },
  {
    name: 'northeast',
    description: 'Weather monitoring agent — Northeast (NY, PA, NJ, CT, MA)',
    bounds: 'POLYGON((-80.5,38.0,-67.0,47.5))',
    dataSources: ['EONET', 'USGS', 'GBIF'],
    axlPubkey: '',
    role: 'agent' as const,
  },
  {
    name: 'coordinator',
    description: 'Coordinator — aggregates assessments, runs sealed inference',
    bounds: 'POLYGON((-124.8,24.4,-66.9,49.4))',
    dataSources: ['all'],
    axlPubkey: '',
    role: 'coordinator' as const,
  },
  {
    name: 'rogue',
    description: 'Adversarial test agent — submits inflated assessments with no proofs',
    bounds: 'POLYGON((-180,-90,180,90))',
    dataSources: ['none'],
    axlPubkey: '',
    role: 'agent' as const,
  },
  {
    name: 'phantom',
    description: 'Adversarial test agent — fabricates disaster data in the Midwest',
    bounds: 'POLYGON((-100,35,-85,45))',
    dataSources: ['none'],
    axlPubkey: '',
    role: 'agent' as const,
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

    await new Promise(r => setTimeout(r, 4000))
  }
}

main().catch(console.error)
