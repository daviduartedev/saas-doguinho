import Link from "next/link";
import { MarcaDoguinho } from "@/components/brand/marca-doguinho";

export function SidebarMarca() {
  return (
    <Link href="/fechamento" className="block px-4 py-3">
      <MarcaDoguinho priority sizes="240px" />
    </Link>
  );
}
