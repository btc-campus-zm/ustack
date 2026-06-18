import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PhoneFrame } from "@/components/ustack/PhoneFrame";
import { Logo } from "@/components/ustack/Logo";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome - UStack" },
      { name: "description", content: "Build long-term Bitcoin habits with UStack." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <PhoneFrame>
      <div className="h-full min-h-screen md:min-h-[860px] flex flex-col px-7 pt-16 pb-10 bg-background relative">

        <div className="relative flex flex-col items-center">
          <Logo size={48} />
          <div className="mt-3 text-sm font-medium tracking-wide text-muted-foreground">UStack</div>
        </div>

        <div className="relative flex-1 flex flex-col justify-center items-center text-center">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-[2.6rem] leading-[1.05] font-semibold tracking-tight"
          >
            Save Bitcoin<br />the smart way.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mt-4 text-base text-muted-foreground max-w-xs"
          >
            Build long-term Bitcoin habits. Stack slowly. Stay disciplined. Grow calmly.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative flex flex-col gap-3"
        >
          <Link
            to="/onboarding"
            className="bg-primary text-primary-foreground font-semibold py-4 rounded-2xl text-center active:scale-[0.98] transition"
          >
            Get Started
          </Link>
          <Link
            to="/auth"
            className="glass text-foreground font-medium py-4 rounded-2xl text-center active:scale-[0.98] transition"
          >
            Log In
          </Link>
        </motion.div>
      </div>
    </PhoneFrame>
  );
}
