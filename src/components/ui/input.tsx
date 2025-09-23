import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-md px-3 py-2 text-sm",

        "bg-zinc-900/60 border border-zinc-800/80 text-zinc-100",
        "placeholder:text-zinc-500 caret-emerald-400",

        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ring-offset-transparent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}

      {...props}
    />
  )
}

export { Input }
