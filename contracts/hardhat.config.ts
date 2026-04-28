import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import { config as dotenvConfig } from 'dotenv'
import { resolve } from 'path'

dotenvConfig({ path: resolve(__dirname, '..', '.env') })

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      evmVersion: 'cancun',
      viaIR: true,
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    '0g-testnet': {
      url: 'https://evmrpc-testnet.0g.ai',
      chainId: 16602,
      accounts: process.env.EVM_PRIVATE_KEY ? [process.env.EVM_PRIVATE_KEY] : [],
    },
  },
}

export default config
