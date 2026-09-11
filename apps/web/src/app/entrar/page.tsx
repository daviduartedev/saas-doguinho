import Image from "next/image";
import { Mail } from "lucide-react";
import { entrarAction } from "@/doguinho/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginBackdrop } from "@/components/login/login-backdrop";
import { LoginPasswordField } from "@/components/login/login-password-field";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;
  const erro = params.erro === "1";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ketchup px-4 py-10">
      <LoginBackdrop />

      <section className="relative z-10 w-full max-w-[520px] rounded-[10px] bg-sheet px-10 pb-10 pt-8 md:max-w-[560px] md:px-12 md:pb-12 md:pt-10">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/marca-doguinho.png"
            alt="Doguinho do Corujá"
            width={1958}
            height={1112}
            priority
            quality={100}
            sizes="(min-width: 768px) 320px, 270px"
            className="h-auto w-[270px] md:w-[320px]"
          />
          <h1 className="mt-6 font-display text-3xl font-bold text-ink">Entrar</h1>
          <p className="mt-1 text-base text-steam">Acesse seu sistema de estoque</p>
        </div>

        <form action={entrarAction} className="mt-8 space-y-4">
          {erro ? (
            <p className="rounded-md bg-ketchup/10 px-3 py-2 text-sm font-medium text-ketchup">
              E-mail ou senha inválidos.
            </p>
          ) : null}

          <Label className="sr-only" htmlFor="email">
            E-mail
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steam" />
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="E-mail"
              className="h-12 pl-10"
            />
          </div>

          <LoginPasswordField />

          <Button type="submit" className="mt-2 h-12 w-full text-base">
            Entrar
            <span aria-hidden>→</span>
          </Button>
        </form>
      </section>
    </main>
  );
}
