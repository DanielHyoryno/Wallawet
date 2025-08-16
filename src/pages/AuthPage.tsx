import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <div className="min-h-screen grid place-items-center p-6 text-zinc-100 bg-gradient-to-b from-black via-zinc-950 to-emerald-950">
      <Card className="w-full sm:max-w-md md:max-w-lg rounded-2xl border border-emerald-700/40
        bg-zinc-950/70 backdrop-blur-md shadow-xl shadow-emerald-900/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            <span className="text-center bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
              Wallawet
            </span>
          </CardTitle>
          <p className="text-sm text-zinc-400">Track your money with style.</p>
        </CardHeader>

        <CardContent className="pt-0">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList
            className="relative grid w-full grid-cols-2 rounded-xl border border-emerald-700/40 bg-transparent text-white"
          >
            {/* sliding green pill */}
            <motion.div
              layout
              className="absolute inset-y-0 left-0 w-1/2 rounded-lg bg-emerald-600"
              initial={false}
              animate={{ x: tab === "login" ? "0%" : "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
            />
            <TabsTrigger
              value="login"
              className="relative z-10 rounded-lg !bg-transparent !text-white
                        data-[state=active]:!bg-transparent data-[state=active]:!text-white
                        focus-visible:ring-0 focus-visible:ring-offset-0 ring-offset-transparent"
            >
              Login
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="relative z-10 rounded-lg !bg-transparent !text-white
                        data-[state=active]:!bg-transparent data-[state=active]:!text-white
                        focus-visible:ring-0 focus-visible:ring-offset-0 ring-offset-transparent"
            >
              Create account
            </TabsTrigger>
          </TabsList>

            <div className="mt-5">
              <AnimatePresence mode="wait">
                {tab === "login" ? (
                  <motion.div key="login" initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.99 }} transition={{ duration: 0.25, ease: "easeOut" }}>
                    <LoginForm onCreateAccount={() => setTab("register")} />
                  </motion.div>
                ) : (
                  <motion.div key="register" initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.99 }} transition={{ duration: 0.25, ease: "easeOut" }}>
                    <RegisterForm onGoLogin={() => setTab("login")} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
