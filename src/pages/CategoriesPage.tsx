import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Cat = {
  id: string;
  name: string;
  type: "expense" | "income";
  color: string | null;
  created_at: string;
};

export default function CategoriesPage() {
  const [items, setItems] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // form state
  const [name, setName] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [color, setColor] = useState("#10b981"); // emerald

  async function load() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,type,color,created_at")
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) return setErr(error.message);
    setItems((data ?? []) as Cat[]);
  }

  useEffect(() => { load(); }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr("Name is required.");
    const { error } = await supabase.from("categories").insert({
      name: name.trim(),
      type,
      color,
    });
    if (error) {
      if ((error as any).code === "23505") setErr("That category already exists.");
      else setErr(error.message);
      return;
    }
    setName("");
    await load();
  }

  async function onDelete(id: string) {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return setErr(error.message);
    setItems((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <Card className="border-emerald-700/40 bg-zinc-950/70 backdrop-blur text-zinc-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300">Add Category</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={onAdd}>
            <Input
              placeholder="e.g., Food"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sm:col-span-2 bg-zinc-900/60 border-zinc-800/80 focus-visible:ring-emerald-500"
            />

            {/* native select to avoid extra deps */}
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="rounded-md border border-zinc-800/80 bg-zinc-900/60 px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-14 rounded-md border border-zinc-800/80 bg-transparent p-1"
                title="Color"
              />
              <Button type="submit" className="flex-1">Add</Button>
            </div>
          </form>
          {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-emerald-700/40 bg-zinc-950/70 backdrop-blur text-zinc-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300">Your Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-zinc-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-zinc-400">No categories yet.</div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => (
                <li key={c.id}
                    className="flex items-center justify-between rounded-lg border border-emerald-700/30 bg-zinc-950/70 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: c.color ?? "#10b981" }}
                      aria-hidden
                    />
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div
                        className={cn(
                          "text-xs",
                          c.type === "expense" ? "text-rose-300" : "text-emerald-300"
                        )}
                      >
                        {c.type}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onDelete(c.id)}
                    className="rounded-md p-1 text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
