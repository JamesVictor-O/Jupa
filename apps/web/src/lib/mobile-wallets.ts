"use client";

import { useSyncExternalStore } from "react";
import type { EIP1193Provider } from "viem";

/**
 * Mobile wallet helpers for checkout.
 *
 * On a phone, the dependable way to pay from an external wallet is to open the checkout inside
 * the wallet's own in-app browser: the wallet is injected into the page, so each approval pops up
 * in place. WalletConnect from a regular mobile browser is the fallback, and needs the user to
 * hop to the wallet app for every request (see `withPendingWalletAction`).
 */

export type WalletFamily = "evm" | "solana";

type DeepLinkWallet = { id: string; name: string; family: WalletFamily; link: (url: URL) => string };

// Documented universal links that open a URL inside each wallet's in-app browser.
const DEEP_LINK_WALLETS: DeepLinkWallet[] = [
  { id: "metamask", name: "MetaMask", family: "evm", link: (u) => `https://metamask.app.link/dapp/${u.host}${u.pathname}${u.search}` },
  { id: "coinbase", name: "Coinbase Wallet", family: "evm", link: (u) => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(u.href)}` },
  { id: "trust", name: "Trust Wallet", family: "evm", link: (u) => `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(u.href)}` },
  {
    id: "phantom",
    name: "Phantom",
    family: "solana",
    link: (u) => `https://phantom.app/ul/browse/${encodeURIComponent(u.href)}?ref=${encodeURIComponent(u.origin)}`,
  },
];

export function walletDeepLinks(family: WalletFamily, href: string) {
  const url = new URL(href);
  return DEEP_LINK_WALLETS.filter((w) => w.family === family).map((w) => ({ id: w.id, name: w.name, href: w.link(url) }));
}

type InjectedWindow = typeof window & { ethereum?: unknown; solana?: unknown; phantom?: { solana?: unknown } };

function detectEnvironment() {
  const w = window as InjectedWindow;
  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return {
    mobile,
    injectedEvm: Boolean(w.ethereum),
    injectedSolana: Boolean(w.solana ?? w.phantom?.solana),
  };
}

const SERVER_ENV = { mobile: false, injectedEvm: false, injectedSolana: false };
let cached: ReturnType<typeof detectEnvironment> | null = null;
const noopSubscribe = () => () => {};

/** Whether we are on a phone and whether a wallet is injected into this page. Stable after mount. */
export function useWalletEnvironment() {
  return useSyncExternalStore(
    noopSubscribe,
    () => (cached ??= detectEnvironment()),
    () => SERVER_ENV,
  );
}

// Requests that need the person to look at their wallet and approve something.
const USER_ACTION_METHODS = new Set([
  "eth_requestAccounts",
  "eth_sendTransaction",
  "eth_signTypedData_v4",
  "eth_signTypedData",
  "personal_sign",
  "eth_sign",
  "wallet_switchEthereumChain",
  "wallet_addEthereumChain",
]);

/**
 * Wrap an EIP-1193 provider so the UI knows when a request is waiting on the wallet.
 * For WalletConnect on a phone this drives an "Open your wallet" button: WalletConnect never
 * brings the wallet app forward by itself, so without it each step silently waits.
 */
export function withPendingWalletAction(provider: EIP1193Provider, onPending: (method: string | null) => void): EIP1193Provider {
  let inFlight = 0;
  const request = (async (args: { method: string; params?: unknown }) => {
    if (!USER_ACTION_METHODS.has(args.method)) return provider.request(args as never);
    inFlight += 1;
    onPending(args.method);
    try {
      return await provider.request(args as never);
    } finally {
      inFlight -= 1;
      if (inFlight === 0) onPending(null);
    }
  }) as EIP1193Provider["request"];

  return new Proxy(provider, {
    get(target, prop, receiver) {
      if (prop === "request") return request;
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
