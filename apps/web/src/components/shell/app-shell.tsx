"use client";

import type { ReactNode } from "react";
import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Shield,
  Store,
  Users,
} from "lucide-react";
import { sairAction } from "@/doguinho/actions";
import { actorCan, rotuloStatus } from "@/doguinho/view";
import type { Actor, FechamentoStatus, Loja } from "@/doguinho/types";
import { FILTRO_TODAS, resolveLojaFiltro } from "@/doguinho/workspace-filtro";
import { SidebarMarca } from "@/components/brand/sidebar-marca";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

function navItems(actor: Actor) {
  const items = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: actorCan(actor, "dashboard") },
    { href: "/fechamento", label: "Fechamento", icon: ClipboardList, show: actorCan(actor, "submit_fechamento") || actorCan(actor, "submit_correcao") },
    { href: "/estoque", label: "Estoque", icon: Package, show: actorCan(actor, "read_estoque") },
    { href: "/historico", label: "Histórico", icon: History, show: actorCan(actor, "read_history") },
    { href: "/produtos", label: "Produtos", icon: Package, show: actorCan(actor, "manage_produto") },
    { href: "/usuarios", label: "Usuários", icon: Users, show: actorCan(actor, "manage_users") },
    { href: "/perfis", label: "Perfis", icon: Shield, show: actor.isDono },
    { href: "/configuracoes", label: "Configurações", icon: Settings, show: actor.isDono },
  ];
  return items.filter((item) => item.show);
}

export function AppShell({
  children,
  lojas,
  actor,
}: {
  children: ReactNode;
  lojas: Loja[];
  actor: Actor;
}) {
  return (
    <div className="app-shell">
      <div className="app-frame">
        <aside className="app-nav-side">
          <NavChrome actor={actor} lojas={lojas} />
        </aside>

        <div className="app-column">
          <ShellHeader actor={actor} lojas={lojas}>
            <Store className="h-4 w-4 shrink-0 text-ketchup" />
            {lojas.length === 0 ? (
              <span className="text-[15px] text-steam">Sem Loja no Vínculo</span>
            ) : lojas.length > 1 ? (
              <Suspense fallback={<span className="h-10 min-w-[8rem]" />}>
                <LojaFiltro lojas={lojas} />
              </Suspense>
            ) : null}
            <span id="shell-status" className="flex items-center" />
          </ShellHeader>
          <main className="page-gutter flex-1 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

function NavChrome({
  actor,
  lojas,
  onNavigate,
}: {
  actor: Actor;
  lojas: Loja[];
  onNavigate?: () => void;
}) {
  return (
    <div className="app-nav-panel">
      <SidebarMarca />
      <Suspense fallback={<nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Seções" />}>
        <SideNav actor={actor} lojas={lojas} onNavigate={onNavigate} />
      </Suspense>
      <footer className="app-nav-side-foot">
        <p className="app-actor">
          {actor.isDono ? "Dono" : "Operador"} · {actor.nome}
        </p>
        <form action={sairAction}>
          <SubmitButton variant="awning" className="w-full justify-start gap-3 px-3 text-white hover:bg-ketchup-hot">
            <LogOut className="h-4 w-4" />
            Sair
          </SubmitButton>
        </form>
      </footer>
    </div>
  );
}

function ShellHeader({
  actor,
  lojas,
  children,
}: {
  actor: Actor;
  lojas: Loja[];
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [aberto, setAberto] = useState(false);

  function abrir() {
    dialogRef.current?.showModal();
    setAberto(true);
  }

  function fechar() {
    dialogRef.current?.close();
    setAberto(false);
  }

  return (
    <>
      <header className="page-gutter relative z-20 flex items-center gap-3 overflow-visible border-b border-border bg-sheet py-3">
        <button
          type="button"
          className="app-nav-toggle"
          aria-label="Abrir menu"
          aria-expanded={aberto}
          onClick={abrir}
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        {children}
      </header>
      <dialog
        ref={dialogRef}
        className="app-nav-dialog"
        aria-label="Menu"
        onClose={() => setAberto(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) fechar();
        }}
      >
        <NavChrome actor={actor} lojas={lojas} onNavigate={fechar} />
      </dialog>
    </>
  );
}

function useLojaId(lojas: Loja[]) {
  const params = useSearchParams();
  return resolveLojaFiltro(params.get("loja") ?? undefined, lojas.map((loja) => loja.id));
}

function lojaHref(href: string, lojaId: string) {
  return lojaId ? `${href}?loja=${lojaId}` : href;
}

function SideNav({
  actor,
  lojas,
  onNavigate,
}: {
  actor: Actor;
  lojas: Loja[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const lojaId = useLojaId(lojas);
  const nav = navItems(actor);
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Seções">
      {nav.map((item) => {
        const ativo = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={lojaHref(item.href, lojaId)}
            onClick={onNavigate}
            className={cn(
              "relative flex h-12 items-center gap-3 rounded-md px-3 text-[15px] font-semibold",
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
  );
}

function LojaFiltro({ lojas }: { lojas: Loja[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const lojaId = useLojaId(lojas);

  function escolherLoja(id: string) {
    const next = new URLSearchParams(params);
    next.set("loja", id);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <Select value={lojaId || FILTRO_TODAS} onValueChange={escolherLoja}>
                <SelectTrigger
                  aria-label="Loja"
                  className="h-10 w-max max-w-full justify-start gap-3 border-transparent bg-transparent px-2 text-ink data-[state=open]:border-ketchup data-[state=open]:bg-ketchup data-[state=open]:text-white data-[state=open]:[&_svg]:text-white"
                >
                  <SelectValue />
                </SelectTrigger>
      <SelectContent>
        <SelectItem value="todas">Todas as Lojas</SelectItem>
        {lojas.map((loja) => (
          <SelectItem key={loja.id} value={loja.id}>
            {loja.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StatusChip({ status }: { status: FechamentoStatus }) {
  const label = rotuloStatus(status);
  if (!label || status === "nunca_fechou") return null;
  const map = {
    rascunho: "bg-mustard text-ink",
    enviado: "bg-ketchup text-white",
    correcao_necessaria: "bg-ketchup-hot text-white",
  } as const;
  return (
    <span className={cn("rounded-md px-2.5 py-1 text-xs font-semibold", map[status])}>
      {label}
    </span>
  );
}
