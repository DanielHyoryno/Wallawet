import { Outlet } from "react-router-dom";
import Sidebar from "@/components/nav/Sidebar";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-emerald-950 text-zinc-100">
      <Sidebar />
      <main className="md:ml-64">
        <header className="sticky top-0 z-10 border-b border-emerald-700/30 bg-zinc-950/60 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="text-sm text-zinc-300">Dashboard</div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6">
          {/* This is where child routes render */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
