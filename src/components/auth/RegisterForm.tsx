import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Field } from "@/components/common/Field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = { onGoLogin: () => void };

export default function RegisterForm({ onGoLogin }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setNote(null);
    if (pw !== confirm) return setErr("Passwords do not match.");

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw,
      // You can pass user_metadata (like full name) here if you want:
      options: { data: { full_name: name || null } }
    });
    setLoading(false);

    if (error) return setErr(error.message);

    // If email confirmations are ON, Supabase won't create a session yet:
    if (!data.session) {
      setNote("Account created. Check your email to verify and log in.");
      return;
    }

    // If confirmations OFF, you’re signed in now:
    navigate("/dashboard");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Field label="Full name (optional)">
        <Input name="name" placeholder="John Doe" value={name}
               onChange={(e) => setName(e.target.value)}
               className="bg-zinc-900/60 border-zinc-800/80 focus-visible:ring-2 focus-visible:ring-emerald-500" />
      </Field>

      <Field label="Email">
        <Input name="reg-email" type="email" placeholder="you@example.com" required
               value={email} onChange={(e) => setEmail(e.target.value)}
               className="bg-zinc-900/60 border-zinc-800/80 focus-visible:ring-2 focus-visible:ring-emerald-500" />
      </Field>

      <Field label="Password">
        <Input name="reg-password" type="password" placeholder="••••••••" required
               value={pw} onChange={(e) => setPw(e.target.value)}
               className="bg-zinc-900/60 border-zinc-800/80 focus-visible:ring-2 focus-visible:ring-emerald-500" />
      </Field>

      <Field label="Confirm password">
        <Input name="reg-confirm" type="password" placeholder="••••••••" required
               value={confirm} onChange={(e) => setConfirm(e.target.value)}
               className="bg-zinc-900/60 border-zinc-800/80 focus-visible:ring-2 focus-visible:ring-emerald-500" />
      </Field>

      {err && <p className="text-sm text-red-400">{err}</p>}
      {note && <p className="text-sm text-emerald-300">{note}</p>}

      <Button type="submit" disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400">
        {loading ? "Creating..." : "Create account"}
      </Button>

      <p className="text-xs text-zinc-400 text-center">
        Already have an account?{" "}
        <button type="button" onClick={onGoLogin}
                className="underline underline-offset-4 decoration-emerald-400 hover:text-emerald-300">
          Log in
        </button>
      </p>
    </form>
  );
}
