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

type RangeKey = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" });
const locale = navigator.language || "id-ID";
const CATEGORY_FK = "transactions_category_id_fkey";
const FALLBACK_COLORS = ["#34d399", "#22d3ee", "#a78bfa", "#f472b6", "#f59e0b", "#60a5fa"];

// ---------- date helpers ----------
function ymd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function subMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() - months);
  return x;
}
function startOfISOWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0..Sun=6
  x.setDate(x.getDate() - day);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

function rangeToBounds(range: RangeKey) {
  const end = new Date();
  if (range === "ALL") return { start: null as string | null, end: ymd(end) }; // no lower bound
  if (range === "1W") return { start: ymd(addDays(end, -6)), end: ymd(end) };
  if (range === "1M") return { start: ymd(subMonths(end, 1)), end: ymd(end) };
  if (range === "3M") return { start: ymd(subMonths(end, 3)), end: ymd(end) };
  if (range === "6M") return { start: ymd(subMonths(end, 6)), end: ymd(end) };
  // 1Y
  return { start: ymd(subMonths(end, 12)), end: ymd(end) };
}

function pickBucket(range: RangeKey): "day" | "week" | "month" {
  if (range === "1W" || range === "1M") return "day";
  if (range === "3M" || range === "6M") return "week";
  return "month"; // 1Y / ALL
}

export default function DashboardPage() {
  const [range, setRange] = useState<RangeKey>("1M"); // NEW: selector
  const [rows, setRows] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // fetch transactions for selected range
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { start, end } = rangeToBounds(range);

      let q = supabase
        .from("transactions")
        .select(`
          id, amount, occurred_on, note, category_id,
          category:categories!${CATEGORY_FK} ( id, name, type, color )
        `)
        .order("occurred_on", { ascending: true })
        .order("created_at", { ascending: true });

      if (start) {
        q = q.gte("occurred_on", start).lte("occurred_on", end);
      } // for ALL, no lower bound (RLS still keeps you scoped to your data)

      const { data, error } = await q.returns<Txn[]>();
      if (error) setErr(error.message);
      else setRows(data ?? []);
      setLoading(false);
    })();
  }, [range]);

  // ---------- KPIs (for the selected range) ----------
  const kpis = useMemo(() => {
    const expenseOnly = rows.filter((r) => r.category?.type === "expense");
    const monthSpend = expenseOnly.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const txCount = rows.length;
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
    // average per day over actual days in the selected window
    const { start, end } = rangeToBounds(range);
    const dStart = start ? new Date(start) : (rows[0] ? new Date(rows[0].occurred_on) : new Date());
    const dEnd = new Date(end);
    const days = Math.max(1, Math.ceil((+dEnd - +dStart) / 86400000) + 1);
    const avgPerDay = monthSpend / days;
    return { monthSpend, txCount, topCategory, avgPerDay };
  }, [rows, range]);

  // ---------- BAR: aggregate by day/week/month depending on range ----------
  const barData = useMemo(() => {
    const bucket = pickBucket(range);
    const expenseOnly = rows.filter((r) => r.category?.type === "expense");

    const map = new Map<
      string,
      { label: string; spend: number; sortKey: number }
    >();

    for (const r of expenseOnly) {
      const d = new Date(r.occurred_on);
      let key = "";
      let label = "";
      let sortKey = 0;

      if (bucket === "day") {
        key = ymd(d);
        label = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(d);
        sortKey = +new Date(key);
      } else if (bucket === "week") {
        const s = startOfISOWeek(d);
        key = ymd(s);
        label = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(s);
        sortKey = +s;
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        label = new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit" }).format(d);
        sortKey = d.getFullYear() * 100 + (d.getMonth() + 1);
      }

      const prev = map.get(key)?.spend ?? 0;
      map.set(key, { label, spend: prev + Number(r.amount || 0), sortKey });
    }

    return [...map.values()].sort((a, b) => a.sortKey - b.sortKey);
  }, [rows, range]);

  // ---------- PIE: expense by category in selected range ----------
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

  const recent = useMemo(() => [...rows].reverse().slice(0, 8), [rows]);

  const RANGE_OPTS: RangeKey[] = ["1W", "1M", "3M", "6M", "1Y", "ALL"];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Spend (range)", value: idr.format(kpis.monthSpend) },
          { label: "Transactions", value: String(kpis.txCount) },
          { label: "Top Category", value: kpis.topCategory },
          { label: "Avg / Day", value: idr.format(kpis.avgPerDay || 0) },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
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
        {/* Bar (2/3 width) */}
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-emerald-700/40 bg-zinc-950/70 backdrop-blur text-zinc-100">
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm text-zinc-400">Spending</CardTitle>

              {/* NEW: Range Selector */}
              <div className="inline-flex rounded-lg border border-emerald-800/40 bg-zinc-900/60 p-1">
                {RANGE_OPTS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-2.5 py-1 text-xs rounded-md transition
                      ${range === r
                        ? "bg-emerald-600 text-white shadow"
                        : "text-zinc-300 hover:text-white hover:bg-emerald-700/20"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="h-72">
              {loading ? (
                <div className="h-full grid place-items-center text-zinc-500">Loading…</div>
              ) : barData.length === 0 ? (
                <div className="h-full grid place-items-center text-zinc-500">No expenses in range.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 12, right: 12, left: 64, bottom: 8 }}>
                    <defs>
                      <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#065f46" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#0f172a" strokeOpacity={0.25} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={{ stroke: "#334155" }} tickMargin={6} />
                    <YAxis
                      width={72}
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                      axisLine={{ stroke: "#334155" }}
                      tickMargin={8}
                      tickFormatter={(v) => idr.format(v).replace("Rp", "Rp ")}
                    />
                    <Tooltip
                      cursor={{ fill: "#22c55e22" }}
                      contentStyle={{ background: "#0b0f13", border: "1px solid #065f46", borderRadius: 8, color: "#e5e7eb" }}
                      formatter={(v: any) => [idr.format(Number(v)), "Spend"]}
                    />
                    <Bar dataKey="spend" fill="url(#barGreen)" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie (1/3 width) */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-emerald-700/40 bg-zinc-950/70 backdrop-blur text-zinc-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Categories — % of Spend</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {loading ? (
                <div className="h-full grid place-items-center text-zinc-500">Loading…</div>
              ) : pieData.length === 0 ? (
                <div className="h-full grid place-items-center text-zinc-500">No expenses in range.</div>
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
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.category?.color ?? "#10b981" }} />
                    <div>
                      <div className="text-sm">
                        {r.category?.name ?? "Uncategorized"}
                        <span className="ml-2 text-xs text-zinc-500">{r.occurred_on}</span>
                      </div>
                      {r.note && <div className="text-xs text-zinc-400">{r.note}</div>}
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${r.category?.type === "income" ? "text-emerald-300" : "text-zinc-100"}`}>
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
