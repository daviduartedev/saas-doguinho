"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PerfilSelect({
  id,
  name,
  defaultValue,
  options,
  className,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  options: Array<{ id: string; nome: string }>;
  className?: string;
}) {
  const initial = options.some((perfil) => perfil.id === defaultValue)
    ? defaultValue!
    : (options[0]?.id ?? "");
  const [value, setValue] = useState(initial);

  if (options.length === 0) {
    return <input type="hidden" name={name} value="" />;
  }

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id={id} className={className}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((perfil) => (
            <SelectItem key={perfil.id} value={perfil.id}>
              {perfil.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
