"use client";

import type { ButtonHTMLAttributes } from "react";
import { Button as MantineButton } from "@mantine/core";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("", {
  variants: {
    variant: {
      primary: "",
      outline: "",
      ghost: "",
      awning: "",
    },
    size: {
      default: "h-11",
      sm: "",
      lg: "",
      icon: "!h-10 !w-10 !p-0",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "default",
  },
});

function mantineVariant(variant: VariantProps<typeof buttonVariants>["variant"]) {
  if (variant === "outline") return "default" as const;
  if (variant === "ghost") return "subtle" as const;
  return "filled" as const;
}

function mantineSize(size: VariantProps<typeof buttonVariants>["size"]) {
  if (size === "sm") return "sm" as const;
  if (size === "lg") return "lg" as const;
  if (size === "icon") return "compact-sm" as const;
  return "md" as const;
}

export function Button({
  className,
  variant,
  size,
  pending = false,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { pending?: boolean }) {
  const busy = pending || Boolean(disabled);
  const outline = variant === "outline";
  const ghost = variant === "ghost";

  return (
    <MantineButton
      type={type}
      variant={mantineVariant(variant)}
      size={mantineSize(size)}
      color={outline || ghost ? undefined : "ketchup"}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={busy}
      loading={pending}
      loaderProps={{ type: "dots", color: outline || ghost ? "var(--ink)" : "white" }}
      styles={{
        root: outline
          ? {
              background: "var(--sheet)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
            }
          : ghost
            ? {
                background: "transparent",
                color: "inherit",
              }
            : undefined,
      }}
      {...props}
    >
      {children}
    </MantineButton>
  );
}

export { buttonVariants };
