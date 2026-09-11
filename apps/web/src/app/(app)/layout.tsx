import { actorDaSessao } from "@/doguinho/sessao";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function AppGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actor = await actorDaSessao();
  if (!actor) redirect("/entrar");
  return children;
}
