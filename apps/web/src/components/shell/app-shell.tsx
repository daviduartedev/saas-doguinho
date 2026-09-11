"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  Shield,
  Store,
  Users,
} from "lucide-react";
import { sairAction } from "@/doguinho/actions";
import { actorCan, rotuloStatus } from "@/doguinho/view";
import type { Actor, FechamentoStatus, Loja } from "@/doguinho/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function navItems(actor: Actor) {
  const items = [
    { href: "/fechamento", label: "Fechamento", icon: ClipboardList, show: actorCan(actor, "submit_fechamento") || actorCan(actor, "submit_correcao") },
    { href: "/estoque", label: "Estoque", icon: Package, show: actorCan(actor, "read_estoque") },
    { href: "/historico", label: "Histórico", icon: History, show: actorCan(actor, "read_history") },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: actorCan(actor, "dashboard") },
    { href: "/produtos", label: "Produtos", icon: Package, show: actorCan(actor, "manage_produto") },
    { href: "/usuarios", label: "Usuários", icon: Users, show: actorCan(actor, "manage_users") },
    { href: "/perfis", label: "Perfis", icon: Shield, show: actor.isDono },
  ];
  return items.filter((item) => item.show);
}

export function AppShell({
  children,
  lojas,
  lojaId,
  actor,
  status,
}: {
  children: React.ReactNode;
  lojas: Loja[];
  lojaId: string;
  actor: Actor;
  status: FechamentoStatus | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const nav = navItems(actor);

  function escolherLoja(id: string) {
    const next = new URLSearchParams(params);
    next.set("loja", id);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[212px_1fr]">
      <aside className="hidden bg-awning text-white md:flex md:flex-col">
        <div className="px-5 pb-6 pt-7">
          <p className="font-display text-xl font-extrabold leading-none tracking-tight">
            Doguinho
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-feather">
            do Corujá
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => {
            const ativo = pathname.startsWith(item.href);
            const Icon = item.icon;
            const href = lojaId ? `${item.href}?loja=${lojaId}` : item.href;
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "relative flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold",
                  ativo ? "bg-ketchup-hot text-white" : "text-white hover:bg-ketchup-hot",
                )}
              >
                {ativo ? <span className="pena absolute -left-1" /> : null}
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={sairAction} className="p-3">
          <Button variant="awning" className="w-full justify-start gap-3 px-3 text-white hover:bg-ketchup-hot" type="submit">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </form>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-sheet px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Store className="h-4 w-4 text-ketchup" />
            {lojas.length > 0 ? (
              <Select value={lojaId} onValueChange={escolherLoja}>
                <SelectTrigger className="h-10 w-[11rem] border-ketchup text-ketchup data-[state=open]:bg-ketchup data-[state=open]:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lojas.map((loja) => (
                    <SelectItem key={loja.id} value={loja.id}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm text-steam">Sem Loja no Vínculo</span>
            )}
            {status ? <StatusChip status={status} /> : null}
          </div>
          <p className="hidden text-sm text-steam md:block">
            {actor.isDono ? "Dono" : "Operador"} · {actor.nome}
          </p>
        </header>

        <main className="flex-1 px-4 py-5 md:px-8 md:py-7">{children}</main>

        <nav className="flex overflow-x-auto border-t border-border bg-awning md:hidden">
          {nav.map((item) => {
            const ativo = pathname.startsWith(item.href);
            const Icon = item.icon;
            const href = lojaId ? `${item.href}?loja=${lojaId}` : item.href;
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "relative flex h-14 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                  ativo ? "bg-ketchup-hot text-white" : "text-white",
                )}
              >
                {ativo ? <span className="pena absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2" /> : null}
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: FechamentoStatus }) {
  const map: Record<FechamentoStatus, string> = {
    nunca_fechou: "bg-counter text-ink",
    rascunho: "bg-mustard text-ink",
    enviado: "bg-ketchup text-white",
    correcao_necessaria: "bg-ketchup-hot text-white",
  };
  return (
    <span className={cn("rounded-md px-2.5 py-1 text-xs font-semibold", map[status])}>
      {rotuloStatus(status)}
    </span>
  );
}
