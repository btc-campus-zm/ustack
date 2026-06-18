import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, ArrowLeft, Check, Shield, Trash2, AlertCircle } from "lucide-react";
import { Sheet } from "./Sheet";
import { useLock, registerBiometric, PIN_LENGTH } from "@/lib/context/lock-context";
import { Delete } from "lucide-react";

type Step = "menu" | "pin-new" | "pin-confirm" | "pin-done" | "pin-remove" | "bio-setup" | "bio-done";

export function SecuritySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    hasPin, biometricsEnabled, hasBiometricCredential,
    setPin, clearPin, setBiometrics, setBiometricCredential, getPin,
  } = useLock();

  const [step, setStep] = useState<Step>("menu");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentEntry, setCurrentEntry] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

  useEffect(() => {
    if (open) reset();
  }, [open]);

  function reset() {
    setStep("menu");
    setNewPin(""); setConfirmPin(""); setCurrentEntry(""); setError("");
  }

  function close() { reset(); onClose(); }

  function triggerShake(msg: string) {
    setError(msg);
    setShake(true);
    setCurrentEntry("");
    setTimeout(() => setShake(false), 500);
  }

  function pressDigit(d: number | "del") {
    setError("");
    if (d === "del") {
      setCurrentEntry((p) => p.slice(0, -1));
      return;
    }
    const next = currentEntry.length < PIN_LENGTH ? currentEntry + d : currentEntry;
    setCurrentEntry(next);

    if (next.length === PIN_LENGTH) {
      setTimeout(() => {
        if (step === "pin-new") {
          setNewPin(next);
          setCurrentEntry("");
          setStep("pin-confirm");
        } else if (step === "pin-confirm") {
          if (next !== newPin) {
            setNewPin("");
            setCurrentEntry("");
            setStep("pin-new");
            triggerShake("PINs don't match — try again");
            return;
          }
          setPin(next);
          setCurrentEntry("");
          setStep("pin-done");
        } else if (step === "pin-remove") {
          if (next !== getPin()) {
            triggerShake("Incorrect PIN");
            return;
          }
          clearPin();
          setBiometrics(false);
          setBiometricCredential(false);
          setCurrentEntry("");
          setStep("menu");
        }
      }, 120);
    }
  }

  async function handleEnableBiometrics() {
    setBioLoading(true);
    setError("");
    try {
      const ok = await registerBiometric();
      if (ok) {
        setBiometrics(true);
        setBiometricCredential(true);
        setStep("bio-done");
      } else {
        setError("Could not register fingerprint. Your device may not support it.");
      }
    } catch {
      setError("Biometric registration failed.");
    } finally {
      setBioLoading(false);
    }
  }

  function handleDisableBiometrics() {
    setBiometrics(false);
    setBiometricCredential(false);
  }

  const pinLabels: Partial<Record<Step, string>> = {
    "pin-new": hasPin ? "Enter new PIN" : "Create a 4-digit PIN",
    "pin-confirm": "Confirm your PIN",
    "pin-remove": "Enter current PIN to remove it",
  };

  const showPinPad = step === "pin-new" || step === "pin-confirm" || step === "pin-remove";

  return (
    <Sheet open={open} onClose={close} title="Security">
      {step !== "menu" && (
        <button onClick={reset} className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5 -mt-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      )}

      {/* ── Menu ── */}
      {step === "menu" && (
        <div className="flex flex-col gap-4">

          {/* PIN section */}
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2">PIN Lock</div>
            <div className="rounded-2xl glass overflow-hidden">
              {!hasPin ? (
                <MenuItem
                  icon={Shield}
                  label="Set up 4-digit PIN"
                  sub="Lock the app with a PIN each time you open it"
                  onClick={() => { setStep("pin-new"); setCurrentEntry(""); setError(""); }}
                />
              ) : (
                <>
                  <MenuItem
                    icon={Shield}
                    label="Change PIN"
                    sub="Replace your current PIN with a new one"
                    onClick={() => { setStep("pin-new"); setCurrentEntry(""); setError(""); }}
                  />
                  <MenuItem
                    icon={Trash2}
                    label="Remove PIN"
                    sub="Disable PIN lock"
                    danger
                    onClick={() => { setStep("pin-remove"); setCurrentEntry(""); setError(""); }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Biometrics section */}
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-2">Biometrics</div>
            <div className="rounded-2xl glass overflow-hidden">
              {!hasPin ? (
                <div className="px-4 py-3.5 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">Set up a PIN first before enabling fingerprint login.</p>
                </div>
              ) : !hasBiometricCredential ? (
                <MenuItem
                  icon={Fingerprint}
                  label="Enable Fingerprint / Face ID"
                  sub="Use your device biometrics to unlock the app"
                  onClick={() => { setStep("bio-setup"); setError(""); }}
                />
              ) : (
                <MenuItem
                  icon={Fingerprint}
                  label="Disable Biometrics"
                  sub="Remove fingerprint / Face ID unlock"
                  danger
                  onClick={handleDisableBiometrics}
                />
              )}
            </div>
          </div>

          {hasPin && (
            <p className="text-center text-xs text-muted-foreground px-4">
              The lock screen appears every time you open the app, and after 60 seconds in the background.
            </p>
          )}
        </div>
      )}

      {/* ── PIN pad ── */}
      {showPinPad && (
        <div className="flex flex-col items-center gap-8">
          <p className="text-sm text-muted-foreground text-center">{pinLabels[step]}</p>

          <motion.div
            animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex gap-5"
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: currentEntry.length === i + 1 ? [1, 1.3, 1] : 1,
                  backgroundColor: i < currentEntry.length
                    ? "oklch(0.73 0.19 55)"
                    : "oklch(0.28 0.01 260)",
                }}
                transition={{ duration: 0.15 }}
                className="w-5 h-5 rounded-full"
              />
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {error ? (
              <motion.p
                key="err"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-destructive text-center -mt-4"
              >
                {error}
              </motion.p>
            ) : (
              <div className="h-4 -mt-4" />
            )}
          </AnimatePresence>

          <div className="grid grid-cols-3 gap-3 w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "del"].map((k, i) => {
              if (k === "") return <div key={i} />;
              if (k === "del") return (
                <motion.button
                  key="del"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => pressDigit("del")}
                  className="h-14 rounded-2xl glass flex items-center justify-center"
                >
                  <Delete className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              );
              return (
                <motion.button
                  key={k}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => pressDigit(k as number)}
                  className="h-14 rounded-2xl glass text-lg font-semibold flex items-center justify-center"
                >
                  {k}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PIN done ── */}
      {step === "pin-done" && (
        <div className="py-8 flex flex-col items-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-20 h-20 rounded-full bg-card border border-white/8 flex items-center justify-center"
            style={{ color: "oklch(0.86 0.13 160)" }}
          >
            <Check className="w-10 h-10" strokeWidth={3} />
          </motion.div>
          <div className="text-lg font-semibold">PIN saved</div>
          <p className="text-sm text-muted-foreground text-center">
            Your app will now lock whenever you close it.
          </p>
          {!hasBiometricCredential && (
            <button
              onClick={() => setStep("bio-setup")}
              className="mt-2 w-full glass py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Fingerprint className="w-4 h-4" /> Also enable fingerprint
            </button>
          )}
          <button onClick={close} className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-2xl">
            Done
          </button>
        </div>
      )}

      {/* ── Biometric setup ── */}
      {step === "bio-setup" && (
        <div className="flex flex-col items-center gap-6 py-4">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-24 h-24 rounded-full glass flex items-center justify-center"
          >
            <Fingerprint className="w-12 h-12 text-primary" />
          </motion.div>
          <div className="text-center">
            <div className="text-lg font-semibold">Fingerprint / Face ID</div>
            <p className="text-sm text-muted-foreground mt-1">
              Unlock UStack with your device biometrics instead of typing your PIN every time.
            </p>
          </div>
          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}
          <button
            onClick={handleEnableBiometrics}
            disabled={bioLoading}
            className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {bioLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
              />
            ) : (
              <><Fingerprint className="w-5 h-5" /> Set up now</>
            )}
          </button>
          <button onClick={reset} className="text-sm text-muted-foreground">
            Skip for now
          </button>
        </div>
      )}

      {/* ── Biometric done ── */}
      {step === "bio-done" && (
        <div className="py-8 flex flex-col items-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-20 h-20 rounded-full bg-card border border-white/8 flex items-center justify-center"
            style={{ color: "oklch(0.86 0.13 160)" }}
          >
            <Check className="w-10 h-10" strokeWidth={3} />
          </motion.div>
          <div className="text-lg font-semibold">Biometrics enabled</div>
          <p className="text-sm text-muted-foreground text-center">
            You can now unlock UStack with your fingerprint or Face ID.
          </p>
          <button onClick={close} className="mt-2 w-full bg-primary text-primary-foreground font-semibold py-4 rounded-2xl">
            Done
          </button>
        </div>
      )}
    </Sheet>
  );
}

function MenuItem({
  icon: Icon, label, sub, danger, onClick,
}: {
  icon: typeof Shield;
  label: string;
  sub?: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0 text-left"
    >
      <Icon className={`w-4 h-4 shrink-0 ${danger ? "text-destructive" : "text-muted-foreground"}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${danger ? "text-destructive" : ""}`}>{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </button>
  );
}
