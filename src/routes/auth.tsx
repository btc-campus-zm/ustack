import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ShieldCheck, Bitcoin, ArrowLeft, Fingerprint, ChevronRight, Vault } from "lucide-react";
import { PhoneFrame } from "@/components/ustack/PhoneFrame";
import { Logo } from "@/components/ustack/Logo";
import { requestOtp, verifyOtp } from "@/lib/api/auth.functions";
import { useAuth } from "@/lib/context/auth-context";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log in - UStack" },
      { name: "description", content: "Log back in to your UStack account." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<"email" | "otp" | "done">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setError(""); setLoading(true);
    try {
      await requestOtp({ data: { email } });
      setStep("otp");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) return;
    setError(""); setLoading(true);
    try {
      const res = await verifyOtp({ data: { email, code } });
      login(res.accessToken, res.refreshToken, res.user);
      setStep("done");
      setTimeout(() => nav({ to: "/app" }), 1600);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <PhoneFrame>
        <div className="h-full min-h-screen md:min-h-[860px] flex flex-col items-center justify-center gap-6 bg-background">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 16 }}>
            <div className="w-24 h-24 rounded-full bg-card border border-white/8 flex items-center justify-center" style={{ color: "oklch(0.82 0.17 140)" }}>
              <ShieldCheck className="w-12 h-12" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center">
            <div className="text-2xl font-semibold">Welcome back</div>
            <div className="text-sm text-muted-foreground mt-1">Loading your stack…</div>
          </motion.div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div className="h-full min-h-screen md:min-h-[860px] flex flex-col bg-background">
        <div className="flex flex-col flex-1 px-7 pt-14 pb-10">
          <button
            onClick={() => step === "otp" ? (setStep("email"), setError(""), setOtp(["","","","","",""])) : nav({ to: "/welcome" })}
            className="w-10 h-10 rounded-full glass flex items-center justify-center self-start"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mt-8">
            <Logo size={36} />
            <span className="text-base font-semibold tracking-wide">UStack</span>
          </div>

          <AnimatePresence mode="wait">
            {step === "email" && (
              <motion.div key="email" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col flex-1">
                <div className="mt-8">
                  <h1 className="text-[2rem] font-semibold tracking-tight leading-tight">Welcome back</h1>
                  <p className="mt-2 text-muted-foreground text-sm">Log in to your Bitcoin savings vault.</p>
                </div>

                <div className="mt-10 flex flex-col gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Email address</span>
                    <input
                      autoFocus
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      placeholder="you@example.com"
                      className="bg-card border border-border rounded-2xl px-4 py-4 text-base focus:border-primary focus:outline-none transition"
                    />
                  </label>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2">
                  {[
                    { icon: ShieldCheck, label: "Secure" },
                    { icon: Bitcoin, label: "Bitcoin only" },
                    { icon: Vault, label: "Safes" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="glass rounded-2xl p-3 flex flex-col items-center gap-1.5">
                      <Icon className="w-4 h-4 text-[oklch(0.78_0.14_190)]" />
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
                    </div>
                  ))}
                </div>

                {error && <p className="mt-3 text-sm text-destructive text-center">{error}</p>}
                <div className="flex-1" />

                <button
                  onClick={handleSendOtp}
                  disabled={!email || loading}
                  className="bg-primary text-primary-foreground font-semibold py-4 rounded-2xl active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner /> : "Continue"}
                </button>

                <p className="mt-5 text-center text-sm text-muted-foreground">
                  No account?{" "}
                  <Link to="/onboarding" className="text-[oklch(0.82_0.13_190)] font-medium">Get started free</Link>
                </p>
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div key="otp" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col flex-1">
                <div className="mt-8">
                  <h1 className="text-[2rem] font-semibold tracking-tight leading-tight">Check your<br />email</h1>
                  <p className="mt-2 text-muted-foreground text-sm">We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span></p>
                </div>

                <div className="mt-10 flex gap-2 justify-center">
                  {otp.map((v, idx) => (
                    <input
                      key={idx}
                      id={`login-otp-${idx}`}
                      inputMode="numeric"
                      maxLength={1}
                      value={v}
                      autoFocus={idx === 0}
                      onChange={(e) => {
                        const nv = [...otp];
                        nv[idx] = e.target.value.replace(/\D/g, "").slice(-1);
                        setOtp(nv);
                        if (e.target.value && idx < 5) {
                          (document.getElementById(`login-otp-${idx + 1}`) as HTMLInputElement)?.focus();
                        }
                        if (idx === 5 && e.target.value) {
                          setTimeout(() => {
                            const code = [...nv].join("");
                            if (code.length === 6) handleVerify();
                          }, 100);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !v && idx > 0) {
                          (document.getElementById(`login-otp-${idx - 1}`) as HTMLInputElement)?.focus();
                        }
                      }}
                      className="w-12 h-14 text-center text-xl font-semibold rounded-2xl bg-card border border-border focus:border-primary focus:outline-none transition"
                    />
                  ))}
                </div>

                {error && <p className="mt-4 text-sm text-destructive text-center">{error}</p>}

                <div className="mt-4 text-center">
                  <button onClick={handleSendOtp} disabled={loading} className="text-sm text-[oklch(0.82_0.13_190)] font-medium disabled:opacity-40">
                    Resend code
                  </button>
                </div>

                <div className="flex-1" />

                <button
                  onClick={handleVerify}
                  disabled={otp.some((v) => !v) || loading}
                  className="bg-primary text-primary-foreground font-semibold py-4 rounded-2xl active:scale-[0.98] transition disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner /> : <><span>Log In</span><ChevronRight className="w-4 h-4" /></>}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PhoneFrame>
  );
}

function Spinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white"
    />
  );
}
