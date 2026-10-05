"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { LogoMark, Sparkle } from "@/components/art";
import { useCircleSdk, type CircleAuth } from "@/lib/circle-web";
import type { PublicStore } from "@/lib/stores";

type Props = {
  circleAppId: string | undefined;
  googleClientId: string | undefined;
  signedIn: boolean;
  email: string | null;
  store: PublicStore | null;
  explorerUrl: string;
};

type Step = "email" | "store" | "done";

/**
 * Flow A from the PRD: sign in with email -> name, logo, payout address -> printable QR,
 * payment link and till URL. Target: under two minutes.
 */
export function Onboarding({ circleAppId, googleClientId, signedIn, email: initialEmail, store: initialStore, explorerUrl }: Props) {
  const router = useRouter();
  const circle = useCircleSdk(circleAppId, googleClientId);
  const auth = useRef<CircleAuth | null>(null);
  const handledSocialToken = useRef<string | null>(null);
  const [store, setStore] = useState(initialStore);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [socialSessionError, setSocialSessionError] = useState<string | null>(null);
  const step: Step = store ? "done" : signedIn ? "store" : "email";

  async function finishSignIn(result: CircleAuth) {
    auth.current = result;
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userToken: result.userToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Sign-in didn't finish. Try again.");
    router.refresh(); // re-reads the session on the server and moves to the next step
  }

  async function signIn(address: string) {
    await finishSignIn(await circle.signInWithEmail(address));
  }

  useEffect(() => {
    const result = circle.socialAuth;
    if (!result || handledSocialToken.current === result.userToken) return;
    handledSocialToken.current = result.userToken;
    setSocialSessionError(null);
    finishSignIn(result).catch((err) => setSocialSessionError((err as Error).message));
    // finishSignIn only depends on the stable router and this effect must run once per returned token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circle.socialAuth]);

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <LogoMark className="size-7" />
          <span className="text-xl font-bold tracking-tight">Jupa</span>
        </Link>
        {signedIn && <SignOut />}
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-12">
        <StepMeter step={step} />
        {step === "email" && (
          <SignInStep
            email={email}
            setEmail={setEmail}
            ready={circle.ready}
            googleEnabled={Boolean(googleClientId)}
            sdkError={circle.error ?? circle.socialError ?? socialSessionError}
            onEmailSubmit={signIn}
            onGoogleSubmit={circle.signInWithGoogle}
          />
        )}
        {step === "store" && (
          <StoreStep
            auth={auth}
            email={email}
            circle={circle}
            onReauth={async () => {
              if (!email) throw new Error("Sign out and sign in again to create a wallet.");
              auth.current = await circle.signInWithEmail(email);
            }}
            onCreated={setStore}
          />
        )}
        {step === "done" && store && <DoneStep store={store} onStore={setStore} explorerUrl={explorerUrl} />}
      </main>
    </div>
  );
}

/* ---------- step 1: sign in ---------- */

function SignInStep({
  email,
  setEmail,
  ready,
  googleEnabled,
  sdkError,
  onEmailSubmit,
  onGoogleSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  ready: boolean;
  googleEnabled: boolean;
  sdkError: string | null;
  onEmailSubmit: (email: string) => Promise<void>;
  onGoogleSubmit: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("email");
    try {
      await onEmailSubmit(email.trim());
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  async function submitGoogle() {
    setError(null);
    setBusy("google");
    try {
      await onGoogleSubmit();
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">Set up your store</h1>
      <p className="mt-4 text-lg text-muted">Sign in to create your store and payment wallet.</p>

      {googleEnabled && (
        <SecondaryButton
          onClick={submitGoogle}
          busy={busy === "google"}
          disabled={!ready || Boolean(busy) || Boolean(sdkError)}
          className="mt-10 min-h-14 text-base"
        >
          {busy === "google" ? "Opening Google…" : <><GoogleMark /> Continue with Google</>}
        </SecondaryButton>
      )}

      {googleEnabled && (
        <div className="my-7 flex items-center gap-4" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">or use email</span>
          <span className="h-px flex-1 bg-line" />
        </div>
      )}

      <Field label="Email" htmlFor="email" error={error} className={googleEnabled ? "" : "mt-10"}>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "email-error" : undefined}
          placeholder="you@yourstore.com"
          className={inputClass}
        />
      </Field>

      {sdkError && (
        <p role="alert" className="mt-4 rounded-xl bg-coral/25 px-4 py-3 text-sm font-medium">
          {sdkError}
        </p>
      )}

      <PrimaryButton type="submit" busy={busy === "email"} disabled={!ready || !email.trim() || Boolean(busy) || Boolean(sdkError)} className="mt-8">
        {busy === "email" ? "Check your email" : ready || sdkError ? "Send me a code" : "Loading…"}
      </PrimaryButton>
      <p className="mt-4 text-center text-sm text-muted">
        Use the same sign-in method next time to access the same wallet.
      </p>
    </form>
  );
}

/* ---------- step 2: store details ---------- */

type PayoutMode = "wallet" | "own";

function StoreStep({
  auth,
  circle,
  onReauth,
  onCreated,
}: {
  auth: React.RefObject<CircleAuth | null>;
  email: string;
  circle: ReturnType<typeof useCircleSdk>;
  onReauth: () => Promise<void>;
  onCreated: (s: PublicStore) => void;
}) {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [mode, setMode] = useState<PayoutMode>("wallet");
  const [ownAddress, setOwnAddress] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const payout = mode === "wallet" ? walletAddress : ownAddress.trim();

  async function createWallet() {
    setWalletError(null);
    setWalletBusy(true);
    try {
      // Wallet creation needs a fresh Circle session; after a reload we only have our own cookie.
      if (!auth.current) await onReauth();
      const current = auth.current!;
      const res = await post("/api/wallet/init", { userToken: current.userToken });
      if (res.challengeId) await circle.execute(res.challengeId, current);
      setWalletAddress(await waitForWalletAddress(current.userToken));
    } catch (err) {
      setWalletError((err as Error).message);
    } finally {
      setWalletBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setErrors({});
    if (!payout) {
      setErrors({ payoutAddress: mode === "wallet" ? "Create your wallet first, or use your own address." : "Paste the address you want to be paid at." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, logo, payoutAddress: payout }),
      });
      const data = await res.json();
      if (res.status === 400 && data.errors) {
        setErrors(data.errors);
        setBusy(false);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "We couldn't create your store. Try again.");
      onCreated(data.store);
    } catch (err) {
      setFormError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">Your store</h1>
      <p className="mt-4 text-lg text-muted">This is what customers see when they scan.</p>

      <Field label="Store name" htmlFor="store-name" error={errors.name} className="mt-10">
        <input
          id="store-name"
          name="organization"
          autoComplete="organization"
          required
          maxLength={60}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "store-name-error" : undefined}
          placeholder="Kola Coffee"
          className={inputClass}
        />
      </Field>

      <LogoPicker value={logo} onChange={setLogo} error={errors.logo} />

      <fieldset className="mt-8">
        <legend className="text-sm font-bold">Where should payments go?</legend>
        <p className="mt-1 text-sm text-muted">Money goes straight to this address on Arc. Jupa never holds it.</p>
        <div role="radiogroup" className="mt-4 grid gap-3 sm:grid-cols-2">
          <ModeOption checked={mode === "wallet"} onSelect={() => setMode("wallet")} title="Create a wallet" body="Free, made for you in seconds." />
          <ModeOption checked={mode === "own"} onSelect={() => setMode("own")} title="Use my own" body="Paste an address you already have." />
        </div>

        {mode === "wallet" ? (
          <div className="mt-4 rounded-2xl bg-surface p-4 shadow-pill">
            {walletAddress ? (
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint text-mint-ink">
                  <CheckIcon />
                </span>
                <div className="min-w-0">
                  <p className="font-bold">Your wallet is ready</p>
                  <p className="truncate font-mono text-sm text-muted" title={walletAddress}>
                    {walletAddress}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <SecondaryButton onClick={createWallet} busy={walletBusy} disabled={walletBusy}>
                  {walletBusy ? "Creating your wallet…" : "Create my wallet"}
                </SecondaryButton>
                <p className="mt-3 text-xs text-muted">
                  Protected by Circle. Keep access to this email: it&apos;s how you get back into your wallet.
                </p>
              </>
            )}
            {walletError && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-700">
                {walletError}
              </p>
            )}
          </div>
        ) : (
          <Field label="Arc address" htmlFor="payout" error={errors.payoutAddress} className="mt-4">
            <input
              id="payout"
              name="payout"
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="off"
              value={ownAddress}
              onChange={(e) => setOwnAddress(e.target.value)}
              aria-invalid={errors.payoutAddress ? true : undefined}
              aria-describedby={errors.payoutAddress ? "payout-error" : undefined}
              placeholder="0x…"
              className={`${inputClass} font-mono text-base`}
            />
          </Field>
        )}
        {mode === "wallet" && errors.payoutAddress && (
          <p id="payout-error" className="mt-2 text-sm font-medium text-red-700">
            {errors.payoutAddress}
          </p>
        )}
      </fieldset>

      {formError && (
        <p role="alert" className="mt-6 rounded-xl bg-coral/25 px-4 py-3 text-sm font-medium">
          {formError}
        </p>
      )}

      <PrimaryButton type="submit" busy={busy} disabled={busy || !name.trim() || !payout} className="mt-10">
        {busy ? "Creating your store…" : "Create store"}
      </PrimaryButton>
    </form>
  );
}

/** Circle indexes a new wallet a moment after the challenge completes; poll briefly. */
async function waitForWalletAddress(userToken: string) {
  for (let i = 0; i < 12; i++) {
    const res = await fetch("/api/wallet/address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userToken }),
    });
    if (res.ok) return ((await res.json()) as { address: string }).address;
    if (res.status !== 404) throw new Error(((await res.json()) as { error?: string }).error ?? "We couldn't find your wallet.");
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Your wallet is taking longer than usual. Try again in a minute.");
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
  return data;
}

function ModeOption({ checked, onSelect, title, body }: { checked: boolean; onSelect: () => void; title: string; body: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`flex min-h-20 flex-col items-start rounded-2xl px-4 py-3 text-left ring-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
        checked ? "bg-surface ring-ink" : "bg-surface/60 ring-transparent hover:ring-line"
      }`}
    >
      <span className="flex w-full items-center justify-between font-bold">
        {title}
        <span className={`grid size-5 place-items-center rounded-full border-2 ${checked ? "border-ink bg-ink" : "border-line"}`}>
          {checked && <span className="size-1.5 rounded-full bg-white" />}
        </span>
      </span>
      <span className="mt-1 text-sm text-muted">{body}</span>
    </button>
  );
}

function LogoPicker({ value, onChange, error }: { value: string | null; onChange: (v: string | null) => void; error?: string }) {
  const id = useId();
  const [localError, setLocalError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    setLocalError(null);
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setLocalError("Use a PNG, JPG or WebP image.");
      return;
    }
    try {
      onChange(await squareThumbnail(file, 256));
    } catch {
      setLocalError("We couldn't read that image. Try another one.");
    }
  }

  const shown = localError ?? error;
  return (
    <div className="mt-6">
      <p className="text-sm font-bold">
        Logo <span className="font-medium text-muted">(optional)</span>
      </p>
      <div className="mt-2 flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface shadow-pill">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
            <img src={value} alt="Your logo" className="size-full object-cover" />
          ) : (
            <LogoMark className="size-6 text-line" />
          )}
        </div>
        <label
          htmlFor={id}
          className="inline-flex min-h-10 cursor-pointer items-center rounded-xl bg-surface px-4 text-sm font-semibold shadow-pill transition-colors hover:bg-mint focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink"
        >
          {value ? "Change" : "Upload"}
          <input
            id={id}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
            aria-describedby={shown ? `${id}-error` : undefined}
          />
        </label>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-muted hover:text-ink">
            Remove
          </button>
        )}
      </div>
      {shown && (
        <p id={`${id}-error`} className="mt-2 text-sm font-medium text-red-700">
          {shown}
        </p>
      )}
    </div>
  );
}

/** Center-crop to a square and downscale, so logos stay small enough to store inline. */
async function squareThumbnail(file: File, size: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/webp", 0.85);
}

/* ---------- step 3: done ---------- */

function DoneStep({ store, onStore, explorerUrl }: { store: PublicStore; onStore: (s: PublicStore) => void; explorerUrl: string }) {
  // Links and QR use the URL this page is served from; empty during server render.
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const [retrying, setRetrying] = useState(false);

  const payLink = `${origin}/s/${store.id}`;
  const tillUrl = `${origin}/till/${store.id}`;

  async function retry() {
    setRetrying(true);
    try {
      const res = await fetch(`/api/stores/${store.id}/register`, { method: "POST" });
      const data = await res.json();
      if (res.ok) onStore(data.store);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-semibold text-muted">
        <Sparkle className="size-3.5 text-ink" />
        You&apos;re set up
      </p>
      <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">{store.name} is live</h1>

      <RegistryStatus store={store} explorerUrl={explorerUrl} onRetry={retry} retrying={retrying} />

      {/* Printable poster: the only thing visible when printing (see globals.css). */}
      <div id="print-poster" className="mt-8 flex flex-col items-center rounded-3xl bg-surface p-8 text-center shadow-pill">
        <div className="flex items-center gap-3">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- stored data URL
            <img src={store.logoUrl} alt="" className="size-10 rounded-xl object-cover" />
          ) : (
            <span className="grid size-10 place-items-center rounded-xl bg-ink text-white">
              <LogoMark className="size-5" />
            </span>
          )}
          <span className="text-xl font-bold">{store.name}</span>
        </div>
        <div className="mt-6 rounded-2xl bg-white p-3 ring-1 ring-line">
          {origin ? <QRCodeSVG value={payLink} size={208} fgColor="#0e0e12" marginSize={1} title={`Pay ${store.name}`} /> : <div className="size-[208px]" />}
        </div>
        <p className="mt-5 font-display text-2xl font-bold tracking-tight">Scan to pay</p>
        <p className="mt-1 text-sm text-muted">USDC from any wallet</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard"
          className="grid min-h-12 place-items-center rounded-xl bg-ink px-5 font-bold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          Go to dashboard
        </Link>
        <Link
          href={`/till/${store.id}`}
          className="grid min-h-12 place-items-center rounded-xl bg-surface px-5 font-bold text-ink shadow-pill transition-colors hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          Open till
        </Link>
      </div>

      <button type="button" onClick={() => window.print()} className="mt-3 min-h-11 w-full rounded-xl text-sm font-bold text-muted underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
        Print payment QR
      </button>

      <dl className="mt-8 flex flex-col gap-3">
        <CopyRow label="Payment link" value={payLink} hint="Customers can open this instead of scanning." />
        <CopyRow label="Till" value={tillUrl} hint="Open on the phone or tablet at your counter." />
      </dl>
    </div>
  );
}

function RegistryStatus({
  store,
  explorerUrl,
  onRetry,
  retrying,
}: {
  store: PublicStore;
  explorerUrl: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  if (store.registryStatus === "registered" && store.registryTxHash) {
    return (
      <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
        <span className="grid size-5 place-items-center rounded-full bg-mint text-mint-ink">
          <CheckIcon />
        </span>
        Payout address saved onchain.
        <a
          href={`${explorerUrl}/tx/${store.registryTxHash}`}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-ink underline underline-offset-4"
        >
          View on Arc explorer<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    );
  }
  return (
    <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-coral/20 px-4 py-3 text-sm">
      <span>
        <span className="font-bold">Not ready for payments yet.</span> {store.registryError ?? "We're still saving your payout address."}
      </span>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="min-h-10 rounded-lg bg-ink px-4 font-semibold text-white disabled:opacity-50"
      >
        {retrying ? "Trying…" : "Try again"}
      </button>
    </div>
  );
}

function CopyRow({ label, value, hint }: { label: string; value: string; hint: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-pill">
      <div className="min-w-0 flex-1">
        <dt className="text-sm font-bold">{label}</dt>
        <dd className="truncate text-sm text-muted" title={value}>
          {value || "…"}
        </dd>
        <dd className="mt-1 text-xs text-muted">{hint}</dd>
      </div>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="min-h-10 shrink-0 rounded-xl bg-canvas px-4 text-sm font-semibold transition-colors hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}

/* ---------- shared bits ---------- */

const noopSubscribe = () => () => {};

const inputClass =
  "h-14 w-full rounded-xl bg-surface px-4 text-lg font-medium shadow-pill outline-none ring-2 ring-transparent transition-shadow placeholder:text-muted/70 focus-visible:ring-ink aria-[invalid=true]:ring-red-600";

function Field({
  label,
  htmlFor,
  error,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="text-sm font-bold">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error && (
        <p id={`${htmlFor}-error`} className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function StepMeter({ step }: { step: Step }) {
  const n = step === "email" ? 1 : step === "store" ? 2 : 3;
  return (
    <p className="mb-6 flex items-center gap-3 text-sm font-semibold text-muted" aria-label={`Step ${n} of 3`}>
      <span className="tabular-nums">{n}/3</span>
      <span className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-1 w-8 rounded-full transition-colors ${i <= n ? "bg-ink" : "bg-line"}`} />
        ))}
      </span>
    </p>
  );
}

function PrimaryButton({
  busy,
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      {...rest}
      aria-busy={busy || undefined}
      className={`flex h-16 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-ink to-ink-soft text-lg font-bold text-white shadow-pill transition-transform enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 enabled:active:scale-[0.99] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${className}`}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

function SecondaryButton({
  busy,
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      aria-busy={busy || undefined}
      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface px-5 font-bold shadow-pill ring-1 ring-line transition-colors enabled:hover:bg-mint disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${className}`}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

function Spinner() {
  return <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-canvas font-display text-sm font-bold ring-1 ring-line">
      G
    </span>
  );
}

function SignOut() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/sign-out", { method: "POST" });
        router.refresh();
      }}
      className="min-h-10 rounded-xl px-3 text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
    >
      Sign out
    </button>
  );
}
