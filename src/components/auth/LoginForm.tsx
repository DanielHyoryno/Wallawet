import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Field } from "@/components/common/Field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = { onCreateAccount: () => void };

export default function LoginForm({ onCreateAccount }: Props) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) return setErr(error.message);
    navigate("/dashboard");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Field label="Email">
        <Input name="email" type="email" placeholder="you@example.com" required
               value={email} onChange={(e) => setEmail(e.target.value)}
               className="bg-zinc-900/60 border-zinc-800/80 focus-visible:ring-2 focus-visible:ring-emerald-500" />
      </Field>

      <Field label="Password">
        <Input name="password" type="password" placeholder="••••••••" required
               value={pw} onChange={(e) => setPw(e.target.value)}
               className="bg-zinc-900/60 border-zinc-800/80 focus-visible:ring-2 focus-visible:ring-emerald-500" />
      </Field>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <Button type="submit" disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400">
        {loading ? "Logging in..." : "Login"}
      </Button>

      <p className="text-xs text-zinc-400 text-center">
        No account?{" "}
        <button type="button" onClick={onCreateAccount}
                className="underline underline-offset-4 decoration-emerald-400 hover:text-emerald-300">
          Create one
        </button>
      </p>
    </form>
  );
}
