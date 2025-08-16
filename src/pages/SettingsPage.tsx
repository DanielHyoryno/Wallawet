import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Profile = {
  full_name: string | null;
  currency: string | null;            // e.g., "IDR"
  first_day_of_week: number | null;   // 0 = Sunday, 1 = Monday
  timezone: string | null;            // e.g., "Asia/Jakarta"
  locale: string | null;              // e.g., "id-ID"
};

const TZ_DEFAULT = Intl.DateTimeFormat().resolvedOptions().timeZone;
const LOC_DEFAULT = navigator.language || "id-ID";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [p, setP] = useState<Profile>({
    full_name: "",
    currency: "IDR",
    first_day_of_week: 1,
    timezone: TZ_DEFAULT,
    locale: LOC_DEFAULT,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        setErr("Not authenticated.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,currency,first_day_of_week,timezone,locale")
        .eq("id", auth.user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        setErr(error.message);
      } else if (data) {
        setP({
          full_name: data.full_name ?? "",
          currency: data.currency ?? "IDR",
          first_day_of_week: data.first_day_of_week ?? 1,
          timezone: data.timezone ?? TZ_DEFAULT,
          locale: data.locale ?? LOC_DEFAULT,
        });
      }
      setLoading(false);
    })();
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      setErr("Not authenticated.");
      setSaving(false);
      return;
    }

    const payload = {
      id: auth.user.id, // upsert requires id
      full_name: p.full_name || null,
      currency: p.currency || "IDR",
      first_day_of_week: p.first_day_of_week ?? 1,
      timezone: p.timezone || TZ_DEFAULT,
      locale: p.locale || LOC_DEFAULT,
    };

    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

    if (error) setErr(error.message);
    else setMsg("Saved ✔");

    setSaving(false);
    setTimeout(() => setMsg(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Card className="border-emerald-700/40 bg-zinc-950/70 backdrop-blur text-zinc-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300">Profile & Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-zinc-500">Loading…</div>
          ) : (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={onSave}>
              {/* Full name */}
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-zinc-400">Full name</label>
                <Input
                  value={p.full_name ?? ""}
                  onChange={(e) => setP({ ...p, full_name: e.target.value })}
                  placeholder="Your name"
                  className="bg-zinc-900/60 border-zinc-800/80 focus-visible:ring-emerald-500"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Currency</label>
                <select
                  value={p.currency ?? "IDR"}
                  onChange={(e) => setP({ ...p, currency: e.target.value })}
                  className="w-full rounded-md border border-zinc-800/80 bg-zinc-900/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="IDR">IDR — Rupiah</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="JPY">JPY — Yen</option>
                </select>
              </div>

              {/* First day of week */}
              <div>
                <label className="mb-1 block text-xs text-zinc-400">First day of week</label>
                <select
                  value={p.first_day_of_week ?? 1}
                  onChange={(e) => setP({ ...p, first_day_of_week: Number(e.target.value) })}
                  className="w-full rounded-md border border-zinc-800/80 bg-zinc-900/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={1}>Monday</option>
                  <option value={0}>Sunday</option>
                </select>
              </div>

              {/* Timezone */}
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Timezone</label>
                <Input
                  value={p.timezone ?? TZ_DEFAULT}
                  onChange={(e) => setP({ ...p, timezone: e.target.value })}
                  placeholder="e.g., Asia/Jakarta"
                  className="bg-zinc-900/60 border-zinc-800/80 focus-visible:ring-emerald-500"
                />
              </div>

              {/* Locale */}
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Locale</label>
                <select
                  value={p.locale ?? LOC_DEFAULT}
                  onChange={(e) => setP({ ...p, locale: e.target.value })}
                  className="w-full rounded-md border border-zinc-800/80 bg-zinc-900/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="id-ID">Indonesian — id-ID</option>
                  <option value="en-US">English — en-US</option>
                  <option value="en-GB">English — en-GB</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                {msg && <span className="text-emerald-300 text-sm">{msg}</span>}
                {err && <span className="text-red-400 text-sm">{err}</span>}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Account & Danger Zone (placeholders for later) */}
      <Card className="border-emerald-700/40 bg-zinc-950/70 backdrop-blur text-zinc-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300">Account</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-400">
          Change email/password, export data, and delete account will go here.
        </CardContent>
      </Card>
    </div>
  );
}
