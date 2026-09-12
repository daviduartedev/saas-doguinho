import Image from "next/image";
import { cn } from "@/lib/utils";

export function MarcaDoguinho({
  className,
  sizes,
  priority = false,
}: {
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/marca-doguinho.png"
      alt="Doguinho do Corujá"
      width={1024}
      height={576}
      priority={priority}
      sizes={sizes}
      className={cn("h-auto w-full", className)}
    />
  );
}
