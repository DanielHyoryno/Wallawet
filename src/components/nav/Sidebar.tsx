import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ReceiptText, FolderKanban, Settings, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

const items = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ReceiptText },
  { to: "/categories", label: "Categories", icon: FolderKanban },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {

  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 md:flex flex-col
      border-r border-emerald-700/40 bg-zinc-950/80 backdrop-blur-xl text-zinc-200">
      <div className="px-5 pt-5 pb-4 border-b border-emerald-700/30">
        <div className="text-lg font-semibold tracking-tight">
          <span className="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
            Wallawet
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-400">Track your money with style.</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                "hover:bg-emerald-600/15 hover:text-white",
                isActive ? "bg-emerald-600/20 text-white border border-emerald-700/40" : "text-zinc-300"
              )
            }
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        onClick={handleSignOut}
        className="m-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300
                   hover:bg-emerald-600/15 hover:text-white transition"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </aside>
  );
}
