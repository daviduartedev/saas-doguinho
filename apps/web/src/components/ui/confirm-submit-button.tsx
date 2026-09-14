"use client";

import type { ComponentProps, MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

const EXCLUIR_PRODUTO =
  "Excluir este Produto do catálogo? O passado permanece no Histórico.";

export function ConfirmSubmitButton({
  children,
  confirmMessage = EXCLUIR_PRODUTO,
  disabled,
  pending: pendingProp,
  onClick,
  ...props
}: ComponentProps<typeof Button> & { confirmMessage?: string }) {
  const { pending: formPending } = useFormStatus();
  const pending = Boolean(pendingProp) || formPending;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(confirmMessage)) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <Button
      type="submit"
      pending={pending}
      disabled={pending || disabled}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Button>
  );
}
