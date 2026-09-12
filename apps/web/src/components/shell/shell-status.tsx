"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FechamentoStatus } from "@/doguinho/types";
import { FILTRO_TODAS } from "@/doguinho/workspace-filtro";
import { StatusChip } from "./app-shell";

export function ShellStatus({
  status,
  filtro,
}: {
  status: FechamentoStatus | null;
  filtro: string;
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById("shell-status"));
  }, []);
  if (!slot || !status || filtro === FILTRO_TODAS) return null;
  return createPortal(<StatusChip status={status} />, slot);
}
