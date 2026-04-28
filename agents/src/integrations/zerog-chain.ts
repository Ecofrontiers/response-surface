import { ethers } from 'ethers'

const ZG_RPC = process.env.ZG_RPC || 'https://evmrpc-testnet.0g.ai'

const RESPONSE_FUND_ABI = [
  'function token() external view returns (address)',
  'function deposit(uint256 amount) external',
  'function balance() external view returns (uint256)',
  'function executeAllocations(address[] calldata agents, uint256[] calldata amounts, string[] calldata ensNames, string[] calldata disasterIds, bytes32[] calldata assessmentHashes, bool[] calldata teeFlags) external',
  'function submitProof(string calldata ensName, bytes32 proofHash, uint256 credibilityScore, string calldata disasterId) external',
  'function advanceCycle() external',
  'function cycleNumber() external view returns (uint256)',
  'function totalAllocated() external view returns (uint256)',
  'function getAllocationCount() external view returns (uint256)',
  'function getProofCount() external view returns (uint256)',
  'function getDisasterFunding(string calldata disasterId) external view returns (uint256)',
  'function agentCredibility(address) external view returns (uint256)',
  'event FundDeposited(address indexed depositor, uint256 amount)',
  'event AllocationExecuted(uint256 indexed cycle, address indexed agent, uint256 amount, string disasterId)',
  'event ProofSubmitted(address indexed responder, string disasterId, uint256 credibility)',
  'event CycleAdvanced(uint256 indexed newCycle)',
]

const ERC20_ABI = [
  'function balanceOf(address) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function mint(address to, uint256 amount) external',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
]

export function createTokenContract(privateKey: string, tokenAddress: string) {
  const provider = new ethers.JsonRpcProvider(ZG_RPC)
  const wallet = new ethers.Wallet(privateKey, provider)
  return new ethers.Contract(tokenAddress, ERC20_ABI, wallet)
}

export function createTokenContractReadonly(tokenAddress: string) {
  const provider = new ethers.JsonRpcProvider(ZG_RPC)
  return new ethers.Contract(tokenAddress, ERC20_ABI, provider)
}

export function createFundContract(privateKey: string, fundAddress: string) {
  const provider = new ethers.JsonRpcProvider(ZG_RPC)
  const wallet = new ethers.Wallet(privateKey, provider)
  return new ethers.Contract(fundAddress, RESPONSE_FUND_ABI, wallet)
}

export function createFundContractReadonly(fundAddress: string) {
  const provider = new ethers.JsonRpcProvider(ZG_RPC)
  return new ethers.Contract(fundAddress, RESPONSE_FUND_ABI, provider)
}

export async function executeAllocations(
  contract: ethers.Contract,
  allocations: {
    agent: string
    amount: bigint
    ensName: string
    disasterId: string
    assessmentHash: string
    teeVerified: boolean
  }[],
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.executeAllocations(
    allocations.map(a => a.agent),
    allocations.map(a => a.amount),
    allocations.map(a => a.ensName),
    allocations.map(a => a.disasterId),
    allocations.map(a => a.assessmentHash),
    allocations.map(a => a.teeVerified),
  )
  return tx.wait()
}

export async function submitProof(
  contract: ethers.Contract,
  ensName: string,
  proofHash: string,
  credibilityScore: number,
  disasterId: string,
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.submitProof(ensName, proofHash, credibilityScore, disasterId)
  return tx.wait()
}

export async function getFundState(contract: ethers.Contract) {
  const [balance, cycleNumber, totalAllocated, allocationCount, proofCount] = await Promise.all([
    contract.balance(),
    contract.cycleNumber(),
    contract.totalAllocated(),
    contract.getAllocationCount(),
    contract.getProofCount(),
  ])

  return {
    balance: balance.toString(),
    totalAllocated: totalAllocated.toString(),
    cycleNumber: Number(cycleNumber),
    allocationCount: Number(allocationCount),
    proofCount: Number(proofCount),
  }
}
