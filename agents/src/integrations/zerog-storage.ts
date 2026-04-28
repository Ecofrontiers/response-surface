import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk'
import { ethers } from 'ethers'
import type { AuditEntry } from '../types'

const ZG_RPC = process.env.ZG_RPC || 'https://evmrpc-testnet.0g.ai'
const INDEXER_URL = process.env.ZG_INDEXER || 'https://indexer-storage-testnet-turbo.0g.ai'

export async function uploadAuditLog(
  privateKey: string,
  data: AuditEntry,
): Promise<{ txHash: string; merkleRoot: string }> {
  const provider = new ethers.JsonRpcProvider(ZG_RPC)
  const signer = new ethers.Wallet(privateKey, provider)
  const indexer = new Indexer(INDEXER_URL)

  const memData = new MemData(
    Buffer.from(JSON.stringify({ ...data, timestamp: Date.now() })),
  )

  const [tree, treeErr] = await memData.merkleTree()
  if (treeErr || !tree) throw new Error(`Merkle tree failed: ${treeErr}`)
  const rootHash = tree.rootHash()

  const [result, uploadErr] = await indexer.upload(memData, ZG_RPC, signer)
  if (uploadErr) throw new Error(`Upload failed: ${uploadErr}`)

  const r = result as { txHash?: string; rootHash?: string; txHashes?: string[]; rootHashes?: string[] }
  return {
    txHash: r.txHash || r.txHashes?.[0] || '',
    merkleRoot: r.rootHash || r.rootHashes?.[0] || rootHash || '',
  }
}

export async function downloadAuditLog(
  merkleRoot: string,
  outputPath: string,
): Promise<void> {
  const indexer = new Indexer(INDEXER_URL)
  await indexer.download(merkleRoot, outputPath, true)
}
