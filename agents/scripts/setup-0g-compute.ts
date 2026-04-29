import 'dotenv/config'
import { ethers } from 'ethers'
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker'
import * as fs from 'fs'
import * as path from 'path'

const ZG_RPC = process.env.ZG_RPC || 'https://evmrpc-testnet.0g.ai'
const MIN_DEPOSIT = 3

async function main() {
  const privateKey = process.env.EVM_PRIVATE_KEY
  if (!privateKey) throw new Error('EVM_PRIVATE_KEY required in .env')

  const provider = new ethers.JsonRpcProvider(ZG_RPC)
  const wallet = new ethers.Wallet(privateKey, provider)
  const balance = await provider.getBalance(wallet.address)
  console.log(`Wallet: ${wallet.address}`)
  console.log(`Balance: ${ethers.formatEther(balance)} 0G`)

  if (balance < ethers.parseEther(String(MIN_DEPOSIT + 1))) {
    console.error(`Need at least ${MIN_DEPOSIT + 1} 0G (${MIN_DEPOSIT} deposit + 1 per provider). Have ${ethers.formatEther(balance)}`)
    process.exit(1)
  }

  console.log('\nCreating 0G Compute broker...')
  const broker = await createZGComputeNetworkBroker(wallet)

  console.log('\nDiscovering available providers...')
  const services = await broker.inference.listService()
  const chatServices = services.filter((s: any) => s.serviceType === 'chatbot')

  if (chatServices.length === 0) {
    console.error('No chatbot providers found on testnet. Listing all services:')
    for (const s of services) {
      console.log(`  - ${s.provider} (type: ${s.serviceType}, model: ${s.model || 'unknown'})`)
    }
    process.exit(1)
  }

  console.log(`\nFound ${chatServices.length} chatbot provider(s):`)
  for (const s of chatServices) {
    console.log(`  Provider: ${s.provider}`)
    console.log(`    Model: ${s.model || 'unknown'}`)
    console.log(`    URL: ${s.url || 'unknown'}`)
    console.log(`    Input price: ${s.inputPrice || 'unknown'}`)
    console.log(`    Output price: ${s.outputPrice || 'unknown'}`)
    console.log()
  }

  const cheapest = chatServices.sort((a: any, b: any) =>
    Number(a.inputPrice || Infinity) - Number(b.inputPrice || Infinity)
  )[0]
  const providerAddress = cheapest.provider
  console.log(`Selected provider: ${providerAddress} (${cheapest.model || 'unknown'})`)

  console.log(`\nDepositing ${MIN_DEPOSIT} 0G to compute ledger...`)
  try {
    await broker.ledger.depositFund(MIN_DEPOSIT)
    console.log('Deposit successful')
  } catch (e: any) {
    if (e.message?.includes('already')) {
      console.log('Ledger already funded')
    } else {
      throw e
    }
  }

  console.log('\nAcknowledging provider signer...')
  try {
    await broker.inference.acknowledgeProviderSigner(providerAddress)
    console.log('Provider acknowledged')
  } catch (e: any) {
    if (e.message?.includes('already')) {
      console.log('Provider already acknowledged')
    } else {
      throw e
    }
  }

  console.log('\nVerifying with test inference...')
  try {
    const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress)
    const headers = await broker.inference.getRequestHeaders(providerAddress)

    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with exactly: TEE_VERIFIED_OK' }],
        max_tokens: 20,
      }),
    })

    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
    const data = await res.json()
    const chatID = res.headers.get('ZG-Res-Key') || data.id
    const isValid = await broker.inference.processResponse(providerAddress, chatID)

    console.log(`  Response: ${data.choices?.[0]?.message?.content?.trim()}`)
    console.log(`  TEE verified: ${isValid}`)
    console.log(`  Chat ID: ${chatID}`)
  } catch (e) {
    console.warn('Test inference failed (non-fatal):', (e as Error).message)
  }

  const envPath = path.resolve(__dirname, '../../.env')
  const envContent = fs.readFileSync(envPath, 'utf8')
  if (envContent.includes('ZG_COMPUTE_PROVIDER=') && !envContent.includes('ZG_COMPUTE_PROVIDER=\n') && !envContent.includes('ZG_COMPUTE_PROVIDER=""')) {
    console.log(`\nZG_COMPUTE_PROVIDER already set in .env`)
  } else {
    const updated = envContent.includes('ZG_COMPUTE_PROVIDER')
      ? envContent.replace(/ZG_COMPUTE_PROVIDER=.*/, `ZG_COMPUTE_PROVIDER=${providerAddress}`)
      : envContent.trimEnd() + `\nZG_COMPUTE_PROVIDER=${providerAddress}\n`
    fs.writeFileSync(envPath, updated)
    console.log(`\nWrote ZG_COMPUTE_PROVIDER=${providerAddress} to .env`)
  }

  console.log('\n✓ 0G Compute ready. Coordinator will now use sealed TEE inference.')
}

main().catch(e => {
  console.error('Setup failed:', e.message)
  process.exit(1)
})
