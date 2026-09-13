import { redirect } from "next/navigation";
import { exigirActor } from "@/doguinho/sessao";
import { homePath } from "@/doguinho/view";

export default async function Home() {
  const actor = await exigirActor();
  redirect(homePath(actor));
}
