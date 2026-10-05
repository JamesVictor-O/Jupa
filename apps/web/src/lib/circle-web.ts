"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";
import { SocialLoginProvider } from "@circle-fin/w3s-pw-web-sdk/dist/src/types";

export type CircleAuth = { userToken: string; encryptionKey: string };

type LoginHandler = (err: { code?: number; message?: string } | undefined, result: CircleAuth | undefined) => void;

const SOCIAL_DEVICE_TOKEN = "jupa_social_device_token";
const SOCIAL_DEVICE_KEY = "jupa_social_device_key";

function readCookie(name: string) {
  const prefix = `${name}=`;
  const match = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : "";
}

function writeSocialCookie(name: string, value: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=600; SameSite=Lax${secure}`;
}

function clearSocialCookies() {
  document.cookie = `${SOCIAL_DEVICE_TOKEN}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${SOCIAL_DEVICE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * Browser side of Circle's user-controlled wallets. Loads the SDK lazily (it is browser-only),
 * registers the device, and wraps the callback API in promises.
 * The userToken lives only in memory: never in localStorage.
 */
export function useCircleSdk(appId: string | undefined, googleClientId?: string) {
  const sdkRef = useRef<W3SSdk | null>(null);
  const onLogin = useRef<LoginHandler | null>(null);
  const socialCallbackPage = useRef<boolean | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(appId ? null : "Sign-in isn't set up on this server yet.");
  const [socialAuth, setSocialAuth] = useState<CircleAuth | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);

  const loginCallback = useCallback<LoginHandler>((err, result) => {
    console.info("[auth] Circle login callback", { ok: Boolean(result), errorCode: err?.code ?? null });
    if (onLogin.current) {
      onLogin.current(err, result);
      return;
    }

    // Social OAuth returns by reloading this page, so there is no pending promise to resolve.
    clearSocialCookies();
    if (err || !result) {
      setSocialError(err?.message || "Social sign-in didn't finish. Try again.");
      return;
    }
    setSocialError(null);
    setSocialAuth({ userToken: result.userToken, encryptionKey: result.encryptionKey });
  }, []);

  useEffect(() => {
    if (!appId) return;
    let cancelled = false;
    (async () => {
      const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
      const deviceToken = readCookie(SOCIAL_DEVICE_TOKEN);
      const deviceEncryptionKey = readCookie(SOCIAL_DEVICE_KEY);
      // The SDK consumes Google's OAuth response from the URL hash during construction.
      // It uses one iframe for both that verification and getDeviceId(), so requesting a
      // device ID at the same time replaces the verification iframe before it can finish.
      // Keep the initial result across React Strict Mode's development-only second effect.
      // Circle clears the hash during the first SDK construction, so recomputing this on
      // the second pass would incorrectly start getDeviceId() and replace its iframe.
      socialCallbackPage.current ??= Boolean(window.location.hash && window.localStorage.getItem("socialLoginProvider"));
      const isSocialCallback = socialCallbackPage.current;
      console.info("[auth] Circle SDK init", {
        socialCallback: isSocialCallback,
        hasDeviceToken: Boolean(deviceToken),
        hasDeviceEncryptionKey: Boolean(deviceEncryptionKey),
      });
      const socialConfig =
        googleClientId && deviceToken && deviceEncryptionKey
          ? {
              loginConfigs: {
                deviceToken,
                deviceEncryptionKey,
                google: {
                  clientId: googleClientId,
                  redirectUri: `${window.location.origin}${window.location.pathname}`,
                  selectAccountPrompt: true,
                },
              },
            }
          : {};
      const sdk = new W3SSdk({ appSettings: { appId }, ...socialConfig }, loginCallback);
      sdkRef.current = sdk;
      if (isSocialCallback) {
        console.info("[auth] Waiting for Circle social verification");
        return;
      }
      // Required before anything else: registers this browser with Circle.
      const id = await sdk.getDeviceId();
      if (!cancelled) setDeviceId(id);
    })().catch(() => {
      if (!cancelled) setError("Sign-in couldn't load. Check your connection and reload.");
    });
    return () => {
      cancelled = true;
    };
  }, [appId, googleClientId, loginCallback]);

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

  /** Create a short-lived device session, then hand off to Google's OAuth screen. */
  const signInWithGoogle = useCallback(async () => {
    const sdk = sdkRef.current;
    if (!sdk || !deviceId || !appId) throw new Error("Sign-in is still loading. Try again in a moment.");
    if (!googleClientId) throw new Error("Google sign-in isn't configured yet.");

    setSocialError(null);
    const res = await fetch("/api/auth/social-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Google sign-in couldn't start. Try again.");

    writeSocialCookie(SOCIAL_DEVICE_TOKEN, data.deviceToken);
    writeSocialCookie(SOCIAL_DEVICE_KEY, data.deviceEncryptionKey);
    console.info("[auth] Starting Google redirect");
    sdk.updateConfigs(
      {
        appSettings: { appId },
        loginConfigs: {
          deviceToken: data.deviceToken,
          deviceEncryptionKey: data.deviceEncryptionKey,
          google: {
            clientId: googleClientId,
            redirectUri: `${window.location.origin}${window.location.pathname}`,
            selectAccountPrompt: true,
          },
        },
      },
      loginCallback,
    );
    await sdk.performLogin(SocialLoginProvider.GOOGLE);
  }, [appId, deviceId, googleClientId, loginCallback]);

  /** Run a Circle challenge (e.g. wallet creation); the user approves in Circle's UI. */
  const execute = useCallback((challengeId: string, auth: CircleAuth) => {
    const sdk = sdkRef.current;
    if (!sdk) return Promise.reject(new Error("Wallet setup is still loading. Try again in a moment."));
    sdk.setAuthentication(auth);
    return new Promise<void>((resolve, reject) => {
      sdk.execute(challengeId, (err) => (err ? reject(new Error(err.message || "Wallet setup was cancelled.")) : resolve()));
    });
  }, []);

  return { ready: Boolean(deviceId), error, socialAuth, socialError, signInWithEmail, signInWithGoogle, execute };
}
