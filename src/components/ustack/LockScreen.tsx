import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Delete, Sparkles } from "lucide-react";
import { useLock, verifyBiometric, PIN_LENGTH } from "@/lib/context/lock-context";

const DEMO_PIN = "1234";

function isDemoMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "lock";
}

export function LockScreen() {
  const { isLocked, hasPin, biometricsEnabled, hasBiometricCredential, unlock, getPin } = useLock();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [demo] = useState(isDemoMode);

  // In demo mode, auto-type the PIN digit by digit after a short delay
  useEffect(() => {
    if (!demo) return;
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const start = () => {
      timers.push(setTimeout(() => {
        const t0 = setTimeout(() => { setPin("1"); }, 700);
        const t1 = setTimeout(() => { setPin("12"); }, 1100);
        const t2 = setTimeout(() => { setPin("123"); }, 1500);
        const t3 = setTimeout(() => { setPin("1234"); }, 1900);
        timers.push(t0, t1, t2, t3);
        i++;
      }, i === 0 ? 1200 : 0));
    };
    start();
    return () => timers.forEach(clearTimeout);
  }, [demo]);

  // Auto-submit on full PIN
  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    const correct = demo ? DEMO_PIN : getPin();
    const timer = setTimeout(() => {
      if (pin === correct) {
        setUnlocking(true);
        setTimeout(() => {
          if (demo) {
            // In demo, just reset and replay
            setUnlocking(false);
            setPin("");
            setError("");
          } else {
            unlock();
            setPin("");
            setError("");
          }
        }, 800);
      } else {
        setShake(true);
        setError("Incorrect PIN");
        setPin("");
        setTimeout(() => setShake(false), 500);
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [pin, demo, unlock, getPin]);

  const tryBiometric = useCallback(async () => {
    if (bioLoading || demo) return;
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
  }, [bioLoading, unlock, demo]);

  const pressDigit = (d: number | "del") => {
    if (demo) return; // demo is auto-driven
    setError("");
    if (d === "del") {
      setPin((p) => p.slice(0, -1));
    } else {
      setPin((p) => (p.length < PIN_LENGTH ? p + d : p));
    }
  };

  // Only show in real mode if locked + PIN set, or if demo mode
  if (!demo && (!isLocked || !hasPin)) return null;

  const showBio = demo || (biometricsEnabled && hasBiometricCredential);

  return (
    <AnimatePresence>
      <motion.div
        key="lockscreen"
        initial={{ opacity: 0 }}
        animate={{ opacity: unlocking ? 0 : 1, scale: unlocking ? 1.06 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
      >
        <div className="w-full max-w-[420px] h-screen flex flex-col items-center justify-between px-8 py-16">

          {/* Demo badge */}
          {demo && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30"
            >
              <Sparkles className="w-3 h-3" />
              Demo Mode — PIN auto-fills as 1 2 3 4
            </motion.div>
          )}

          {/* Logo + title */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              animate={unlocking ? { scale: [1, 1.15, 0.95, 1.05, 1], rotate: [0, -3, 3, -2, 0] } : {}}
              transition={{ duration: 0.6 }}
              className="w-16 h-16 rounded-[22px] bg-primary flex items-center justify-center shadow-float"
            >
              <span className="text-primary-foreground text-3xl font-black">U</span>
            </motion.div>
            <div className="text-xl font-bold mt-1">UStack</div>
            <AnimatePresence mode="wait">
              {unlocking ? (
                <motion.div
                  key="unlocked"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm font-medium"
                  style={{ color: "oklch(0.86 0.13 160)" }}
                >
                  Unlocked ✓
                </motion.div>
              ) : (
                <motion.div
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-muted-foreground"
                >
                  {showBio ? "Use fingerprint or enter your PIN" : "Enter your PIN to continue"}
                </motion.div>
              )}
            </AnimatePresence>
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
                    scale: pin.length === i + 1 ? [1, 1.35, 1] : unlocking && i < pin.length ? [1, 1.2, 1] : 1,
                    backgroundColor: i < pin.length
                      ? unlocking ? "oklch(0.86 0.13 160)" : "oklch(0.73 0.19 55)"
                      : "oklch(0.28 0.01 260)",
                  }}
                  transition={{ duration: 0.15, delay: unlocking ? i * 0.06 : 0 }}
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
                <KeypadButton
                  key={d}
                  label={String(d)}
                  onPress={() => pressDigit(d)}
                  highlight={demo && pin.length === d - 1 && String(d) === DEMO_PIN[pin.length]}
                />
              ))}

              {/* Bottom row: biometrics | 0 | del */}
              {showBio ? (
                <motion.button
                  whileTap={demo ? {} : { scale: 0.92 }}
                  onClick={tryBiometric}
                  disabled={bioLoading || demo}
                  className="h-16 rounded-2xl glass flex items-center justify-center transition relative overflow-hidden"
                >
                  {demo && (
                    <motion.div
                      className="absolute inset-0 bg-primary/10"
                      animate={{ opacity: [0, 0.6, 0] }}
                      transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
                    />
                  )}
                  <motion.div
                    animate={demo
                      ? { scale: [1, 1.12, 1] }
                      : bioLoading ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ repeat: Infinity, duration: demo ? 2.5 : 0.8, delay: 0.5 }}
                  >
                    <Fingerprint
                      className={`w-6 h-6 ${demo ? "text-primary" : bioLoading ? "text-primary" : "text-muted-foreground"}`}
                    />
                  </motion.div>
                </motion.button>
              ) : (
                <div />
              )}

              <KeypadButton
                label="0"
                onPress={() => pressDigit(0)}
                highlight={demo && DEMO_PIN[pin.length] === "0"}
              />

              <motion.button
                whileTap={demo ? {} : { scale: 0.92 }}
                onClick={() => pressDigit("del")}
                className="h-16 rounded-2xl glass flex items-center justify-center transition"
              >
                <Delete className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            </div>

            {/* Demo replay prompt */}
            {demo && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                onClick={() => {
                  setPin("");
                  setError("");
                  setUnlocking(false);
                }}
                className="text-xs text-muted-foreground underline underline-offset-2 mt-1"
              >
                Replay demo
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function KeypadButton({
  label,
  onPress,
  highlight,
}: {
  label: string;
  onPress: () => void;
  highlight?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      animate={highlight ? { scale: [1, 1.08, 1] } : {}}
      transition={highlight ? { duration: 0.3 } : {}}
      onClick={onPress}
      className={`h-16 rounded-2xl text-xl font-semibold flex items-center justify-center transition relative overflow-hidden ${highlight ? "glass ring-1 ring-primary/60" : "glass"}`}
    >
      {highlight && (
        <motion.div
          className="absolute inset-0 bg-primary/15"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}
