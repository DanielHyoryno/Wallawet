import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type Category = { id: string; name: string; type: "expense" | "income"; color: string | null };
type Txn = {
  id: string;
  amount: number;
  occurred_on: string;
  note: string | null;
  category_id: string | null;
  category: Category | null;   // object, not array
};


// --- helpers ---
function todayLocalYMD() {
  const now = new Date();
  const tz = now.getTimezoneOffset();
  const local = new Date(now.getTime() - tz * 60000);
  return local.toISOString().slice(0, 10);
}
const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" });

// If your FK name differs, open Supabase → transactions → Foreign Keys and copy it.
const CATEGORY_FK = "transactions_category_id_fkey";

export default function TransactionsPage() {
  // form
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(todayLocalYMD());
  const [note, setNote] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");

  // data
  const [cats, setCats] = useState<Category[]>([]);
  const [tx, setTx] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const hasCats = cats.length > 0;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

    const [cRes, tRes] = await Promise.all([
    supabase.from("categories").select("id,name,type,color").order("type").order("name"),
    supabase
        .from("transactions")
        .select<Txn>(`
        id, amount, occurred_on, note, category_id,
        category:categories!${CATEGORY_FK} ( id, name, type, color )
        `)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

      if (cRes.error) setErr(cRes.error.message);
      else setCats((cRes.data ?? []) as Category[]);

      if (tRes.error) setErr((prev) => prev ?? tRes.error!.message);
      else setTx((tRes.data ?? []) as Txn[]);

      setLoading(false);
    })();
  }, []);

  async function addTransaction(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const amt = parseFloat(amount);
    if (Number.isNaN(amt) || amt <= 0) return setErr("Enter a valid amount > 0.");
    if (!date) return setErr("Choose a date.");

    const { error } = await supabase.from("transactions").insert({
      amount: Math.round(amt * 100) / 100,
      occurred_on: date,
      note: note || null,
      category_id: categoryId || null,
    });

    if (error) return setErr(error.message);

    setAmount("");
    setNote("");
    await refreshList();
  }

  async function refreshList() {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        id, amount, occurred_on, note, category_id,
        category:categories!${CATEGORY_FK} ( id, name, type, color )
      `
      )
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) return setErr(error.message);
    setTx((data ?? []) as Txn[]);
  }

  async function del(id: string) {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) return setErr(error.message);
    setTx((prev) => prev.filter((r) => r.id !== id));
  }

  const totals = useMemo(() => {
    let expense = 0,
      income = 0;
    for (const r of tx) {
      const t = r.category?.type;
      if (t === "expense") expense += Number(r.amount) || 0;
      else if (t === "income") income += Number(r.amount) || 0;
    }
    return { expense, income, net: income - expense };
  }, [tx]);

  return (
    <div className="space-y-6">
      {/* Add form */}
      <Card className="border-emerald-700/40 bg-zinc-950/70 backdrop-blur text-zinc-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300">Add Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasCats && (
            <p className="mb-3 text-sm text-amber-300">
              You don’t have any categories yet. Create some in <span className="underline">Categories</span>.
              You can still add “Uncategorized” entries for now.
            </p>
          )}

          <form className="grid gap-3 md:grid-cols-4" onSubmit={addTransaction}>
            <div className="md:col-span-1">
              <label className="mb-1 block text-xs text-zinc-400">Amount</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-zinc-900/60 border-zinc-800/80 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-1">
              <label className="mb-1 block text-xs text-zinc-400">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-zinc-900/60 border-zinc-800/80 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-1">
              <label className="mb-1 block text-xs text-zinc-400">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border border-zinc-800/80 bg-zinc-900/60 px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Uncategorized</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.type === "income" ? "(income)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="mb-1 block text-xs text-zinc-400">Note</label>
              <Input
                placeholder="optional"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-zinc-900/60 border-zinc-800/80 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-4">
              <Button type="submit" className="w-full md:w-auto">
                Add
              </Button>
            </div>
          </form>

          {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
        </CardContent>
      </Card>

      {/* Totals quick glance */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Expense", value: idr.format(totals.expense) },
          { label: "Income", value: idr.format(totals.income) },
          { label: "Net", value: idr.format(totals.net) },
        ].map((k) => (
          <Card key={k.label} className="border-emerald-700/40 bg-zinc-950/70 backdrop-blur text-zinc-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-300">{k.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{k.value}</CardContent>
          </Card>
        ))}
      </div>

      {/* Recent list */}
      <Card className="border-emerald-700/40 bg-zinc-950/70 backdrop-blur text-zinc-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300">Recent (latest 30)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-zinc-400">Loading…</div>
          ) : tx.length === 0 ? (
            <div className="text-sm text-zinc-400">No data yet.</div>
          ) : (
            <ul className="divide-y divide-emerald-800/20">
              {tx.map((r) => (
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

                  <div className="flex items-center gap-4">
                    <div
                      className={`text-sm font-medium ${
                        r.category?.type === "income" ? "text-emerald-300" : "text-zinc-100"
                      }`}
                    >
                      {idr.format(r.amount)}
                    </div>
                    <button
                      onClick={() => del(r.id)}
                      className="rounded-md p-1 text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
