"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  pending: pendingProp,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending: formPending } = useFormStatus();
  const pending = Boolean(pendingProp) || formPending;
  return (
    <Button type="submit" pending={pending} disabled={pending || disabled} {...props}>
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}
