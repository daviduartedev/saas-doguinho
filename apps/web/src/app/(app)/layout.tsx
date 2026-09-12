import { exigirActor } from "@/doguinho/sessao";
import type { ReactNode } from "react";

export default async function AppGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  // exigirActor cuida dos dois casos: sem cookie → /entrar; cookie inválido → /sair (QA-002)
  await exigirActor();
  return children;
}
