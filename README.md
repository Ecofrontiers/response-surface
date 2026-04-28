# Response Surface

Credibility-weighted disaster response coordination on verifiable infrastructure.

## What It Does

Bioregional agents monitor government APIs (NASA EONET, FIRMS, USGS, GBIF, AirNow, iNaturalist), assess disaster severity, and relay assessments through an encrypted AXL mesh. A coordinator uses sealed inference (0G Compute TEE) to allocate ResponseFund resources based on credibility-weighted scores. An adversarial agent demonstrates the credibility gate — zero verified proofs means roughly 10% of fund allocation despite inflated severity claims. All agent identities live on ENS (Sepolia) with credibility scores in text records; fund allocations happen on 0G Chain with audit logs on 0G Storage.

## Architecture

```
[Government APIs] --> [Agent Nodes] --AXL Mesh--> [Coordinator]
                                                        |
                                               [0G Compute TEE]
                                                        |
                                          [ResponseFund on 0G Chain]
                                                        |
                                            [0G Storage Audit Log]
```

- **ENS on Sepolia** — agent identity, 0G addresses, and credibility scores in text records
- **Astral on Base Sepolia** — location proofs (offchain attestations) for responders
- **4-node AXL mesh** — encrypted inter-agent message delivery across isolated nodes

## Tracks

| Track | Prize | Our Integration |
|---|---|---|
| 0G Autonomous Agents | $7,500 | Swarm coordination + 0G Compute + Storage + Chain |
| Gensyn AXL | $5,000 | 4-node encrypted mesh, inter-agent message delivery |
| ENS Best AI Agent | $2,500 | Identity, credibility text records, allocation gating |
| ENS Most Creative | $2,500 | ENSIP-25 agent registration + proof-weighted credibility |

## Quick Start

```bash
git clone <repo>
cd ethglobal-openagents
cp .env.example .env        # fill in API keys
npm install
npm run build:contracts
npm run deploy
npm run dev:web             # http://localhost:5173
npm run dev:agents          # API server on :3001
cd axl && docker compose up -d   # AXL mesh
npm run demo                # full demo scenario
npm run demo:rogue          # adversarial agent demo
```

Required env vars: `EVM_PRIVATE_KEY`, `NASA_FIRMS_KEY`, `EPA_AIRNOW_KEY`, `VITE_MAPBOX_TOKEN`, `ASTRAL_COMPUTE_SCHEMA`

## Key Addresses

| Contract | Chain | Address |
|---|---|---|
| ENS Registry | Sepolia | `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e` |
| ENS Public Resolver | Sepolia | `0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5` |
| ERC-8004 Identity | Sepolia | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| FakeUSD (fUSD) | 0G Testnet | `0x6Cf1ed8721aB2B408d2a25797d6F71c9a17923A8` |
| ResponseFund | 0G Testnet | `0x7e0D9cf6045dd4ba622cd410a9F137a7A6d935a0` |

## Adversarial Defense

Credibility scores gate fund allocation using responder location proofs stored as ENS text records:

```
proofMultiplier = min(0.15 + proofCount * 0.28, 1.0)
```

- **Zero proofs** — multiplier 0.15 → rogue agent receives ~10% of fund despite inflated severity claims
- **3+ proofs** — multiplier 0.99 → honest agents receive ~90% of fund
- Scores accumulate across rounds via ENS text records; history cannot be faked

## Monorepo Structure

```
contracts/   Solidity (0G Chain, evmVersion: cancun, Solidity 0.8.24+)
agents/      Node.js services + MCP server
web/         React + Mapbox globe visualization
axl/         Docker configs for 4-node AXL mesh
```

## Built With

0G Chain / Compute / Storage, Gensyn AXL, ENS (ensjs + ENSIP-25), Astral SDK, NASA EONET / FIRMS / USGS / GBIF / AirNow / iNaturalist, Mapbox, React, Vite, ethers.js, viem

## License

MIT
