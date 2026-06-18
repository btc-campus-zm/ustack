import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Delete, KeyRound, Sparkles } from "lucide-react";
import { useLock, verifyBiometric, PIN_LENGTH } from "@/lib/context/lock-context";

const DEMO_PIN = "1234";

function isDemoMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "lock";
}

type View = "fingerprint" | "pin";

export function LockScreen() {
  const { isLocked, hasPin, biometricsEnabled, hasBiometricCredential, unlock, getPin } = useLock();
  const [demo] = useState(isDemoMode);

  // Start on fingerprint view if bio is available, otherwise go straight to PIN
  const hasBio = demo || (biometricsEnabled && hasBiometricCredential);
  const [view, setView] = useState<View>(hasBio ? "fingerprint" : "pin");

  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [shake, setShake] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const [bioState, setBioState] = useState<"idle" | "scanning" | "failed">("idle");
  const [bioError, setBioError] = useState("");

  // Reset to fingerprint view each time lock screen opens
  useEffect(() => {
    if (!isLocked && !demo) return;
    setView(hasBio ? "fingerprint" : "pin");
    setPin(""); setPinError(""); setBioState("idle"); setBioError(""); setUnlocking(false);
  }, [isLocked, demo]);

  // Auto-trigger biometric scan on fingerprint view
  useEffect(() => {
    if (view !== "fingerprint" || demo) return;
    const t = setTimeout(() => triggerBio(), 400);
    return () => clearTimeout(t);
  }, [view, demo]);

  // Demo: auto-type PIN when on PIN view
  useEffect(() => {
    if (!demo || view !== "pin") return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(() => { if (!cancelled) fn(); }, ms);
      timers.push(t);
    };
    schedule(() => setPin("1"), 800);
    schedule(() => setPin("12"), 1200);
    schedule(() => setPin("123"), 1600);
    schedule(() => setPin("1234"), 2000);
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [demo, view]);

  const triggerBio = useCallback(async () => {
    if (demo) return;
    setBioState("scanning");
    setBioError("");
    try {
      const ok = await verifyBiometric();
      if (ok) {
        setUnlocking(true);
        setTimeout(() => { unlock(); setUnlocking(false); }, 700);
      } else {
        setBioState("failed");
        setBioError("Couldn't verify fingerprint");
      }
    } catch {
      setBioState("failed");
      setBioError("Biometric unavailable");
    }
  }, [unlock, demo]);

  // Auto-submit PIN
  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    const correct = demo ? DEMO_PIN : getPin();
    const t = setTimeout(() => {
      if (pin === correct) {
        setUnlocking(true);
        setTimeout(() => {
          if (demo) { setUnlocking(false); setPin(""); setBioState("idle"); setBioError(""); setView("fingerprint"); }
          else { unlock(); setPin(""); }
        }, 750);
      } else {
        setShake(true);
        setPinError("Incorrect PIN");
        setPin("");
        setTimeout(() => setShake(false), 500);
      }
    }, 100);
    return () => clearTimeout(t);
  }, [pin, demo, unlock, getPin]);

  const pressDigit = (d: number | "del") => {
    if (demo) return;
    setPinError("");
    if (d === "del") setPin((p) => p.slice(0, -1));
    else setPin((p) => (p.length < PIN_LENGTH ? p + d : p));
  };

  if (!demo && (!isLocked || !hasPin)) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="lockscreen"
        initial={{ opacity: 0 }}
        animate={{ opacity: unlocking ? 0 : 1, scale: unlocking ? 1.05 : 1 }}
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
              className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30 whitespace-nowrap"
            >
              <Sparkles className="w-3 h-3" />
              {view === "fingerprint" ? "Demo — tap fingerprint or switch to PIN" : "Demo — PIN auto-fills as 1 2 3 4"}
            </motion.div>
          )}

          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              animate={unlocking ? { scale: [1, 1.15, 0.95, 1.05, 1] } : {}}
              transition={{ duration: 0.6 }}
              className="w-16 h-16 rounded-[22px] bg-primary flex items-center justify-center shadow-float"
            >
              <span className="text-primary-foreground text-3xl font-black">U</span>
            </motion.div>
            <div className="text-xl font-bold mt-1">UStack</div>
          </div>

          {/* ── Fingerprint view ── */}
          <AnimatePresence mode="wait">
            {view === "fingerprint" ? (
              <motion.div
                key="bio-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-6 w-full"
              >
                {/* Big fingerprint icon */}
                <motion.button
                  onClick={triggerBio}
                  disabled={bioState === "scanning" || demo}
                  className="relative flex items-center justify-center w-32 h-32 rounded-full focus:outline-none"
                >
                  {/* Pulse rings */}
                  {(bioState === "idle" || bioState === "scanning") && (
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-full border border-primary/30"
                        animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full border border-primary/20"
                        animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut", delay: 0.4 }}
                      />
                    </>
                  )}
                  <div className={`w-28 h-28 rounded-full glass flex items-center justify-center transition-colors ${bioState === "failed" ? "border border-destructive/40" : "border border-primary/20"}`}>
                    <motion.div
                      animate={bioState === "scanning" ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 0.9 }}
                    >
                      <Fingerprint
                        className={`w-14 h-14 transition-colors ${
                          bioState === "failed" ? "text-destructive"
                          : bioState === "scanning" ? "text-primary"
                          : "text-primary"
                        }`}
                        strokeWidth={1.4}
                      />
                    </motion.div>
                  </div>
                </motion.button>

                {/* Status text */}
                <div className="text-center flex flex-col gap-1">
                  <AnimatePresence mode="wait">
                    {bioState === "failed" ? (
                      <motion.div key="fail" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <p className="text-sm text-destructive font-medium">{bioError}</p>
                        <button
                          onClick={triggerBio}
                          className="text-xs text-muted-foreground underline underline-offset-2 mt-1"
                        >
                          Try again
                        </button>
                      </motion.div>
                    ) : bioState === "scanning" ? (
                      <motion.p key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="text-sm text-primary font-medium">
                        Scanning…
                      </motion.p>
                    ) : (
                      <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="text-sm text-muted-foreground">
                        Touch the fingerprint sensor
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Use PIN instead */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  onClick={() => { setView("pin"); setBioState("idle"); setBioError(""); }}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl glass text-sm font-medium text-muted-foreground transition hover:text-foreground active:scale-95"
                >
                  <KeyRound className="w-4 h-4" />
                  Use PIN instead
                </motion.button>
              </motion.div>
            ) : (
              /* ── PIN view ── */
              <motion.div
                key="pin-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-6 w-full"
              >
                {/* PIN dots */}
                <div className="flex flex-col items-center gap-4">
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
                    {pinError ? (
                      <motion.p
                        key="err"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-destructive"
                      >
                        {pinError}
                      </motion.p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Enter your 4-digit PIN</p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-3 w-full">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                    <KeypadButton
                      key={d}
                      label={String(d)}
                      onPress={() => pressDigit(d)}
                      highlight={demo && DEMO_PIN[pin.length] === String(d) && pin.length < PIN_LENGTH}
                    />
                  ))}

                  {/* Bottom row */}
                  {hasBio ? (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => { setView("fingerprint"); setPin(""); setPinError(""); }}
                      className="h-16 rounded-2xl glass flex items-center justify-center transition"
                    >
                      <Fingerprint className="w-5 h-5 text-muted-foreground" />
                    </motion.button>
                  ) : (
                    <div />
                  )}

                  <KeypadButton
                    label="0"
                    onPress={() => pressDigit(0)}
                    highlight={demo && DEMO_PIN[pin.length] === "0" && pin.length < PIN_LENGTH}
                  />

                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => pressDigit("del")}
                    className="h-16 rounded-2xl glass flex items-center justify-center transition"
                  >
                    <Delete className="w-5 h-5 text-muted-foreground" />
                  </motion.button>
                </div>

                {/* Demo replay */}
                {demo && (
                  <button
                    onClick={() => { setPin(""); setPinError(""); setView("fingerprint"); }}
                    className="text-xs text-muted-foreground underline underline-offset-2"
                  >
                    Back to fingerprint demo
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom spacer */}
          <div />
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
      transition={highlight ? { duration: 0.28 } : {}}
      onClick={onPress}
      className={`h-16 rounded-2xl text-xl font-semibold flex items-center justify-center transition relative overflow-hidden ${highlight ? "glass ring-1 ring-primary/60" : "glass"}`}
    >
      {highlight && (
        <motion.div
          className="absolute inset-0 bg-primary/15"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 0.55 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}
