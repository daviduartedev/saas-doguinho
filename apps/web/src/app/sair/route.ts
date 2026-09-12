import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/doguinho/constants";

/**
 * Quebra o loop de redirect de sessão inválida (QA-002): o middleware confia na
 * presença do cookie e só um Route Handler pode apagá-lo. exigirActor manda para
 * cá quando o token existe mas não resolve mais (expirado, revogado, adulterado).
 */
export async function GET() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/entrar");
}
