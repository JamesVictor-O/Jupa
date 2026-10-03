# Jupa

Checkout for a real counter. A customer scans a QR and taps Pay, and the merchant receives
USDC on Arc, whichever chain the customer's USDC started on.

## Layout

```
apps/web         Next.js: till, checkout, dashboard, receipts, charge API
apps/indexer     Arc watcher that marks charges Paid on final transfers
packages/shared  Arc config, USDC amount helpers, charge state rules, registry ABI
packages/db      Drizzle schema + client (stores, charges, payments)
contracts        Foundry: StoreRegistry (storeId -> payout, non-custodial pay)
```

## Getting started

```bash
pnpm install
git submodule update --init          # forge-std
cp .env.example .env
pnpm db:up && pnpm db:push           # Postgres in Docker + schema
pnpm dev                             # web on http://localhost:3000
pnpm dev:indexer                     # needs STORE_REGISTRY_ADDRESS
pnpm test                            # vitest + forge test
```

Deploy the registry:

```bash
cd contracts
cast wallet import jupa-deployer --interactive
forge script script/Deploy.s.sol --rpc-url arc_testnet --account jupa-deployer --broadcast
```

## How Arc is used

- **Settlement.** Every payment ends as one USDC transfer on Arc to the merchant's payout
  address. USDC is also the gas token, so merchants never hold another asset.
- **Store registry.** `StoreRegistry` maps `storeId` to the payout address and is the source
  of truth for where money goes. Address: _TBD after deploy_.
- **Direct pay.** `StoreRegistry.pay(storeId, chargeRef, amount)` moves USDC from the customer
  straight to the payout and emits `ChargePaid` with the charge reference for matching.
- **Cross-chain.** Circle App Kit / CCTP (Fast Transfer where offered) from Base (P0) and
  Ethereum, Arbitrum and Solana (P1); Gateway balances (P1).
- **Finality.** The till shows Paid only after the Arc transfer is final.

## Roadmap

Off-ramp to local currency, card payments via Onramp Kit, more chains with Gateway-first
routing, refunds/tips/staff accounts, yield on idle balances.
