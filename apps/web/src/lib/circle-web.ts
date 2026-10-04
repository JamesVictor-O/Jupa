"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";

export type CircleAuth = { userToken: string; encryptionKey: string };

type LoginHandler = (err: { message?: string } | undefined, result: CircleAuth | undefined) => void;

/**
 * Browser side of Circle's user-controlled wallets. Loads the SDK lazily (it is browser-only),
 * registers the device, and wraps the callback API in promises.
 * The userToken lives only in memory: never in localStorage.
 */
export function useCircleSdk(appId: string | undefined) {
  const sdkRef = useRef<W3SSdk | null>(null);
  const onLogin = useRef<LoginHandler | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(appId ? null : "Sign-in isn't set up on this server yet.");

  const loginCallback = useCallback<LoginHandler>((err, result) => onLogin.current?.(err, result), []);

  useEffect(() => {
    if (!appId) return;
    let cancelled = false;
    (async () => {
      const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
      const sdk = new W3SSdk({ appSettings: { appId } }, loginCallback);
      sdkRef.current = sdk;
      // Required before anything else: registers this browser with Circle.
      const id = await sdk.getDeviceId();
      if (!cancelled) setDeviceId(id);
    })().catch(() => {
      if (!cancelled) setError("Sign-in couldn't load. Check your connection and reload.");
    });
    return () => {
      cancelled = true;
    };
  }, [appId, loginCallback]);

  /** Email a code, open Circle's code screen, resolve with the Circle session once verified. */
  const signInWithEmail = useCallback(
    async (email: string): Promise<CircleAuth> => {
      const sdk = sdkRef.current;
      if (!sdk || !deviceId || !appId) throw new Error("Sign-in is still loading. Try again in a moment.");

      const res = await fetch("/api/auth/email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, deviceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "We couldn't send a code. Try again.");

      return new Promise<CircleAuth>((resolve, reject) => {
        onLogin.current = (err, result) => {
          onLogin.current = null;
          if (err || !result) reject(new Error("That code didn't work. Request a new one and try again."));
          else resolve({ userToken: result.userToken, encryptionKey: result.encryptionKey });
        };
        sdk.updateConfigs(
          {
            appSettings: { appId },
            loginConfigs: {
              deviceToken: data.deviceToken,
              deviceEncryptionKey: data.deviceEncryptionKey,
              otpToken: data.otpToken,
            },
          },
          loginCallback,
        );
        sdk.verifyOtp();
      });
    },
    [appId, deviceId, loginCallback],
  );

  /** Run a Circle challenge (e.g. wallet creation); the user approves in Circle's UI. */
  const execute = useCallback((challengeId: string, auth: CircleAuth) => {
    const sdk = sdkRef.current;
    if (!sdk) return Promise.reject(new Error("Wallet setup is still loading. Try again in a moment."));
    sdk.setAuthentication(auth);
    return new Promise<void>((resolve, reject) => {
      sdk.execute(challengeId, (err) => (err ? reject(new Error(err.message || "Wallet setup was cancelled.")) : resolve()));
    });
  }, []);

  return { ready: Boolean(deviceId), error, signInWithEmail, execute };
}
