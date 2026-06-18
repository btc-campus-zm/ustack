import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Delete, KeyRound, X } from "lucide-react";
import { useLock, verifyBiometric, PIN_LENGTH } from "@/lib/context/lock-context";
import { useAuth } from "@/lib/context/auth-context";

type View = "fingerprint" | "pin";

export function VerifyModal() {
  const { isAuthenticated } = useAuth();
  const {
    verificationRequest,
    biometricsEnabled,
    hasBiometricCredential,
    getPin,
    resolveVerification,
    cancelVerification,
  } = useLock();

  const hasBio = biometricsEnabled && hasBiometricCredential;
  const active = isAuthenticated && verificationRequest !== null;

  const [view, setView] = useState<View>("fingerprint");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [shake, setShake] = useState(false);
  const [bioState, setBioState] = useState<"idle" | "scanning" | "failed">("idle");
  const [bioError, setBioError] = useState("");

  // Reset state each time a new request arrives
  useEffect(() => {
    if (!active) return;
    setPin(""); setPinError(""); setBioState("idle"); setBioError("");
    setView(hasBio ? "fingerprint" : "pin");
  }, [active, hasBio]);

  // Auto-trigger biometric when fingerprint view opens
  useEffect(() => {
    if (!active || view !== "fingerprint" || !hasBio) return;
    const t = setTimeout(() => triggerBio(), 400);
    return () => clearTimeout(t);
  }, [view, active, hasBio]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerBio = useCallback(async () => {
    setBioState("scanning");
    setBioError("");
    try {
      const ok = await verifyBiometric();
      if (ok) {
        resolveVerification();
      } else {
        setBioState("failed");
        setBioError("Couldn't verify fingerprint");
      }
    } catch {
      setBioState("failed");
      setBioError("Biometric unavailable");
    }
  }, [resolveVerification]);

  // Auto-submit PIN
  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    const t = setTimeout(() => {
      if (pin === getPin()) {
        resolveVerification();
        setPin("");
      } else {
        setShake(true);
        setPinError("Incorrect PIN");
        setPin("");
        setTimeout(() => setShake(false), 500);
      }
    }, 100);
    return () => clearTimeout(t);
  }, [pin, getPin, resolveVerification]);

  const pressDigit = (d: number | "del") => {
    setPinError("");
    if (d === "del") setPin((p) => p.slice(0, -1));
    else setPin((p) => (p.length < PIN_LENGTH ? p + d : p));
  };

  if (!active) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="verify-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/60 backdrop-blur-sm"
        onClick={cancelVerification}
      >
        <motion.div
          key="verify-sheet"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[420px] bg-background rounded-t-3xl border-t border-white/8 pb-10 pt-6 px-6 flex flex-col gap-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                Verify your identity
              </p>
              <p className="text-base font-semibold">
                {verificationRequest?.label}
              </p>
            </div>
            <button
              onClick={cancelVerification}
              className="w-8 h-8 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Fingerprint view ── */}
          <AnimatePresence mode="wait">
            {view === "fingerprint" ? (
              <motion.div
                key="bio"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22 }}
                className="flex flex-col items-center gap-5"
              >
                <motion.button
                  onClick={triggerBio}
                  disabled={bioState === "scanning"}
                  whileTap={bioState !== "scanning" ? { scale: 0.95 } : {}}
                  className="relative flex items-center justify-center w-28 h-28 rounded-full focus:outline-none"
                >
                  {bioState !== "failed" && (
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-full border border-primary/30"
                        animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full border border-primary/20"
                        animate={{ scale: [1, 1.85], opacity: [0.4, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut", delay: 0.4 }}
                      />
                    </>
                  )}
                  <div className={`w-24 h-24 rounded-full glass flex items-center justify-center border transition-colors ${bioState === "failed" ? "border-destructive/50" : "border-primary/20"}`}>
                    <motion.div
                      animate={bioState === "scanning" ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 0.9 }}
                    >
                      <Fingerprint
                        strokeWidth={1.3}
                        className={`w-12 h-12 ${bioState === "failed" ? "text-destructive" : "text-primary"}`}
                      />
                    </motion.div>
                  </div>
                </motion.button>

                <AnimatePresence mode="wait">
                  {bioState === "failed" ? (
                    <motion.div key="fail" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-1">
                      <p className="text-sm text-destructive font-medium">{bioError}</p>
                      <button onClick={triggerBio} className="text-xs text-muted-foreground underline underline-offset-2">Try again</button>
                    </motion.div>
                  ) : bioState === "scanning" ? (
                    <motion.p key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-primary font-medium">Scanning…</motion.p>
                  ) : (
                    <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-muted-foreground">Touch the fingerprint sensor</motion.p>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => { setView("pin"); setBioState("idle"); setBioError(""); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl glass text-sm font-medium text-muted-foreground hover:text-foreground transition"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Use PIN instead
                </button>
              </motion.div>

            ) : (
              /* ── PIN view ── */
              <motion.div
                key="pin"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22 }}
                className="flex flex-col items-center gap-5"
              >
                {/* Dots */}
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                    transition={{ duration: 0.38 }}
                    className="flex gap-4"
                  >
                    {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          scale: pin.length === i + 1 ? [1, 1.3, 1] : 1,
                          backgroundColor: i < pin.length ? "oklch(0.73 0.19 55)" : "oklch(0.28 0.01 260)",
                        }}
                        transition={{ duration: 0.13 }}
                        className="w-4 h-4 rounded-full"
                      />
                    ))}
                  </motion.div>
                  <AnimatePresence mode="wait">
                    {pinError ? (
                      <motion.p key="err" initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-destructive">{pinError}</motion.p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Enter your 4-digit PIN</p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Compact keypad */}
                <div className="grid grid-cols-3 gap-2.5 w-full">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                    <MiniKey key={d} label={String(d)} onPress={() => pressDigit(d)} />
                  ))}
                  {hasBio ? (
                    <motion.button whileTap={{ scale: 0.92 }} onClick={() => { setView("fingerprint"); setPin(""); setPinError(""); }} className="h-13 rounded-xl glass flex items-center justify-center">
                      <Fingerprint className="w-4.5 h-4.5 text-muted-foreground" />
                    </motion.button>
                  ) : <div />}
                  <MiniKey label="0" onPress={() => pressDigit(0)} />
                  <motion.button whileTap={{ scale: 0.92 }} onClick={() => pressDigit("del")} className="h-13 rounded-xl glass flex items-center justify-center">
                    <Delete className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function MiniKey({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onPress}
      className="h-13 rounded-xl glass text-lg font-semibold flex items-center justify-center"
    >
      {label}
    </motion.button>
  );
}
