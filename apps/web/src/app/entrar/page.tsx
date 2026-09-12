import { Mail } from "lucide-react";
import { entrarAction } from "@/doguinho/actions";
import { MarcaDoguinho } from "@/components/brand/marca-doguinho";
import { SubmitButton } from "@/components/ui/submit-button";
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
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-ketchup px-[max(1rem,4vw)] py-10">
      <LoginBackdrop />

      <section className="relative z-10 w-full max-w-[min(32.5rem,100%)] rounded-lg bg-sheet px-[max(1.5rem,4vw)] pb-10 pt-8">
        <div className="flex flex-col items-center text-center">
          <MarcaDoguinho
            priority
            sizes="(min-width: 32rem) 320px, 70vw"
            className="w-[min(20rem,70vw)]"
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

          <SubmitButton type="submit" className="mt-2 h-12 w-full text-base">
            Entrar
          </SubmitButton>
        </form>
      </section>
    </main>
  );
}
