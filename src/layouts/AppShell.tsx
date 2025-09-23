// src/layouts/AppShell.tsx
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, LayoutDashboard, Receipt, Tags, Settings, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

function NavItem({
  to,
  icon: Icon,
  label,
  onClick,
}: { to: string; icon: any; label: string; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition
         ${isActive ? "bg-emerald-900/30 text-emerald-300 ring-1 ring-emerald-800"
                    : "text-zinc-300 hover:bg-zinc-900/60"}`
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  async function signOut() {
    await supabase.auth.signOut();
    // your <Protected/> will redirect to auth
  }

  return (
    <div className="flex h-full flex-col bg-zinc-950/80 backdrop-blur border-r border-emerald-800/30">
      <div className="px-4 py-4">
        <div className="text-emerald-300 font-semibold tracking-tight">Wallawet</div>
        <div className="text-xs text-zinc-500">Track your money with style.</div>
      </div>

      {/* scrollable nav area */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        <NavItem to="/dashboard"   icon={LayoutDashboard} label="Overview"     onClick={onNavigate} />
        <NavItem to="/transactions" icon={Receipt}         label="Transactions" onClick={onNavigate} />
        <NavItem to="/categories"   icon={Tags}            label="Categories"   onClick={onNavigate} />
        <NavItem to="/settings"     icon={Settings}        label="Settings"     onClick={onNavigate} />
      </nav>

      {/* pinned footer (sign out) */}
      <div className="mt-auto border-t border-emerald-800/30 p-3">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900/60"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]); // close drawer on route change

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-emerald-950 text-zinc-100">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-emerald-800/20 bg-zinc-950/70 px-3 py-2 md:hidden backdrop-blur">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md ring-1 ring-emerald-800/40 hover:bg-zinc-900"
        >
          <Menu className="h-5 w-5 text-emerald-300" />
        </button>
        <div className="text-sm font-medium text-emerald-300">Wallawet</div>
        <div className="w-9" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 hidden md:block w-64">
        <SidebarContent />
      </aside>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {open && (
          <>
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="fixed inset-y-0 left-0 z-50 w-72 md:hidden"
            >
              <SidebarContent onNavigate={() => setOpen(false)} />
            </motion.aside>

            <motion.button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <button
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="fixed left-72 top-2 z-50 rounded-md bg-zinc-900/80 p-2 ring-1 ring-emerald-800/40 md:hidden"
            >
              <X className="h-5 w-5 text-emerald-200" />
            </button>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT — push right by sidebar on md+ */}
      <main className="px-4 py-4 md:px-6 md:pl-72">
        <div className="mx-auto w-full max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
