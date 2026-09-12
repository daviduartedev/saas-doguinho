import { PageCanvas } from "@/components/ui/page-canvas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  alterarPerfilUsuarioAction,
  alterarVinculoAction,
  criarUsuarioAction,
  desligarUsuarioAction,
} from "@/doguinho/admin-actions";
import { actorCan } from "@/doguinho/view";
import { loadWorkspace } from "@/doguinho/workspace";
import { Pager } from "@/components/ui/pager";
import { paginate } from "@/lib/pagination";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string; page?: string }>;
}) {
  const { loja, page } = await searchParams;
  const workspace = await loadWorkspace(loja, { produtos: false, lojaState: false });
  const { actor, lojas, filtro, app } = workspace;
  if (!actorCan(actor, "manage_users")) redirect("/fechamento");
  const [users, perfis] = await Promise.all([app.listarUsuarios(actor), app.listarPerfis(actor)]);
  const listing = paginate(users, page);

  return (
    <PageCanvas>
        <header>
          <h1 className="font-display text-3xl font-bold text-ink">Usuários</h1>
          <p className="mt-2 max-w-xl text-sm text-steam">
            E-mail, senha inicial, Perfil e Vínculo com Lojas. Loja não entra no checklist do Perfil.
          </p>
        </header>

        {actor.isDono || actorCan(actor, "manage_users") ? (
          <form action={criarUsuarioAction} className="listing-pad space-y-3 rounded-lg border border-border bg-sheet">
            <h2 className="font-display text-lg font-bold">Novo usuário</h2>
            <div className="grid gap-3 auto-fill-form">
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
                      className="h-5 w-5 rounded-sm border-border accent-[var(--ketchup)]"
                    />
                    {item.nome}
                  </label>
                ))}
              </div>
            </fieldset>
            <SubmitButton>Criar usuário</SubmitButton>
          </form>
        ) : null}

        <ul className="space-y-3">
          {listing.items.map((user) => (
            <li key={user.id} className="listing-pad rounded-lg border border-border bg-sheet">
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
                            className="h-5 w-5 rounded-sm border-border accent-[var(--ketchup)]"
                          />
                          {item.nome}
                        </label>
                      ))}
                    </div>
                    <SubmitButton variant="outline" size="sm">
                      Atualizar Vínculo
                    </SubmitButton>
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
                      <SubmitButton variant="outline" size="sm">
                        Trocar Perfil
                      </SubmitButton>
                    </form>
                  ) : null}
                  <form action={desligarUsuarioAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <SubmitButton variant="ghost" size="sm">
                      Desligar
                    </SubmitButton>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        <Pager
          pathname="/usuarios"
          page={listing.page}
          totalPages={listing.totalPages}
          params={{ loja: filtro }}
        />
    </PageCanvas>
  );
}
