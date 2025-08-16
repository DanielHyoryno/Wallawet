import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type Category = { id: string; name: string; type: "expense" | "income"; color: string | null };
type Txn = {
  id: string;
  amount: number;
  occurred_on: string; // YYYY-MM-DD
  note: string | null;
  category_id: string | null;
  category: Category | null;
};

const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" });
const CATEGORY_FK = "transactions_category_id_fkey"; // change if different in your DB

// ---- date helpers (local) ----
function ymd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: ymd(start), end: ymd(end), daysInMonth: end.getDate() };
}
function daysElapsedInMonth(date = new Date()) {
  const today = date.getDate();
  const { daysInMonth } = monthRange(date);
  return Math.min(today, daysInMonth);
}

// a few fallbacks if a category has no color saved
const FALLBACK_COLORS = ["#34d399", "#22d3ee", "#a78bfa", "#f472b6", "#f59e0b", "#60a5fa"];

export default function DashboardPage() {
  const [rows, setRows] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // fetch this month's transactions with category
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      const { start, end } = monthRange();

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id, amount, occurred_on, note, category_id,
          category:categories!${CATEGORY_FK} ( id, name, type, color )
        `)
        .returns<Txn[]>()                 // ✅ tell TS the row shape here
        .filter("occurred_on", "gte", start)  // ✅ use filter to avoid the gte typing hiccup
        .filter("occurred_on", "lte", end)
        .order("occurred_on", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) setErr(error.message);
      else setRows(data ?? []);

      setLoading(false);
    })();
  }, []);

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    const expenseOnly = rows.filter((r) => r.category?.type === "expense");
    const monthSpend = expenseOnly.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const txCount = rows.length;

    // top category by spend (expense only)
    const byCat = new Map<string, { name: string; total: number }>();
    for (const r of expenseOnly) {
      const key = r.category_id ?? "uncat";
      const name = r.category?.name ?? "Uncategorized";
      byCat.set(key, { name, total: (byCat.get(key)?.total ?? 0) + Number(r.amount || 0) });
    }
    let topCategory = "—";
    let max = -1;
    for (const { name, total } of byCat.values()) {
      if (total > max) {
        max = total;
        topCategory = name;
      }
    }

    const avgPerDay = monthSpend / Math.max(1, daysElapsedInMonth());
    return { monthSpend, txCount, topCategory, avgPerDay };
  }, [rows]);

  // ---------- BAR: daily expense series (current month) ----------
  const barData = useMemo(() => {
    const { daysInMonth } = monthRange();
    const sums = Array.from({ length: daysInMonth }, () => 0);
    for (const r of rows) {
      if (r.category?.type !== "expense") continue;
      const day = parseInt(r.occurred_on.slice(8, 10), 10); // YYYY-MM-DD -> DD
      if (!Number.isNaN(day)) sums[day - 1] += Number(r.amount) || 0;
    }
    return sums.map((spend, idx) => ({
      d: `${idx + 1}`, // day label
      spend,
    }));
  }, [rows]);

  // ---------- PIE: expense by category (% of total this month) ----------
  const pieData = useMemo(() => {
    const expenseOnly = rows.filter((r) => r.category?.type === "expense");
    const totals = new Map<string, { name: string; color: string; value: number }>();
    for (const r of expenseOnly) {
      const key = r.category_id ?? "uncat";
      const name = r.category?.name ?? "Uncategorized";
      const color = r.category?.color ?? FALLBACK_COLORS[totals.size % FALLBACK_COLORS.length];
      totals.set(key, { name, color, value: (totals.get(key)?.value ?? 0) + Number(r.amount || 0) });
    }
    return Array.from(totals.values());
  }, [rows]);

  const recent = useMemo(() => [...rows].reverse().slice(0, 8), [rows]); // latest 8

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "This Month Spend", value: idr.format(kpis.monthSpend) },
          { label: "Transactions", value: String(kpis.txCount) },
          { label: "Top Category", value: kpis.topCategory },
          { label: "Avg / Day", value: idr.format(kpis.avgPerDay || 0) },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="border-emerald-700/40 bg-zinc-950/70 backdrop-blur text-zinc-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-400">{kpi.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {loading ? <span className="text-zinc-500">…</span> : kpi.value}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Bar (2/3 width on lg) */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-emerald-700/40 bg-zinc-950/70 backdrop-blur text-zinc-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Spending — Current Month</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {loading ? (
                <div className="h-full grid place-items-center text-zinc-500">Loading…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    margin={{ top: 12, right: 12, left: 28, bottom: 8 }} // ← more left space
                  >
                    <defs>
                      <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#065f46" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid stroke="#0f172a" strokeOpacity={0.25} vertical={false} />

                    <XAxis
                      dataKey="d"
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                      axisLine={{ stroke: "#334155" }}
                      tickMargin={6}
                    />

                    <YAxis
                      width={72} // ← reserve space for ticks
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                      axisLine={{ stroke: "#334155" }}
                      tickMargin={8}
                      tickFormatter={(v) => idr.format(v).replace("Rp", "Rp ")}
                    />

                    <Tooltip
                      cursor={{ fill: "#22c55e22" }}
                      contentStyle={{
                        background: "#0b0f13",
                        border: "1px solid #065f46",
                        borderRadius: 8,
                        color: "#e5e7eb",
                      }}
                      formatter={(v: any) => [idr.format(Number(v)), "Spend"]}
                      labelFormatter={(l) => `Day ${l}`}
                    />

                    <Bar
                      dataKey="spend"
                      fill="url(#barGreen)"
                      radius={[6, 6, 0, 0]}
                      isAnimationActive
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie (1/3 width on lg) */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-emerald-700/40 bg-zinc-950/70 backdrop-blur text-zinc-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Categories — % of Spend</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {loading ? (
                <div className="h-full grid place-items-center text-zinc-500">Loading…</div>
              ) : pieData.length === 0 ? (
                <div className="h-full grid place-items-center text-zinc-500">No expenses this month.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{ background: "#0b0f13", border: "1px solid #065f46", borderRadius: 8, color: "#e5e7eb" }}
                      formatter={(v: any, _n: any, p: any) => [
                        `${idr.format(Number(v))} (${((p.percent || 0) * 100).toFixed(1)}%)`,
                        p.payload.name,
                      ]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={2}
                      isAnimationActive
                      animationDuration={700}
                    >
                      {pieData.map((s, i) => (
                        <Cell key={s.name} fill={s.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-emerald-700/40 bg-zinc-950/70 backdrop-blur text-zinc-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {err && <div className="mb-3 text-sm text-red-400">{err}</div>}
            {loading ? (
              <div className="text-sm text-zinc-500">Loading…</div>
            ) : recent.length === 0 ? (
              <div className="text-sm text-zinc-500">No data yet.</div>
            ) : (
              <ul className="divide-y divide-emerald-800/20">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: r.category?.color ?? "#10b981" }}
                      />
                      <div>
                        <div className="text-sm">
                          {r.category?.name ?? "Uncategorized"}
                          <span className="ml-2 text-xs text-zinc-500">{r.occurred_on}</span>
                        </div>
                        {r.note && <div className="text-xs text-zinc-400">{r.note}</div>}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        r.category?.type === "income" ? "text-emerald-300" : "text-zinc-100"
                      }`}
                    >
                      {idr.format(r.amount)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
