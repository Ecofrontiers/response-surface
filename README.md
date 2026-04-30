# Response Surface

Disaster response where every decision is verifiable.

Bioregional AI agents monitor real government data sources, relay assessments through an encrypted P2P mesh, and a coordinator allocates emergency funds weighted by onchain credibility scores. An adversarial agent proves the system works — inflated claims with zero proofs get crushed by the credibility gate.

## How It Works

Eleven agents run an allocation cycle every round — 8 regional monitors covering the contiguous US, a coordinator, and 2 adversarial agents that stress-test the credibility gate:

1. **Detection** — Regional agents (`pacific`, `mountain`, `central`, `lakes`, `delta`, `gulf`, `atlantic`, `northeast`) each monitor their bioregion via NASA EONET, FIRMS, USGS, GBIF, AirNow, and iNaturalist. Adversarial agents (`rogue`, `phantom`) submit inflated severity with zero verified proofs.
2. **Mesh** — Assessments relay through a Gensyn AXL P2P mesh with Ed25519 authentication. Each message is signed and verified.
3. **Identity** — The coordinator reads ENS text records on Sepolia to gate participation. Credibility scores, proof counts, bioregion bounds, and AXL public keys are all stored as ENS text records under `responsesurface.eth`.
4. **Compute** — Credibility-weighted allocation using the formula `proofMultiplier = min(0.15 + proofCount × 0.28, 1.0)`. With 0G Compute TEE configured, inference runs in a sealed enclave.
5. **Funds** — fUSD allocations execute on 0G Chain via the ResponseFund contract, weighted by `credibility × severity`.
6. **Audit** — The full cycle (assessments, scores, allocations) is uploaded as an immutable audit log to 0G Storage with a Merkle root.
7. **Update** — New credibility scores are written back to ENS text records, feeding the next cycle.

### Adversarial Defense

```
proofMultiplier = min(0.15 + proofCount × 0.28, 1.0)
```

Real allocation from a live cycle with 10 agents assessed:
- High-credibility regional agents (lakes, delta, gulf, atlantic, central, mountain) — ~13.6% each
- `northeast.responsesurface.eth` — 8.7%, `pacific.responsesurface.eth` — 7.2%
- `rogue.responsesurface.eth` — 1.2% (severity 9, crushed by credibility gate)
- `phantom.responsesurface.eth` — 1.2% (same pattern)

Scores accumulate across rounds via ENS text records. History cannot be faked.

## Architecture

```
NASA EONET ─┐                                    ┌─ 0G Chain (fUSD allocation)
FIRMS       ─┤                                    │
USGS        ─┼─ Agent Nodes ──AXL Mesh──> Coordinator ──> 0G Storage (audit log)
GBIF        ─┤      │                        │
AirNow      ─┤      │                        │
iNaturalist ─┘  ENS Sepolia ─────────────────┘
                (identity + credibility)
```

| Layer | Technology | What It Does |
|---|---|---|
| Identity | ENS on Sepolia | Agent names, credibility scores, proof counts, AXL pubkeys as text records |
| Communication | Gensyn AXL | Ed25519-authenticated P2P mesh between agent nodes |
| Data | 6 government APIs | NASA EONET, FIRMS, USGS Water, GBIF, EPA AirNow, iNaturalist |
| Compute | 0G Compute | Sealed inference in TEE (falls back to local when TEE unavailable) |
| Funds | 0G Chain | ResponseFund contract holds fUSD, allocates per-cycle |
| Audit | 0G Storage | Immutable cycle logs with Merkle roots |
| Location | Astral SDK | Offchain attestations for responder location proofs |

## Quick Start

```bash
git clone https://github.com/Ecofrontiers/bioregional-agents.git
cd bioregional-agents
cp .env.example .env        # fill in API keys (see below)
npm install
npm run dev:web             # frontend on http://localhost:5174
npm run dev:agents          # backend API on :3001
```

The frontend proxies `/api` to the backend. Click **Run Allocation Cycle** to execute the full pipeline with real API data and onchain transactions.

### Environment Variables

| Variable | Required | Source |
|---|---|---|
| `EVM_PRIVATE_KEY` | Yes | Wallet with Sepolia ETH + 0G testnet tokens |
| `VITE_MAPBOX_TOKEN` | Yes | [mapbox.com](https://mapbox.com) |
| `NASA_FIRMS_KEY` | Yes | [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/api/area/) |
| `EPA_AIRNOW_KEY` | Yes | [docs.airnowapi.org](https://docs.airnowapi.org/) |
| `ZG_COMPUTE_PROVIDER` | No | 0G Compute provider address (enables TEE) |

## Verify On-Chain

Everything is real and verifiable:

| What | Where |
|---|---|
| Agent identities | [pacific.responsesurface.eth](https://app.ens.domains/pacific.responsesurface.eth) on ENS (Sepolia) |
| Credibility scores | ENS text record `credibility.score` on each agent subname |
| ResponseFund contract | [0x7e0D...a0](https://chainscan-galileo.0g.ai/address/0x7e0D9cf6045dd4ba622cd410a9F137a7A6d935a0) on 0G Explorer |
| fUSD token | [0x6Cf1...A8](https://chainscan-galileo.0g.ai/address/0x6Cf1ed8721aB2B408d2a25797d6F71c9a17923A8) on 0G Explorer |

## Monorepo Structure

```
contracts/   Solidity on 0G Chain (evmVersion: cancun, 0.8.24+)
agents/      Node.js backend — MCP server, coordinator, government API integrations
web/         React + Mapbox globe with real bioregion boundaries
axl/         Gensyn AXL node configurations (4 nodes)
```

## Built With

0G (Chain, Compute, Storage), Gensyn AXL, ENS (ensjs, ENSIP-25), Astral SDK, NASA EONET, NASA FIRMS, USGS Water Services, GBIF, EPA AirNow, iNaturalist, Mapbox GL JS, React, Vite, ethers.js, viem

## License

MIT
