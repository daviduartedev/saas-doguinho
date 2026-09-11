import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  alterarPerfilUsuarioAction,
  alterarVinculoAction,
  criarUsuarioAction,
  desligarUsuarioAction,
} from "@/doguinho/admin-actions";
import { actorCan } from "@/doguinho/view";
import { loadWorkspace } from "@/doguinho/workspace";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string }>;
}) {
  const { loja } = await searchParams;
  const { actor, lojas, lojaId, snap, app } = await loadWorkspace(loja);
  if (!actorCan(actor, "manage_users")) redirect("/fechamento");
  const users = await app.listarUsuarios(actor);
  const perfis = await app.listarPerfis(actor);

  return (
    <AppShell lojas={lojas} lojaId={lojaId} actor={actor} status={snap?.status ?? null}>
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-steam">Gente</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink">Usuários</h1>
          <p className="mt-2 max-w-xl text-sm text-steam">
            E-mail, senha inicial, Perfil e Vínculo com Lojas. Loja não entra no checklist do Perfil.
          </p>
        </header>

        {actor.isDono || actorCan(actor, "manage_users") ? (
          <form action={criarUsuarioAction} className="space-y-3 rounded-md bg-sheet p-4">
            <h2 className="font-display text-lg font-bold">Novo usuário</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" name="nome" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="senha">Senha inicial</Label>
                <Input id="senha" name="senha" type="password" minLength={8} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="perfilId">Perfil</Label>
                <select
                  id="perfilId"
                  name="perfilId"
                  required
                  className="mt-1 h-11 w-full rounded-md border border-border bg-[var(--control)] px-3 text-sm"
                >
                  {perfis.map((perfil) => (
                    <option key={perfil.id} value={perfil.id}>
                      {perfil.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Vínculo</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {lojas.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="lojaIds"
                      value={item.id}
                      className="h-5 w-5 rounded-[6px] border-border accent-[var(--ketchup)]"
                    />
                    {item.nome}
                  </label>
                ))}
              </div>
            </fieldset>
            <Button type="submit">Criar usuário</Button>
          </form>
        ) : null}

        <ul className="space-y-3">
          {users.map((user) => (
            <li key={user.id} className="rounded-md bg-sheet p-4">
              <p className="font-semibold">
                {user.nome}{" "}
                <span className="text-sm font-medium text-steam">{user.email}</span>
                {user.isDono ? <span className="ml-2 text-xs text-ketchup">Dono</span> : null}
                {user.disabled ? <span className="ml-2 text-xs text-steam">desligado</span> : null}
              </p>
              {!user.isDono && !user.disabled ? (
                <div className="mt-3 space-y-3">
                  <form action={alterarVinculoAction} className="space-y-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-steam">Vínculo</p>
                    <div className="flex flex-wrap gap-3">
                      {lojas.map((item) => (
                        <label key={item.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="lojaIds"
                            value={item.id}
                            defaultChecked={user.lojaIds.includes(item.id)}
                            className="h-5 w-5 rounded-[6px] border-border accent-[var(--ketchup)]"
                          />
                          {item.nome}
                        </label>
                      ))}
                    </div>
                    <Button type="submit" variant="outline" size="sm">
                      Atualizar Vínculo
                    </Button>
                  </form>
                  {perfis.length > 0 ? (
                    <form action={alterarPerfilUsuarioAction} className="flex items-end gap-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <div>
                        <Label htmlFor={`perfil-${user.id}`}>Perfil</Label>
                        <select
                          id={`perfil-${user.id}`}
                          name="perfilId"
                          defaultValue={user.perfilId ?? ""}
                          className="mt-1 h-11 rounded-md border border-border bg-[var(--control)] px-3 text-sm"
                        >
                          {perfis.map((perfil) => (
                            <option key={perfil.id} value={perfil.id}>
                              {perfil.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button type="submit" variant="outline" size="sm">
                        Trocar Perfil
                      </Button>
                    </form>
                  ) : null}
                  <form action={desligarUsuarioAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Desligar
                    </Button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
