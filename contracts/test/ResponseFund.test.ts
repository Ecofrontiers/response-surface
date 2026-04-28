import { expect } from 'chai'
import { ethers } from 'hardhat'
import type { ResponseFund } from '../typechain-types'

describe('ResponseFund', function () {
  let fund: ResponseFund
  let coordinator: any
  let agent1: any
  let agent2: any
  let responder: any

  beforeEach(async function () {
    ;[coordinator, agent1, agent2, responder] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory('ResponseFund')
    fund = await Factory.deploy()
    await fund.waitForDeployment()
  })

  it('sets coordinator on deploy', async function () {
    expect(await fund.coordinator()).to.equal(coordinator.address)
  })

  it('starts at cycle 1', async function () {
    expect(await fund.cycleNumber()).to.equal(1n)
  })

  it('accepts deposits', async function () {
    const depositAmount = ethers.parseEther('5.0')
    await fund.deposit({ value: depositAmount })
    expect(await ethers.provider.getBalance(await fund.getAddress())).to.equal(depositAmount)
  })

  it('accepts deposits via receive', async function () {
    const depositAmount = ethers.parseEther('2.0')
    await coordinator.sendTransaction({ to: await fund.getAddress(), value: depositAmount })
    expect(await ethers.provider.getBalance(await fund.getAddress())).to.equal(depositAmount)
  })

  it('executes allocations', async function () {
    await fund.deposit({ value: ethers.parseEther('10.0') })

    const amount1 = ethers.parseEther('3.0')
    const amount2 = ethers.parseEther('2.0')
    const hash = ethers.keccak256(ethers.toUtf8Bytes('assessment-1'))

    await expect(
      fund.executeAllocations(
        [agent1.address, agent2.address],
        [amount1, amount2],
        ['fire.responsesurface.eth', 'water.responsesurface.eth'],
        ['EONET_0001', 'EONET_0001'],
        [hash, hash],
        [true, false],
      ),
    ).to.emit(fund, 'AllocationExecuted')

    expect(await fund.getAllocationCount()).to.equal(2n)
    expect(await fund.totalAllocated()).to.equal(amount1 + amount2)
    expect(await fund.getDisasterFunding('EONET_0001')).to.equal(amount1 + amount2)
  })

  it('rejects allocations from non-coordinator', async function () {
    await fund.deposit({ value: ethers.parseEther('10.0') })

    await expect(
      fund.connect(agent1).executeAllocations(
        [agent1.address], [ethers.parseEther('1.0')],
        ['fire.responsesurface.eth'], ['EONET_0001'],
        [ethers.ZeroHash], [false],
      ),
    ).to.be.revertedWith('Not coordinator')
  })

  it('rejects when insufficient funds', async function () {
    await expect(
      fund.executeAllocations(
        [agent1.address], [ethers.parseEther('1.0')],
        ['fire.responsesurface.eth'], ['EONET_0001'],
        [ethers.ZeroHash], [false],
      ),
    ).to.be.revertedWith('Insufficient funds')
  })

  it('submits proofs and updates credibility', async function () {
    await expect(
      fund.connect(responder).submitProof(
        'responder1.responsesurface.eth',
        ethers.keccak256(ethers.toUtf8Bytes('proof-1')),
        850,
        'EONET_0001',
      ),
    ).to.emit(fund, 'ProofSubmitted')

    expect(await fund.getProofCount()).to.equal(1n)
    expect(await fund.agentCredibility(responder.address)).to.equal(850n)
  })

  it('advances cycle', async function () {
    await fund.advanceCycle()
    expect(await fund.cycleNumber()).to.equal(2n)
  })
})
