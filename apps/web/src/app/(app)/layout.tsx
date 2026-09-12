import { AppShell } from "@/components/shell/app-shell";
import { loadChrome } from "@/doguinho/workspace";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AppGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  // ASVS 8.2 / 8.3: authorization stays server-side. exigirActor (via loadChrome)
  // still gates the group: sem cookie → /entrar; cookie inválido → /sair (QA-002)
  const { actor, lojas } = await loadChrome();
  return (
    <AppShell actor={actor} lojas={lojas}>
      {children}
    </AppShell>
  );
}
