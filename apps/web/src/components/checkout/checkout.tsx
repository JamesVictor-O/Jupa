"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { EIP1193Provider } from "viem";
import { BridgeChain, type BridgeResult } from "@circle-fin/app-kit";
import type { ArcNetwork } from "@jupa/shared";
import { useCircleSdk, type CircleAuth } from "@/lib/circle-web";
import { useWalletEnvironment, walletDeepLinks, withPendingWalletAction } from "@/lib/mobile-wallets";

type ChargeView = {
  id: string;
  amount: string;
  amountLabel: string;
  storeName: string;
  status: string;
  expiresAt: string;
  network: string;
  payoutAddress: string;
  crosschainRecipient: string | null;
};

type WalletProvider = { info: { uuid: string; name: string; icon: string; rdns: string }; provider: EIP1193Provider };
type BrowserWithEthereum = typeof window & { ethereum?: EIP1193Provider };
type SourceNetwork = {
  name: string;
  chain: BridgeChain;
  family: "evm" | "solana";
  chainId?: number;
  rpc: string;
  currency: string;
  slow?: boolean;
};

const TESTNET_SOURCES: SourceNetwork[] = [
  { name: "Ethereum Sepolia", family: "evm", chain: BridgeChain.Ethereum_Sepolia, chainId: 11155111, rpc: "https://rpc.sepolia.org", currency: "ETH" },
  { name: "Base Sepolia", family: "evm", chain: BridgeChain.Base_Sepolia, chainId: 84532, rpc: "https://sepolia.base.org", currency: "ETH" },
  { name: "Arbitrum Sepolia", family: "evm", chain: BridgeChain.Arbitrum_Sepolia, chainId: 421614, rpc: "https://sepolia-rollup.arbitrum.io/rpc", currency: "ETH" },
  { name: "Avalanche Fuji", family: "evm", chain: BridgeChain.Avalanche_Fuji, chainId: 43113, rpc: "https://api.avax-test.network/ext/bc/C/rpc", currency: "AVAX", slow: true },
  { name: "OP Sepolia", family: "evm", chain: BridgeChain.Optimism_Sepolia, chainId: 11155420, rpc: "https://sepolia.optimism.io", currency: "ETH" },
  { name: "Polygon Amoy", family: "evm", chain: BridgeChain.Polygon_Amoy_Testnet, chainId: 80002, rpc: "https://rpc-amoy.polygon.technology", currency: "POL", slow: true },
  { name: "Unichain Sepolia", family: "evm", chain: BridgeChain.Unichain_Sepolia, chainId: 1301, rpc: "https://sepolia.unichain.org", currency: "ETH" },
  { name: "Linea Sepolia", family: "evm", chain: BridgeChain.Linea_Sepolia, chainId: 59141, rpc: "https://rpc.sepolia.linea.build", currency: "ETH" },
  { name: "Solana Devnet", family: "solana", chain: BridgeChain.Solana_Devnet, rpc: "https://api.devnet.solana.com", currency: "SOL" },
];

const MAINNET_SOURCES: SourceNetwork[] = [
  { name: "Ethereum", family: "evm", chain: BridgeChain.Ethereum, chainId: 1, rpc: "https://ethereum-rpc.publicnode.com", currency: "ETH", slow: true },
  { name: "Base", family: "evm", chain: BridgeChain.Base, chainId: 8453, rpc: "https://mainnet.base.org", currency: "ETH" },
  { name: "Arbitrum", family: "evm", chain: BridgeChain.Arbitrum, chainId: 42161, rpc: "https://arb1.arbitrum.io/rpc", currency: "ETH" },
  { name: "Avalanche", family: "evm", chain: BridgeChain.Avalanche, chainId: 43114, rpc: "https://api.avax.network/ext/bc/C/rpc", currency: "AVAX", slow: true },
  { name: "Optimism", family: "evm", chain: BridgeChain.Optimism, chainId: 10, rpc: "https://mainnet.optimism.io", currency: "ETH" },
  { name: "Polygon", family: "evm", chain: BridgeChain.Polygon, chainId: 137, rpc: "https://polygon-bor-rpc.publicnode.com", currency: "POL", slow: true },
  { name: "Unichain", family: "evm", chain: BridgeChain.Unichain, chainId: 130, rpc: "https://mainnet.unichain.org", currency: "ETH" },
  { name: "Linea", family: "evm", chain: BridgeChain.Linea, chainId: 59144, rpc: "https://rpc.linea.build", currency: "ETH" },
  { name: "Solana", family: "solana", chain: BridgeChain.Solana, rpc: "https://api.mainnet-beta.solana.com", currency: "SOL" },
];

function decimalUsdc(baseUnits: string) {
  const padded = baseUnits.padStart(7, "0");
  const whole = padded.slice(0, -6);
  const fraction = padded.slice(-6).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

async function discoverWallets() {
  const providers = new Map<string, WalletProvider>();
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<WalletProvider>).detail;
    if (detail?.info?.uuid && detail.provider) providers.set(detail.info.uuid, detail);
  };
  window.addEventListener("eip6963:announceProvider", listener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await wait(300);
  window.removeEventListener("eip6963:announceProvider", listener);
  return [...providers.values()];
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function Checkout({
  charge,
  arcNetwork,
  circleAppId,
  googleClientId,
  walletConnectProjectId,
  embedded = false,
}: {
  charge: ChargeView;
  arcNetwork: ArcNetwork;
  circleAppId?: string;
  googleClientId?: string;
  walletConnectProjectId?: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const circle = useCircleSdk(circleAppId, googleClientId);
  const sources = arcNetwork === "mainnet" ? MAINNET_SOURCES : TESTNET_SOURCES;
  const destinationChain = arcNetwork === "mainnet" ? BridgeChain.Arc : BridgeChain.Arc_Testnet;
  const [email, setEmail] = useState("");
  const [auth, setAuth] = useState<CircleAuth | null>(null);
  const [method, setMethod] = useState<"external" | "jupa">("external");
  const [source, setSource] = useState<SourceNetwork>(sources[1]);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [quote, setQuote] = useState<{ fee: string; total: string; raw: string } | null>(null);
  const providerRef = useRef<EIP1193Provider | null>(null);
  const recoveryRef = useRef<BridgeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const env = useWalletEnvironment();
  // WalletConnect never brings the wallet app forward on a phone; we show a tap-to-open button.
  const [pendingWallet, setPendingWallet] = useState<string | null>(null);
  const [walletConnectPeer, setWalletConnectPeer] = useState<{ name: string; link: string | null } | null>(null);
  const [useWalletConnect, setUseWalletConnect] = useState(false);
  const walletConnectChainsRef = useRef<string[] | null>(null);

  useEffect(() => {
    if (charge.status === "paid") router.replace(`/receipt/${charge.id}`);
  }, [charge.id, charge.status, router]);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(`jupa:bridge:${charge.id}`);
    if (!saved) return;
    try {
      recoveryRef.current = JSON.parse(saved) as BridgeResult;
    } catch {
      window.sessionStorage.removeItem(`jupa:bridge:${charge.id}`);
    }
  }, [charge.id]);

  async function action(name: "wallet" | "wallet-status" | "approve" | "pay", current: CircleAuth) {
    const response = await fetch(`/api/checkout/${charge.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: name, userToken: current.userToken }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Payment could not continue.");
    return data as { walletReady?: boolean; approved?: boolean; paid?: boolean; challengeId?: string };
  }

  async function pay() {
    const currentAuth = auth ?? circle.socialAuth;
    if (!currentAuth) return;
    setBusy(true);
    setMessage("Preparing your USDC payment…");
    try {
      const wallet = await action("wallet", currentAuth);
      if (wallet.challengeId) {
        setMessage("Set up your secure Arc wallet to continue.");
        await circle.execute(wallet.challengeId, currentAuth);
        setMessage("Waiting for your wallet…");
        let walletReady = false;
        for (let attempt = 0; attempt < 30; attempt += 1) {
          await wait(2_000);
          const ready = await action("wallet-status", currentAuth);
          if (ready.walletReady) {
            walletReady = true;
            break;
          }
        }
        if (!walletReady) throw new Error("Wallet setup is taking longer than expected. Try Pay again in a moment.");
      }

      const approval = await action("approve", currentAuth);
      if (approval.challengeId) {
        setMessage("Approve USDC access in the secure wallet window.");
        await circle.execute(approval.challengeId, currentAuth);
      }

      setMessage("Waiting for approval confirmation…");
      let payment: Awaited<ReturnType<typeof action>> | null = null;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        try {
          payment = await action("pay", currentAuth);
          break;
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes("still confirming")) throw error;
          await wait(2_000);
        }
      }
      if (!payment) throw new Error("Approval is taking longer than expected. Try Pay again in a moment.");
      if (payment.paid) return router.replace(`/receipt/${charge.id}`);
      if (!payment.challengeId) throw new Error("Payment approval could not be created.");

      setMessage(`Confirm payment of ${charge.amountLabel} in the secure wallet window.`);
      await circle.execute(payment.challengeId, currentAuth);
      setMessage("Payment sent. Waiting for confirmation…");

      for (let attempt = 0; attempt < 60; attempt += 1) {
        const response = await fetch(`/api/charges/${charge.id}`, { cache: "no-store" });
        const latest = await response.json();
        if (latest.status === "paid" || latest.status === "needs_attention") {
          return router.replace(`/receipt/${charge.id}`);
        }
        await wait(2_000);
      }
      router.replace(`/receipt/${charge.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment could not continue.");
      setBusy(false);
    }
  }

  async function emailSignIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      setAuth(await circle.signInWithEmail(email));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  const unavailable = charge.status === "expired" || charge.status === "needs_attention";

  async function connectedAdapter() {
    if (source.family === "solana") {
      const { createSolanaKitAdapterFromProvider } = await import("@circle-fin/adapter-solana-kit");
      type SolanaProvider = Parameters<typeof createSolanaKitAdapterFromProvider>[0]["provider"];
      const provider = (window as typeof window & { solana?: SolanaProvider }).solana;
      if (!provider) throw new Error("Install or open a Solana wallet such as Phantom.");
      setWalletName("Solana wallet");
      setWalletAddress(null);
      return createSolanaKitAdapterFromProvider({ provider });
    }
    let provider = providerRef.current;
    if (!provider) {
      const wallets = await discoverWallets();
      const selected = wallets[0];
      if (selected) {
        provider = selected.provider;
        setWalletName(selected.info.name);
      } else if ((window as BrowserWithEthereum).ethereum) {
        // Some mobile wallet browsers still inject only the legacy EIP-1193
        // provider and do not announce themselves through EIP-6963.
        provider = (window as BrowserWithEthereum).ethereum!;
        setWalletName("Mobile wallet");
      } else {
        if (!walletConnectProjectId) {
          throw new Error("Mobile wallet connection is not configured yet. Open this page inside your wallet app or try again later.");
        }
        const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
        const evmSources = sources.filter((item): item is SourceNetwork & { chainId: number } => item.family === "evm" && item.chainId !== undefined);
        const chainIds = evmSources.map((item) => item.chainId) as [number, ...number[]];
        const rpcMap = Object.fromEntries(evmSources.map((item) => [item.chainId, item.rpc]));
        const walletConnect = await EthereumProvider.init({
          projectId: walletConnectProjectId,
          optionalChains: chainIds,
          rpcMap,
          showQrModal: true,
          metadata: {
            name: "Jupa",
            description: "Pay merchants with USDC from your wallet",
            url: window.location.origin,
            icons: [`${window.location.origin}/favicon.ico`],
          },
          qrModalOptions: { themeMode: "light" },
        });
        try {
          await walletConnect.connect();
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          if (/401|403|origin|allowlist|unauthorized|project/i.test(detail)) {
            throw new Error(`WalletConnect rejected ${window.location.origin}. Add this exact origin to the Reown project allowlist, then try again.`);
          }
          if (/reject|cancel|close/i.test(detail)) throw new Error("Wallet connection was cancelled. Tap Connect wallet & review to try again.");
          throw new Error(`WalletConnect could not open a mobile wallet. ${detail}`);
        }
        const peer = walletConnect.session?.peer.metadata;
        setWalletConnectPeer({ name: peer?.name ?? "your wallet", link: peer?.redirect?.native ?? peer?.redirect?.universal ?? null });
        walletConnectChainsRef.current = walletConnect.session?.namespaces?.eip155?.chains ?? null;
        provider = withPendingWalletAction(walletConnect as EIP1193Provider, setPendingWallet);
        setWalletName(peer?.name ?? "WalletConnect");
      }
      providerRef.current = provider;
    }
    let accounts = (await provider.request({ method: "eth_accounts" })) as string[];
    if (!accounts[0]) accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    if (!accounts[0]) throw new Error("No wallet account was selected.");
    setWalletAddress(accounts[0]);

    const approved = walletConnectChainsRef.current;
    if (approved && !approved.includes(`eip155:${source.chainId}`)) {
      throw new Error(`Your wallet didn't allow ${source.name} when it connected. Pick another network above, or disconnect Jupa in your wallet and connect again.`);
    }
    const target = `0x${source.chainId!.toString(16)}`;
    const current = (await provider.request({ method: "eth_chainId" })) as string;
    if (current.toLowerCase() !== target.toLowerCase()) {
      try {
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: target }] });
      } catch (error) {
        const code = (error as { code?: number }).code;
        if (code !== 4902) throw error;
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{ chainId: target, chainName: source.name, rpcUrls: [source.rpc], nativeCurrency: { name: source.currency, symbol: source.currency, decimals: 18 } }],
        });
      }
    }
    const { createViemAdapterFromProvider } = await import("@circle-fin/adapter-viem-v2");
    return createViemAdapterFromProvider({ provider });
  }

  async function estimateExternal() {
    if (!charge.crosschainRecipient) return setMessage("Cross-chain payments are not configured on this server yet.");
    setBusy(true);
    setMessage("Connecting wallet and checking the route…");
    try {
      const adapter = await connectedAdapter();
      const { AppKit } = await import("@circle-fin/app-kit");
      const kit = new AppKit();
      const estimate = await kit.estimateBridge({
        from: { adapter, chain: source.chain },
        to: { chain: destinationChain, recipientAddress: charge.crosschainRecipient, useForwarder: true },
        amount: decimalUsdc(charge.amount),
        config: { feePayment: "source", transferSpeed: source.slow ? "SLOW" : "FAST" },
      });
      setQuote({ fee: estimate.feeTotal, total: estimate.totalDebit, raw: estimate.quote });
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This bridge route could not be quoted.");
    } finally {
      setBusy(false);
    }
  }

  async function payExternal() {
    if (!charge.crosschainRecipient || !quote) return;
    setBusy(true);
    setMessage("Keep this page open and approve each wallet step.");
    try {
      const adapter = await connectedAdapter();
      const { AppKit } = await import("@circle-fin/app-kit");
      const kit = new AppKit();
      kit.on("bridge.approve", () => setMessage("USDC approved. Preparing the cross-chain transfer…"));
      kit.on("bridge.burn", () => setMessage("USDC sent. Circle is forwarding it to Arc…"));
      kit.on("bridge.fetchAttestation", () => setMessage("Verifying the cross-chain transfer…"));
      kit.on("bridge.mint", () => setMessage("USDC reached Arc. Finalizing the merchant payment…"));
      const result = recoveryRef.current
        ? await kit.retryBridge(recoveryRef.current, { from: adapter })
        : await kit.bridge({
            from: { adapter, chain: source.chain },
            to: { chain: destinationChain, recipientAddress: charge.crosschainRecipient, useForwarder: true },
            amount: decimalUsdc(charge.amount),
            config: { feePayment: "source", transferSpeed: source.slow ? "SLOW" : "FAST" },
            quote: quote.raw,
          });
      await reportBridgeAttempt(result);
      if (result.state !== "success") {
        recoveryRef.current = result;
        window.sessionStorage.setItem(`jupa:bridge:${charge.id}`, JSON.stringify(result, (_key, value) => typeof value === "bigint" ? value.toString() : value));
        const failed = result.steps.find((step) => step.state === "error");
        throw new Error(failed?.errorMessage ?? "The bridge paused before completion. Your completed steps remain recoverable.");
      }
      recoveryRef.current = null;
      window.sessionStorage.removeItem(`jupa:bridge:${charge.id}`);
      setMessage("Payment received on Arc. Creating your receipt…");
      for (let attempt = 0; attempt < 90; attempt += 1) {
        const response = await fetch(`/api/charges/${charge.id}`, { cache: "no-store" });
        const latest = await response.json();
        if (latest.status === "paid" || latest.status === "needs_attention") return router.replace(`/receipt/${charge.id}`);
        await wait(2_000);
      }
      router.replace(`/receipt/${charge.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The cross-chain payment could not continue.");
      setBusy(false);
    }
  }

  async function reportBridgeAttempt(result: BridgeResult) {
    const stepHash = (name: string) => result.steps.find((step) => step.name.toLowerCase().includes(name))?.txHash ?? null;
    try {
      await fetch(`/api/checkout/${charge.id}/bridge-attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: result.provider,
          sourceChain: result.source.chain.chain,
          sourceWallet: result.source.address,
          destinationAddress: charge.crosschainRecipient,
          amount: result.amount,
          token: result.token,
          state: result.state,
          burnTxHash: stepHash("burn"),
          mintTxHash: stepHash("mint"),
        }),
      });
    } catch {
      // Arc settlement remains authoritative; reporting must never block payment recovery.
    }
  }

  return (
    <main className={`flex w-full items-center px-4 py-5 sm:px-6 lg:px-8 lg:py-6 ${embedded ? "min-h-[calc(100svh-5rem)] lg:min-h-svh" : "min-h-svh"}`}>
      <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-float lg:grid-cols-[0.8fr_1.2fr]">
        <div className="bg-canvas p-6 sm:p-8 lg:flex lg:flex-col lg:justify-between lg:p-10">
          <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Pay {charge.storeName}</p>
        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.06em]">{charge.amountLabel}</h1>
        <dl className="mt-7 grid gap-3 rounded-2xl bg-white p-5 text-sm">
          <div className="flex justify-between gap-5"><dt className="text-muted">Asset</dt><dd className="font-semibold">USDC</dd></div>
          <div className="flex justify-between gap-5"><dt className="text-muted">Network</dt><dd className="font-semibold">{charge.network}</dd></div>
          <div className="flex justify-between gap-5"><dt className="text-muted">Recipient</dt><dd className="max-w-48 truncate font-mono text-xs">{charge.payoutAddress}</dd></div>
        </dl>
          </div>
          <p className="mt-6 break-all text-xs leading-relaxed text-muted">Charge {charge.id}<br />Expires {new Date(charge.expiresAt).toLocaleTimeString()}</p>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">

        {!unavailable && (
          <div className="mt-6 grid grid-cols-2 rounded-2xl bg-canvas p-1">
            <button type="button" onClick={() => setMethod("external")} className={`rounded-xl px-3 py-3 text-sm font-semibold ${method === "external" ? "bg-white shadow-sm" : "text-muted"}`}>External wallet</button>
            <button type="button" onClick={() => setMethod("jupa")} className={`rounded-xl px-3 py-3 text-sm font-semibold ${method === "jupa" ? "bg-white shadow-sm" : "text-muted"}`}>Jupa wallet</button>
          </div>
        )}

        {unavailable ? (
          <p className="mt-6 rounded-2xl bg-coral/25 p-4">This payment request is no longer available.</p>
        ) : method === "external" ? (
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-semibold" htmlFor="source-network">Pay USDC from</label>
            <select id="source-network" value={source.chain} disabled={busy} onChange={(event) => { const next = sources.find((item) => item.chain === event.target.value); if (next) { setSource(next); setQuote(null); setWalletAddress(null); setWalletName(null); providerRef.current = null; walletConnectChainsRef.current = null; setWalletConnectPeer(null); } }} className="w-full rounded-2xl border-2 border-ink bg-white px-5 py-4 outline-none">
              {sources.map((item) => <option value={item.chain} key={item.chain}>{item.name}</option>)}
            </select>
            {walletAddress && <p className="text-sm text-muted">{walletName ?? "Wallet"} · {walletAddress.slice(0, 7)}…{walletAddress.slice(-5)}</p>}
            {source.family === "solana" && walletName && <p className="text-sm text-muted">{walletName} connected. SOL is required for source-chain network fees.</p>}
            {env.mobile && !hasInjectedWallet(source.family, env) && !useWalletConnect && !walletName ? (
              <OpenInWallet family={source.family} onWalletConnect={source.family === "evm" && walletConnectProjectId ? () => setUseWalletConnect(true) : undefined} />
            ) : quote ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-canvas p-5 text-sm"><div className="flex justify-between"><span className="text-muted">Merchant receives</span><strong>{charge.amountLabel}</strong></div><div className="mt-2 flex justify-between"><span className="text-muted">Bridge and forwarding fee</span><strong>{quote.fee} USDC</strong></div><div className="mt-2 flex justify-between border-t border-line pt-2"><span>Total wallet debit</span><strong>{quote.total} USDC + gas</strong></div></div>
                <button type="button" disabled={busy} onClick={payExternal} className="w-full rounded-2xl bg-ink px-5 py-4 text-lg font-semibold text-white disabled:opacity-60">{busy ? "Payment in progress…" : `Confirm ${quote.total} USDC`}</button>
                <button type="button" disabled={busy} onClick={() => setQuote(null)} className="w-full text-sm font-semibold underline">Change route</button>
              </div>
            ) : (
              <button type="button" disabled={busy || !charge.crosschainRecipient} onClick={estimateExternal} className="w-full rounded-2xl bg-ink px-5 py-4 text-lg font-semibold text-white disabled:opacity-50">{busy ? "Checking route…" : "Connect wallet & review"}</button>
            )}
            <p className="text-xs leading-relaxed text-muted">Circle CCTP moves USDC to a unique Arc receiver for this charge. It can only forward funds to the merchant’s registered payout address.</p>
          </div>
        ) : !(auth ?? circle.socialAuth) ? (
          <div className="mt-6 space-y-4">
            <button
              type="button"
              disabled={!circle.ready || busy}
              onClick={() => circle.signInWithGoogle().catch((error) => setMessage(error.message))}
              className="w-full rounded-2xl border border-line px-5 py-4 text-lg font-semibold disabled:opacity-50"
            >
              Continue with Google
            </button>
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted"><span className="h-px flex-1 bg-line" />or use email<span className="h-px flex-1 bg-line" /></div>
            <form onSubmit={emailSignIn} className="space-y-3">
              <label className="block text-sm font-semibold" htmlFor="checkout-email">Email</label>
              <input id="checkout-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-2xl border-2 border-ink bg-white px-5 py-4 outline-none" />
              <button disabled={!circle.ready || busy} className="w-full rounded-2xl bg-ink px-5 py-4 text-lg font-semibold text-white disabled:opacity-50">Continue</button>
            </form>
          </div>
        ) : (
          <div className="mt-6">
            <p className="mb-4 text-sm text-muted">You will approve the exact amount above, then confirm the payment. Jupa cannot change the amount or recipient.</p>
            <button type="button" disabled={busy} onClick={pay} className="w-full rounded-2xl bg-ink px-5 py-4 text-lg font-semibold text-white disabled:opacity-60">
              {busy ? "Payment in progress…" : `Pay ${charge.amountLabel}`}
            </button>
          </div>
        )}

        {pendingWallet && walletConnectPeer && (
          <div role="status" className="mt-5 rounded-2xl bg-mint p-4 text-mint-ink">
            <p className="font-semibold">Approve in {walletConnectPeer.name}</p>
            <p className="mt-1 text-sm">Your wallet is waiting for you. Open it, approve, then come back here.</p>
            {walletConnectPeer.link && (
              <a href={walletConnectPeer.link} className="mt-3 grid min-h-12 place-items-center rounded-xl bg-ink px-5 font-semibold text-white">
                Open {walletConnectPeer.name}
              </a>
            )}
          </div>
        )}

        {(message || circle.error || circle.socialError) && (
          <p role="status" className="mt-5 rounded-2xl bg-coral/20 p-4 text-sm">{message ?? circle.socialError ?? circle.error}</p>
        )}
        </div>
      </section>
    </main>
  );
}

function hasInjectedWallet(family: "evm" | "solana", env: { injectedEvm: boolean; injectedSolana: boolean }) {
  return family === "evm" ? env.injectedEvm : env.injectedSolana;
}

/** On a phone with no wallet in the page: reopen this checkout inside a wallet app's browser. */
function OpenInWallet({ family, onWalletConnect }: { family: "evm" | "solana"; onWalletConnect?: () => void }) {
  const href = typeof window === "undefined" ? "" : window.location.href;
  const wallets = href ? walletDeepLinks(family, href) : [];
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Open this payment in your wallet app</p>
      {wallets.map((w) => (
        <a key={w.id} href={w.href} className="grid min-h-14 place-items-center rounded-2xl bg-ink px-5 text-lg font-semibold text-white">
          Open in {w.name}
        </a>
      ))}
      {onWalletConnect && (
        <button type="button" onClick={onWalletConnect} className="w-full rounded-2xl border border-line px-5 py-4 font-semibold">
          Use another wallet
        </button>
      )}
      <p className="text-xs leading-relaxed text-muted">Your wallet opens this same page. Approvals appear right there, so you don&apos;t need to switch apps.</p>
    </div>
  );
}
