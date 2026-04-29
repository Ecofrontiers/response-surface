# Response Surface

Disaster response where every decision is verifiable.

Bioregional AI agents monitor real government data sources, relay assessments through an encrypted P2P mesh, and a coordinator allocates emergency funds weighted by onchain credibility scores. An adversarial agent proves the system works — inflated claims with zero proofs get crushed by the credibility gate.

## How It Works

Four agents run an allocation cycle every round:

1. **Detection** — `fire.responsesurface.eth` monitors wildfires in California + Nevada via NASA EONET, FIRMS satellite hotspots, GBIF biodiversity, and EPA AirNow. `water.responsesurface.eth` monitors floods in the Lower Mississippi basin via USGS streamflow gauges, GBIF, and iNaturalist threatened species. `rogue.responsesurface.eth` submits inflated severity with zero verified proofs.
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

Real allocation from a live cycle:
- `water.responsesurface.eth` — credibility 1000/1000, 6 proofs → **70.5% of fund**
- `fire.responsesurface.eth` — credibility 820/1000, 4 proofs → **23.1% of fund**
- `rogue.responsesurface.eth` — credibility 101/1000, 0 proofs → **6.4% of fund** (severity 9, but crushed by credibility gate)

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
| Agent identities | [fire.responsesurface.eth](https://app.ens.domains/fire.responsesurface.eth) on ENS (Sepolia) |
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

## Tracks

| Track | Prize | Integration |
|---|---|---|
| 0G Autonomous Agents | $7,500 | 0G Compute (TEE inference) + Storage (audit Merkle roots) + Chain (fUSD allocation) |
| Gensyn AXL | $5,000 | 4-node Ed25519 mesh, assessment relay, peer discovery |
| ENS Best AI Agent | $2,500 | Credibility scores in text records gate fund allocation — remove ENS and the system breaks |
| ENS Most Creative | $2,500 | ENSIP-25 registration + proof-weighted credibility that accumulates across cycles |

## Built With

0G (Chain, Compute, Storage), Gensyn AXL, ENS (ensjs, ENSIP-25), Astral SDK, NASA EONET, NASA FIRMS, USGS Water Services, GBIF, EPA AirNow, iNaturalist, Mapbox GL JS, React, Vite, ethers.js, viem

## License

MIT
