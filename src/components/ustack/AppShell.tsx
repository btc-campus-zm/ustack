import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { TopBar } from "./TopBar";
import { BottomNav, type Tab } from "./BottomNav";
import { SideDrawer } from "./SideDrawer";
import { Fab } from "./Fab";
import { HomeScreen } from "./screens/HomeScreen";
import { VaultsScreen } from "./screens/VaultsScreen";
import { ActivityScreen } from "./screens/ActivityScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { NotificationsSheet } from "./sheets/NotificationsSheet";
import { CreateVaultSheet } from "./sheets/CreateVaultSheet";
import { DepositSheet } from "./sheets/DepositSheet";
import { WithdrawSheet } from "./sheets/WithdrawSheet";
import { VaultDetailSheet } from "./sheets/VaultDetailSheet";
import { SettingsSheet } from "./sheets/SettingsSheet";
import { HelpSheet } from "./sheets/HelpSheet";
import { EditProfileSheet } from "./sheets/EditProfileSheet";
import { SecuritySheet } from "./sheets/SecuritySheet";
import { useAuth } from "@/lib/context/auth-context";
import { useLock } from "@/lib/context/lock-context";
import { useBtcPrice } from "@/lib/hooks/useAppData";
import type { Vault } from "@/lib/ustack-data";

const PRICE_PROTECTION_THRESHOLD_PCT = 2;

export type SheetKind =
  | null
  | "notifications"
  | "createVault"
  | "deposit"
  | "withdraw"
  | "vaultDetail"
  | "settings"
  | "help"
  | "editProfile"
  | "security";

export function AppShell() {
  const nav = useNavigate();
  const { isAuthenticated, loading, logout: authLogout } = useAuth();
  const { requestVerification } = useLock();
  const [tab, setTab] = useState<Tab>("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [activeVault, setActiveVault] = useState<Vault | null>(null);
  const [depositVault, setDepositVault] = useState<Vault | null>(null);
  const [withdrawVault, setWithdrawVault] = useState<Vault | null>(null);

  const { data: btcPrice } = useBtcPrice();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      nav({ to: "/auth" });
    }
  }, [loading, isAuthenticated, nav]);

  const openVault = (v: Vault) => { setActiveVault(v); setSheet("vaultDetail"); };
  const logout = () => { authLogout(); nav({ to: "/welcome" }); };

  if (loading || !isAuthenticated) return null;

  const openDeposit = (vault?: Vault) => {
    setDepositVault(vault ?? null);
    setSheet("deposit");
  };

  const openWithdraw = (vault?: Vault) => {
    requestVerification("Confirm withdrawal", () => {
      setWithdrawVault(vault ?? null);
      setSheet("withdraw");
    });
  };

  const openSettings = () => {
    requestVerification("Access settings", () => setSheet("settings"));
  };

  const openEditProfile = () => {
    requestVerification("Edit profile", () => setSheet("editProfile"));
  };

  // Alert theme: price dropped past the platform 2% threshold
  const alertTheme = (btcPrice?.change30m ?? 0) <= -PRICE_PROTECTION_THRESHOLD_PCT;

  return (
    <div className={`min-h-screen w-full bg-background flex items-center justify-center md:p-8 relative overflow-hidden${alertTheme ? " theme-alert" : ""}`}>

      {/* phone container */}
      <div className="relative w-full md:w-[420px] md:h-[860px] h-screen md:rounded-[3rem] overflow-hidden md:border md:border-white/10 md:shadow-float bg-background">
        <SideDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSelect={(t) => { setTab(t); setDrawerOpen(false); }}
          onSettings={() => { setDrawerOpen(false); openSettings(); }}
          onHelp={() => { setDrawerOpen(false); setSheet("help"); }}
          onLogout={logout}
        />

        <motion.div
          animate={drawerOpen ? { scale: 0.86, x: "62%", borderRadius: 32 } : { scale: 1, x: 0, borderRadius: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="absolute inset-0 bg-background overflow-hidden origin-left"
          style={{ boxShadow: drawerOpen ? "0 32px 64px -16px rgba(0,0,0,0.6)" : "none" }}
        >
          {drawerOpen && (
            <button aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="absolute inset-0 z-50" />
          )}

          <div className="relative h-full flex flex-col">
            <TopBar onMenu={() => setDrawerOpen(true)} onBell={() => setSheet("notifications")} />

            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  {tab === "home" && (
                    <HomeScreen
                      onOpenVault={openVault}
                      onDeposit={() => openDeposit()}
                      onWithdraw={() => openWithdraw()}
                      onCreateVault={() => setSheet("createVault")}
                    />
                  )}
                  {tab === "vaults" && <VaultsScreen onOpenVault={openVault} onCreateVault={() => setSheet("createVault")} />}
                  {tab === "activity" && <ActivityScreen />}
                  {tab === "profile" && (
                    <ProfileScreen
                      onEdit={openEditProfile}
                      onSettings={openSettings}
                      onHelp={() => setSheet("help")}
                      onLogout={logout}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <BottomNav tab={tab} onChange={setTab} />
            <Fab
              onCreateVault={() => setSheet("createVault")}
              onAddFunds={() => openDeposit()}
              onWithdraw={() => openWithdraw()}
            />
          </div>
        </motion.div>

        {/* Sheets */}
        <NotificationsSheet open={sheet === "notifications"} onClose={() => setSheet(null)} />
        <CreateVaultSheet open={sheet === "createVault"} onClose={() => setSheet(null)} onDeposit={(vault) => openDeposit(vault)} />
        <DepositSheet
          open={sheet === "deposit"}
          onClose={() => { setSheet(null); setDepositVault(null); }}
          vaultContext={depositVault}
        />
        <WithdrawSheet
          open={sheet === "withdraw"}
          onClose={() => { setSheet(null); setWithdrawVault(null); }}
          vaultContext={withdrawVault}
        />
        <VaultDetailSheet
          open={sheet === "vaultDetail"}
          vault={activeVault}
          onClose={() => setSheet(null)}
          onDeposit={() => { setSheet(null); setTimeout(() => openDeposit(activeVault!), 120); }}
          onWithdraw={() => { setSheet(null); setTimeout(() => openWithdraw(activeVault!), 120); }}
        />
        <SettingsSheet open={sheet === "settings"} onClose={() => setSheet(null)} onSecurity={() => setSheet("security")} />
        <HelpSheet open={sheet === "help"} onClose={() => setSheet(null)} />
        <EditProfileSheet open={sheet === "editProfile"} onClose={() => setSheet(null)} />
        <SecuritySheet open={sheet === "security"} onClose={() => setSheet(null)} />
      </div>
    </div>
  );
}
