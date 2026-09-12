"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPasswordField() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Label className="sr-only" htmlFor="senha">
        Senha
      </Label>
      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steam" />
      <Input
        id="senha"
        name="senha"
        type={visible ? "text" : "password"}
        required
        autoComplete="current-password"
        placeholder="Senha"
        className="h-12 px-10 pr-12"
      />
      <button
        type="button"
        className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-steam hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ketchup"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}
