import 'dotenv/config'
import { createEnsWalletClient, createEnsPublicClient, createAgentIdentity } from '../src/integrations/ens-identity'
import { getTextRecord } from '@ensdomains/ensjs/public'

const PARENT_NAME = process.env.ENS_PARENT_NAME || 'responsesurface.eth'

async function main() {
  const privateKey = process.env.EVM_PRIVATE_KEY as `0x${string}`
  if (!privateKey) throw new Error('EVM_PRIVATE_KEY required')

  const wallet = createEnsWalletClient(privateKey)
  const publicClient = createEnsPublicClient()

  console.log(`Using account: ${wallet.account.address}`)
  console.log(`Parent name: ${PARENT_NAME}`)
  console.log()

  const subnames = [
    {
      name: 'fire',
      metadata: {
        description: 'Wildfire detection agent — Western US bioregion',
        bounds: 'POLYGON((-124.4,32.5,-114.1,42.0))',
        dataSources: ['EONET', 'FIRMS', 'GBIF', 'AirNow'],
        axlPubkey: 'TBD',
        role: 'agent' as const,
      },
    },
    {
      name: 'water',
      metadata: {
        description: 'Water contamination agent — Mississippi basin',
        bounds: 'POLYGON((-95.0,29.0,-88.0,37.0))',
        dataSources: ['USGS', 'GBIF', 'iNaturalist'],
        axlPubkey: 'TBD',
        role: 'agent' as const,
      },
    },
    {
      name: 'coordinator',
      metadata: {
        description: 'Coordinator — aggregates assessments, runs sealed inference',
        bounds: 'POLYGON((-124.4,24.4,-66.9,49.4))',
        dataSources: ['all'],
        axlPubkey: 'TBD',
        role: 'coordinator' as const,
      },
    },
  ]

  for (const sub of subnames) {
    const fullName = `${sub.name}.${PARENT_NAME}`
    console.log(`Creating ${fullName}...`)

    try {
      const existing = await getTextRecord(publicClient, { name: fullName, key: 'role' })
      if (existing) {
        console.log(`  Already exists (role: ${existing}), skipping`)
        continue
      }
    } catch {
      // doesn't exist yet
    }

    try {
      await createAgentIdentity(wallet, sub.name, sub.metadata)
      console.log(`  Created ${fullName}`)
    } catch (e) {
      console.error(`  Failed: ${(e as Error).message}`)
    }
  }

  console.log('\nDone. Verify at sepolia.app.ens.domains')
}

main().catch(console.error)
