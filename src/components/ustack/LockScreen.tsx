import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Delete, KeyRound } from "lucide-react";
import { useLock, verifyBiometric, PIN_LENGTH } from "@/lib/context/lock-context";
import { useAuth } from "@/lib/context/auth-context";

type View = "fingerprint" | "pin";

export function LockScreen() {
  const { isAuthenticated } = useAuth();
  const {
    isLocked,
    hasPin,
    biometricsEnabled,
    hasBiometricCredential,
    unlock,
    getPin,
  } = useLock();

  const hasBio = biometricsEnabled && hasBiometricCredential;

  const [view, setView] = useState<View>("fingerprint");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [shake, setShake] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [bioState, setBioState] = useState<"idle" | "scanning" | "failed">("idle");
  const [bioError, setBioError] = useState("");

  // Reset state whenever the screen becomes visible
  useEffect(() => {
    if (!isLocked || !hasPin) return;
    setPin("");
    setPinError("");
    setBioState("idle");
    setBioError("");
    setUnlocking(false);
    setView(hasBio ? "fingerprint" : "pin");
  }, [isLocked, hasPin, hasBio]);

  // Auto-trigger biometric scan when fingerprint view opens
  useEffect(() => {
    if (!isLocked || !hasPin || view !== "fingerprint" || !hasBio) return;
    const t = setTimeout(() => triggerBio(), 500);
    return () => clearTimeout(t);
  }, [view, isLocked, hasPin, hasBio]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerBio = useCallback(async () => {
    setBioState("scanning");
    setBioError("");
    try {
      const ok = await verifyBiometric();
      if (ok) {
        setUnlocking(true);
        setTimeout(() => {
          unlock();
          setUnlocking(false);
        }, 700);
      } else {
        setBioState("failed");
        setBioError("Couldn't verify fingerprint");
      }
    } catch {
      setBioState("failed");
      setBioError("Biometric unavailable");
    }
  }, [unlock]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    const t = setTimeout(() => {
      if (pin === getPin()) {
        setUnlocking(true);
        setTimeout(() => {
          unlock();
          setPin("");
          setUnlocking(false);
        }, 700);
      } else {
        setShake(true);
        setPinError("Incorrect PIN");
        setPin("");
        setTimeout(() => setShake(false), 500);
      }
    }, 100);
    return () => clearTimeout(t);
  }, [pin, unlock, getPin]);

  const pressDigit = (d: number | "del") => {
    setPinError("");
    if (d === "del") setPin((p) => p.slice(0, -1));
    else setPin((p) => (p.length < PIN_LENGTH ? p + d : p));
  };

  // Only block the app when the user is already logged in
  if (!isAuthenticated || !isLocked || !hasPin) return null;

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

          {/* ── Views ── */}
          <AnimatePresence mode="wait">

            {view === "fingerprint" ? (
              /* ── Fingerprint screen ── */
              <motion.div
                key="bio-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.28 }}
                className="flex flex-col items-center gap-8 w-full"
              >
                {/* Big fingerprint button */}
                <motion.button
                  onClick={triggerBio}
                  disabled={bioState === "scanning"}
                  whileTap={bioState !== "scanning" ? { scale: 0.95 } : {}}
                  className="relative flex items-center justify-center w-36 h-36 rounded-full focus:outline-none"
                >
                  {/* Pulse rings — show when idle or scanning */}
                  {bioState !== "failed" && (
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-full border border-primary/30"
                        animate={{ scale: [1, 1.55], opacity: [0.6, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full border border-primary/20"
                        animate={{ scale: [1, 1.9], opacity: [0.4, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut", delay: 0.4 }}
                      />
                    </>
                  )}

                  <div
                    className={`w-32 h-32 rounded-full glass flex items-center justify-center transition-all duration-300 ${
                      bioState === "failed"
                        ? "border border-destructive/50"
                        : "border border-primary/25"
                    }`}
                  >
                    <motion.div
                      animate={bioState === "scanning" ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 0.9 }}
                    >
                      <Fingerprint
                        strokeWidth={1.3}
                        className={`w-16 h-16 transition-colors duration-300 ${
                          bioState === "failed" ? "text-destructive" : "text-primary"
                        }`}
                      />
                    </motion.div>
                  </div>
                </motion.button>

                {/* Status label */}
                <AnimatePresence mode="wait">
                  {bioState === "failed" ? (
                    <motion.div
                      key="fail"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <p className="text-sm text-destructive font-medium">{bioError}</p>
                      <button
                        onClick={triggerBio}
                        className="text-xs text-muted-foreground underline underline-offset-2"
                      >
                        Try again
                      </button>
                    </motion.div>
                  ) : bioState === "scanning" ? (
                    <motion.p
                      key="scan"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-primary font-medium"
                    >
                      Scanning…
                    </motion.p>
                  ) : (
                    <motion.p
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-muted-foreground"
                    >
                      Touch the fingerprint sensor
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Use PIN instead */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setView("pin");
                    setBioState("idle");
                    setBioError("");
                  }}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl glass text-sm font-medium text-muted-foreground hover:text-foreground transition"
                >
                  <KeyRound className="w-4 h-4" />
                  Use PIN instead
                </motion.button>
              </motion.div>

            ) : (
              /* ── PIN screen ── */
              <motion.div
                key="pin-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.28 }}
                className="flex flex-col items-center gap-6 w-full"
              >
                {/* PIN dots + label */}
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
                          scale: pin.length === i + 1 ? [1, 1.35, 1] : 1,
                          backgroundColor:
                            i < pin.length
                              ? unlocking
                                ? "oklch(0.86 0.13 160)"
                                : "oklch(0.73 0.19 55)"
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
                      <motion.p
                        key="hint"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-muted-foreground"
                      >
                        Enter your 4-digit PIN
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-3 w-full">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                    <KeypadButton key={d} label={String(d)} onPress={() => pressDigit(d)} />
                  ))}

                  {/* Bottom row: fingerprint back | 0 | del */}
                  {hasBio ? (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        setView("fingerprint");
                        setPin("");
                        setPinError("");
                      }}
                      className="h-16 rounded-2xl glass flex items-center justify-center transition"
                      title="Use fingerprint"
                    >
                      <Fingerprint className="w-5 h-5 text-muted-foreground" />
                    </motion.button>
                  ) : (
                    <div />
                  )}

                  <KeypadButton label="0" onPress={() => pressDigit(0)} />

                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => pressDigit("del")}
                    className="h-16 rounded-2xl glass flex items-center justify-center transition"
                  >
                    <Delete className="w-5 h-5 text-muted-foreground" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spacer */}
          <div />
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
