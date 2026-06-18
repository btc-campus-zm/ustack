import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

const PIN_KEY = "ustack_pin";
const BIOMETRICS_KEY = "ustack_biometrics";
const CREDENTIAL_ID_KEY = "ustack_cred_id";
const LAST_UNLOCK_KEY = "ustack_last_unlock";
const FRESH_LOGIN_KEY = "ustack_fresh_login";
const LOCK_TIMEOUT_MS = 60_000;

export const PIN_LENGTH = 4;

// ── WebAuthn helpers ──────────────────────────────────────────────────────────

function supportsWebAuthn() {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromB64url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function registerBiometric(): Promise<boolean> {
  if (!supportsWebAuthn()) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "UStack", id: window.location.hostname },
        user: { id: userId, name: "ustack-user", displayName: "UStack User" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;
    if (!cred) return false;
    localStorage.setItem(CREDENTIAL_ID_KEY, b64url(cred.rawId));
    return true;
  } catch {
    return false;
  }
}

export async function verifyBiometric(): Promise<boolean> {
  if (!supportsWebAuthn()) return false;
  const credIdStr = localStorage.getItem(CREDENTIAL_ID_KEY);
  if (!credIdStr) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credId = fromB64url(credIdStr);
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [{ type: "public-key", id: credId }],
        userVerification: "required",
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;
    return !!assertion;
  } catch {
    return false;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VerificationRequest {
  label: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

interface LockContextValue {
  isLocked: boolean;
  hasPin: boolean;
  biometricsEnabled: boolean;
  hasBiometricCredential: boolean;
  verificationRequest: VerificationRequest | null;
  unlock: () => void;
  lock: () => void;
  markFreshLogin: () => void;
  getPin: () => string;
  setPin: (pin: string) => void;
  clearPin: () => void;
  setBiometrics: (v: boolean) => void;
  setBiometricCredential: (v: boolean) => void;
  requestVerification: (label: string, onSuccess: () => void, onCancel?: () => void) => void;
  resolveVerification: () => void;
  cancelVerification: () => void;
}

const LockContext = createContext<LockContextValue>({
  isLocked: false,
  hasPin: false,
  biometricsEnabled: false,
  hasBiometricCredential: false,
  verificationRequest: null,
  unlock: () => {},
  lock: () => {},
  markFreshLogin: () => {},
  getPin: () => "",
  setPin: () => {},
  clearPin: () => {},
  setBiometrics: () => {},
  setBiometricCredential: () => {},
  requestVerification: (_label, onSuccess) => onSuccess(),
  resolveVerification: () => {},
  cancelVerification: () => {},
});

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [hasBiometricCredential, setHasBiometricCredential] = useState(false);
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null);
  const hiddenAt = useRef<number | null>(null);
  const hasPinRef = useRef(false);

  useEffect(() => {
    const pin = localStorage.getItem(PIN_KEY) ?? "";
    const bio = localStorage.getItem(BIOMETRICS_KEY) === "true";
    const cred = !!localStorage.getItem(CREDENTIAL_ID_KEY);
    const pinSet = pin.length === PIN_LENGTH;
    setHasPin(pinSet);
    hasPinRef.current = pinSet;
    setBiometricsEnabled(bio);
    setHasBiometricCredential(cred);

    const freshLogin = sessionStorage.getItem(FRESH_LOGIN_KEY);
    if (pinSet && !freshLogin) {
      setIsLocked(true);
    }
    sessionStorage.removeItem(FRESH_LOGIN_KEY);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
      } else if (document.visibilityState === "visible") {
        const pin = localStorage.getItem(PIN_KEY) ?? "";
        if (pin.length !== PIN_LENGTH) return;
        const elapsed = hiddenAt.current ? Date.now() - hiddenAt.current : Infinity;
        if (elapsed >= LOCK_TIMEOUT_MS) {
          setIsLocked(true);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const unlock = useCallback(() => {
    localStorage.setItem(LAST_UNLOCK_KEY, String(Date.now()));
    setIsLocked(false);
  }, []);

  const lock = useCallback(() => setIsLocked(true), []);

  const markFreshLogin = useCallback(() => {
    sessionStorage.setItem(FRESH_LOGIN_KEY, "1");
  }, []);

  const getPin = useCallback(() => localStorage.getItem(PIN_KEY) ?? "", []);

  const setPin = useCallback((pin: string) => {
    localStorage.setItem(PIN_KEY, pin);
    const pinSet = pin.length === PIN_LENGTH;
    setHasPin(pinSet);
    hasPinRef.current = pinSet;
  }, []);

  const clearPin = useCallback(() => {
    localStorage.removeItem(PIN_KEY);
    setHasPin(false);
    hasPinRef.current = false;
  }, []);

  const setBiometrics = useCallback((v: boolean) => {
    localStorage.setItem(BIOMETRICS_KEY, String(v));
    setBiometricsEnabled(v);
  }, []);

  const setBiometricCredential = useCallback((v: boolean) => {
    if (!v) localStorage.removeItem(CREDENTIAL_ID_KEY);
    setHasBiometricCredential(v);
  }, []);

  // If no PIN is set, skip verification and call onSuccess immediately
  const requestVerification = useCallback((
    label: string,
    onSuccess: () => void,
    onCancel?: () => void,
  ) => {
    if (!hasPinRef.current) {
      onSuccess();
      return;
    }
    setVerificationRequest({ label, onSuccess, onCancel });
  }, []);

  const resolveVerification = useCallback(() => {
    setVerificationRequest((req) => {
      req?.onSuccess();
      return null;
    });
  }, []);

  const cancelVerification = useCallback(() => {
    setVerificationRequest((req) => {
      req?.onCancel?.();
      return null;
    });
  }, []);

  return (
    <LockContext.Provider value={{
      isLocked, hasPin, biometricsEnabled, hasBiometricCredential,
      verificationRequest,
      unlock, lock, markFreshLogin,
      getPin, setPin, clearPin,
      setBiometrics, setBiometricCredential,
      requestVerification, resolveVerification, cancelVerification,
    }}>
      {children}
    </LockContext.Provider>
  );
}

export function useLock() {
  return useContext(LockContext);
}
