import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MessageCircle, Mail, ExternalLink, Info, Shield, Zap, Lock } from "lucide-react";
import { Sheet } from "./Sheet";

type View = "help" | "about";

const faqs = [
  {
    q: "What is a Hodl Vault?",
    a: "A Hodl Vault locks your sats for a set time period, e.g. 6 months. You cannot withdraw until the lock expires. This is intentional: it keeps your future self protected from impulse decisions.",
  },
  {
    q: "What is a Stack Vault?",
    a: "A Stack Vault lets you save toward a target amount, e.g. 1,000,000 sats. You can withdraw anytime but a 45% early penalty applies to keep you on track.",
  },
  {
    q: "What is Price Protection?",
    a: "Price Protection is a core UStack feature that monitors Bitcoin price in real time and automatically shields every user's savings if BTC drops by 2% or more. It's always active, no setup needed.",
  },
  {
    q: "How are my sats stored?",
    a: "Your sats are held securely through the UStack platform. We make the saving experience clean, disciplined, and always in your control.",
  },
  {
    q: "What payment methods are supported?",
    a: "We support Mobile Money (MTN MoMo, Airtel, Zamtel) and Lightning Network deposits. More payment rails coming soon.",
  },
  {
    q: "How do I withdraw my sats?",
    a: "Tap Transfer on the home screen or inside a vault. Stack Vaults allow early transfer with a 45% penalty. Hodl Vaults are locked until the expiry date.",
  },
];

export function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [view, setView] = useState<View>("help");
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <Sheet open={open} onClose={onClose} title={view === "help" ? "Help & Support" : "About UStack"}>
      {/* Tab toggle */}
      <div className="flex p-1 rounded-2xl bg-white/5 mb-6">
        {(["help", "about"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="relative flex-1 py-2.5 rounded-xl text-sm font-medium"
          >
            {view === v && <motion.div layoutId="help-tab" className="absolute inset-0 bg-primary rounded-xl" />}
            <span className={`relative ${view === v ? "text-background" : "text-muted-foreground"}`}>
              {v === "help" ? "FAQ" : "About"}
            </span>
          </button>
        ))}
      </div>

      {view === "help" && (
        <div className="flex flex-col gap-2">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-2xl glass overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-4 text-left gap-3"
              >
                <span className="text-sm font-medium leading-snug">{faq.q}</span>
                <motion.div animate={{ rotate: expanded === i ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              </button>
              <AnimatePresence>
                {expanded === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          <div className="mt-4 flex flex-col gap-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 mb-1">Contact</div>
            <a href="https://wa.me/260777693802" target="_blank" rel="noopener noreferrer" className="rounded-2xl glass p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-card border border-white/8 flex items-center justify-center" style={{ color: "oklch(0.82 0.17 140)" }}>
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Live chat</div>
                <div className="text-xs text-muted-foreground">Chat with us on WhatsApp</div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
            <a href="mailto:support@ustack.app" className="rounded-2xl glass p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-card border border-white/8 flex items-center justify-center" style={{ color: "oklch(0.73 0.19 55)" }}>
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Email support</div>
                <div className="text-xs text-muted-foreground">support@ustack.app</div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>
        </div>
      )}

      {view === "about" && (
        <div className="flex flex-col gap-5">
          <div className="rounded-3xl glass p-6 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-3xl font-semibold">U</div>
            <div className="text-xl font-semibold">UStack</div>
            <div className="text-xs text-muted-foreground">Version 1.0.0</div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Save Bitcoin the smart way. Vault-based savings built for discipline, not trading. Built for Zambia and Africa.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {[
              { icon: Shield, title: "Secure by design", body: "Your savings are protected with biometric and PIN security.", color: "oklch(0.82 0.17 140)" },
              { icon: Lock, title: "Privacy first", body: "Minimal data collection. No selling your information.", color: "oklch(0.86 0.13 160)" },
              { icon: Zap, title: "Lightning fast", body: "Instant Lightning Network deposits and withdrawals.", color: "oklch(0.74 0.18 55)" },
              { icon: Info, title: "Open building", body: "Made in Zambia. Africa-native Bitcoin savings.", color: "oklch(0.73 0.19 55)" },
            ].map(({ icon: Icon, title, body, color }) => (
              <div key={title} className="rounded-2xl glass p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-card border border-white/8 flex items-center justify-center shrink-0" style={{ color }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{body}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            © 2026 UStack · Terms · Privacy
          </p>
        </div>
      )}
    </Sheet>
  );
}
