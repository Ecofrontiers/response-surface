import { ethers } from 'hardhat'

async function main() {
  const fundAddress = process.env.RESPONSE_FUND_ADDRESS
  if (!fundAddress) throw new Error('Set RESPONSE_FUND_ADDRESS in .env')

  const [deployer] = await ethers.getSigners()
  const fund = await ethers.getContractAt('ResponseFund', fundAddress)

  const depositAmount = ethers.parseEther('1.0')
  console.log(`Depositing ${ethers.formatEther(depositAmount)} 0G to fund...`)

  const tx = await fund.deposit({ value: depositAmount })
  await tx.wait()

  const balance = await ethers.provider.getBalance(fundAddress)
  console.log('Fund balance:', ethers.formatEther(balance), '0G')
  console.log('Cycle:', (await fund.cycleNumber()).toString())
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
