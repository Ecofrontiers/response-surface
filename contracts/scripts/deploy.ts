import { ethers } from 'hardhat'

const INITIAL_FUND = ethers.parseEther('100000') // 100k fUSD

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying with account:', deployer.address)
  console.log('Native balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)))

  // 1. Deploy FakeUSD
  const FakeUSD = await ethers.getContractFactory('FakeUSD')
  const fakeUsd = await FakeUSD.deploy()
  await fakeUsd.waitForDeployment()
  const tokenAddress = await fakeUsd.getAddress()
  console.log('FakeUSD deployed to:', tokenAddress)

  // 2. Deploy ResponseFund with token
  const ResponseFund = await ethers.getContractFactory('ResponseFund')
  const fund = await ResponseFund.deploy(tokenAddress)
  await fund.waitForDeployment()
  const fundAddress = await fund.getAddress()
  console.log('ResponseFund deployed to:', fundAddress)
  console.log('Coordinator set to:', deployer.address)

  // 3. Mint fUSD to deployer
  const mintTx = await fakeUsd.mint(deployer.address, INITIAL_FUND)
  await mintTx.wait()
  console.log(`Minted ${ethers.formatEther(INITIAL_FUND)} fUSD to deployer`)

  // 4. Approve + deposit into fund
  const approveTx = await fakeUsd.approve(fundAddress, INITIAL_FUND)
  await approveTx.wait()
  const depositTx = await fund.deposit(INITIAL_FUND)
  await depositTx.wait()
  const fundBalance = await fakeUsd.balanceOf(fundAddress)
  console.log(`ResponseFund balance: ${ethers.formatEther(fundBalance)} fUSD`)

  console.log('\nUpdate .env with:')
  console.log(`RESPONSE_FUND_ADDRESS=${fundAddress}`)
  console.log(`FAKE_USD_ADDRESS=${tokenAddress}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
