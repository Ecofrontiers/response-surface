# Response Surface

Coordination infrastructure for disaster response agent swarms — fund allocation, proof aggregation, and reputation tracking as verifiable open primitives.

> EthGlobal Open Agents Hackathon 2026

## Architecture

```
Government APIs (macro)     Responder Proofs (micro)
  NASA EONET/FIRMS              Astral stamps
  GBIF, USGS, EPA              Location verification
        │                            │
        ▼                            ▼
  ┌─────────────────────────────────────┐
  │     Bioregional Agent Swarm         │
  │  (fire, water, coordinator)         │
  │     Connected via Gensyn AXL        │
  └───────────────┬─────────────────────┘
                  │ assessments + proofs
                  ▼
  ┌─────────────────────────────────────┐
  │     0G Compute — Sealed Inference   │
  │  Coordinator pools all signals →    │
  │  optimal allocation plan (TEE)      │
  └───────────────┬─────────────────────┘
                  │ allocation plan
                  ▼
  ┌─────────────────────────────────────┐
  │     0G Chain — ResponseFund         │
  │  Fund → agents → responders         │
  │  Every tx logged to 0G Storage      │
  └───────────────┬─────────────────────┘
                  │ credibility scores
                  ▼
  ┌─────────────────────────────────────┐
  │     ENS — Reputation Spine          │
  │  Subnames per agent/responder       │
  │  Credibility in text records        │
  │  ENSIP-25 ↔ ERC-8004               │
  └─────────────────────────────────────┘
```

## Setup

```bash
npm install
cp .env.example .env     # Fill in API keys
```

## Dev

```bash
npm run build:contracts   # Compile Solidity (0G Chain, evmVersion: cancun)
npm run deploy            # Deploy to 0G testnet
npm run dev:web           # Start frontend (Vite + React + Mapbox)
npm run dev:agents        # Start agent services
npm run demo              # Run full demo scenario
cd axl && ./scripts/start-cluster.sh  # Start 3 AXL nodes
```

## Sponsor Integrations

| Sponsor | Role | Remove It And... |
|---------|------|-----------------|
| **0G** | Sealed inference (Compute), audit log (Storage), fund contract (Chain) | No verifiable allocation, no audit trail, no programmable disbursement |
| **Gensyn AXL** | Agent-to-agent P2P mesh (MCP services, A2A discovery, convergecast) | Need a central coordinator everyone trusts (doesn't exist in cross-org disaster response) |
| **ENS** | Reputation spine — credibility scores accumulate on ENS names, ENSIP-25 links to ERC-8004 | No identity, no discovery, no reputation, no proof attribution |
| **Astral** | Stamp collection + location proof verification + credibility scoring in TEE | No ground-truth verification, coordinator relies on self-reported locations |

## License

MIT
