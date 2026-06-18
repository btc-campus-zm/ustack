import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Delete } from "lucide-react";
import { useLock, verifyBiometric, PIN_LENGTH } from "@/lib/context/lock-context";

export function LockScreen() {
  const { isLocked, hasPin, biometricsEnabled, hasBiometricCredential, unlock, getPin } = useLock();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

  // Auto-trigger biometrics on show
  useEffect(() => {
    if (isLocked && biometricsEnabled && hasBiometricCredential) {
      setTimeout(() => tryBiometric(), 400);
    }
  }, [isLocked]);

  // Auto-submit when PIN_LENGTH digits entered
  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      setTimeout(() => {
        if (pin === getPin()) {
          unlock();
          setPin("");
          setError("");
        } else {
          setShake(true);
          setError("Incorrect PIN");
          setPin("");
          setTimeout(() => setShake(false), 500);
        }
      }, 120);
    }
  }, [pin]);

  const tryBiometric = useCallback(async () => {
    if (bioLoading) return;
    setBioLoading(true);
    setError("");
    try {
      const ok = await verifyBiometric();
      if (ok) {
        unlock();
      } else {
        setError("Biometric failed. Use your PIN.");
      }
    } catch {
      setError("Biometric unavailable. Use your PIN.");
    } finally {
      setBioLoading(false);
    }
  }, [bioLoading, unlock]);

  const pressDigit = (d: number | "del") => {
    setError("");
    if (d === "del") {
      setPin((p) => p.slice(0, -1));
    } else {
      setPin((p) => (p.length < PIN_LENGTH ? p + d : p));
    }
  };

  if (!isLocked || !hasPin) return null;

  const showBio = biometricsEnabled && hasBiometricCredential;

  return (
    <AnimatePresence>
      <motion.div
        key="lockscreen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
      >
        <div className="w-full max-w-[420px] h-screen flex flex-col items-center justify-between px-8 py-16">

          {/* Logo + title */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-[22px] bg-primary flex items-center justify-center shadow-float">
              <span className="text-primary-foreground text-3xl font-black">U</span>
            </div>
            <div className="text-xl font-bold mt-1">UStack</div>
            <div className="text-sm text-muted-foreground">Enter your PIN to continue</div>
          </div>

          {/* PIN dots */}
          <div className="flex flex-col items-center gap-6">
            <motion.div
              animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              className="flex gap-5"
            >
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: pin.length === i + 1 ? [1, 1.35, 1] : 1,
                    backgroundColor: i < pin.length
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
                  className="text-xs text-destructive text-center"
                >
                  {error}
                </motion.p>
              ) : (
                <div className="h-4" />
              )}
            </AnimatePresence>
          </div>

          {/* Keypad */}
          <div className="w-full flex flex-col items-center gap-4">
            <div className="grid grid-cols-3 gap-3 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <KeypadButton key={d} label={String(d)} onPress={() => pressDigit(d)} />
              ))}

              {/* Bottom row: biometrics | 0 | del */}
              {showBio ? (
                <button
                  onClick={tryBiometric}
                  disabled={bioLoading}
                  className="h-16 rounded-2xl glass flex items-center justify-center transition active:scale-95"
                >
                  <motion.div
                    animate={bioLoading ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  >
                    <Fingerprint
                      className={`w-6 h-6 ${bioLoading ? "text-primary" : "text-muted-foreground"}`}
                    />
                  </motion.div>
                </button>
              ) : (
                <div />
              )}

              <KeypadButton label="0" onPress={() => pressDigit(0)} />

              <button
                onClick={() => pressDigit("del")}
                className="h-16 rounded-2xl glass flex items-center justify-center transition active:scale-95"
              >
                <Delete className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function KeypadButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onPress}
      className="h-16 rounded-2xl glass text-xl font-semibold flex items-center justify-center transition"
    >
      {label}
    </motion.button>
  );
}
