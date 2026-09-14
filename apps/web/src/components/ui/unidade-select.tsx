"use client";

import { useState } from "react";
import type { UnidadeMedida } from "@/doguinho/types";
import { UNIDADES } from "@/doguinho/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function UnidadeSelect({
  id,
  name,
  defaultValue = UNIDADES[0],
  className,
}: {
  id: string;
  name: string;
  defaultValue?: UnidadeMedida;
  className?: string;
}) {
  const [value, setValue] = useState<UnidadeMedida>(defaultValue);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={(next) => setValue(next as UnidadeMedida)}>
        <SelectTrigger id={id} className={className}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {UNIDADES.map((unidade) => (
            <SelectItem key={unidade} value={unidade}>
              {unidade}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
