# Jupa

In-person USDC checkout that settles to merchants on Arc. Read `README.md` for layout and commands.

## Rules
- Customer-facing copy says Pay / Paying / Paid. Never Bridge, Mint, Attest or chain names,
  except one small line showing which balance was used.
- Non-custodial: funds never pass through Jupa. Payout addresses come from the onchain
  StoreRegistry, never from the browser.
- USDC amounts are `bigint` in 6-decimal base units everywhere (`@jupa/shared` usdc helpers).
  On Arc, native gas and USDC are one balance. Never add the two views together.
- A charge is Paid only on a final Arc transfer of at least the amount, to the registered
  payout, that references the charge. Late and overpaid payments are credited and flagged.
- `apps/web` is Next.js 16. Read `apps/web/node_modules/next/dist/docs/` before using APIs.
- Keep `packages/shared/src/registry-abi.ts` in sync with `contracts/src/StoreRegistry.sol`.
- Secrets in `.env` only (gitignored). Deploy with a Foundry keystore, never `--private-key`.
