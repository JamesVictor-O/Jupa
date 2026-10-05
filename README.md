# Jupa

Checkout for a real counter. A customer scans a QR and taps Pay, and the merchant receives
USDC on Arc, whichever chain the customer's USDC started on.

## Layout

```
apps/web         Next.js: till, checkout, dashboard, receipts, charge API
apps/indexer     Arc watcher that marks charges Paid on final transfers
packages/shared  Arc config, USDC amount helpers, charge state rules, registry ABI
packages/db      Drizzle schema + client (stores, charges, payments)
contracts        Foundry: registry + deterministic crosschain payment receivers
```

## Getting started

```bash
pnpm install
git submodule update --init          # forge-std
cp .env.example .env
pnpm db:up && pnpm db:push           # Postgres in Docker + schema
pnpm dev:all                         # web + payment indexer
pnpm test                            # vitest + forge test
```

Deploy the registry:

```bash
cd contracts
cast wallet import jupa-deployer --interactive
forge script script/Deploy.s.sol --rpc-url arc_testnet --account jupa-deployer --broadcast
forge script script/DeployCrosschain.s.sol --rpc-url arc_testnet --account jupa-deployer --broadcast
```

## How Arc is used

- **Settlement.** Every payment ends as one USDC transfer on Arc to the merchant's payout
  address. USDC is also the gas token, so merchants never hold another asset.
- **Store registry.** `StoreRegistry` maps `storeId` to the payout address and is the source
  of truth for where money goes. Configure its address and deployment block in `.env`.
- **Direct pay.** `StoreRegistry.pay(storeId, chargeRef, amount)` moves USDC from the customer
  straight to the payout and emits `ChargePaid` with the charge reference for matching.
- **Cross-chain.** Circle App Kit and CCTP move USDC from supported EVM and Solana source networks.
  Source-paid fees keep the invoice amount exact and Forwarding Service submits the Arc mint.
- **Attribution.** Each charge has a deterministic, counterfactual Arc receiver. After CCTP
  mints there, the indexer deploys it and the constructor forwards its entire balance to the
  registry's current payout address. This prevents same-amount invoices from being confused.
- **Finality.** The till shows Paid only after the Arc transfer is final.

The web process creates Circle wallet challenges but never receives a private key. The
separate indexer must run continuously in production; it settles funded crosschain receivers,
replays both payment contracts from their deployment blocks, verifies the registry payout,
and updates receipts idempotently.

## Roadmap

Off-ramp to local currency, card payments via Onramp Kit, Gateway unified balances,
refunds/tips/staff accounts, and yield on idle balances.
