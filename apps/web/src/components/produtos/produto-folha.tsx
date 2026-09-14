"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Ban, Pencil, Trash2, X } from "lucide-react";
import {
  criarProdutoAction,
  desativarProdutoAction,
  editarProdutoAction,
  excluirProdutoAction,
} from "@/doguinho/admin-actions";
import { isAppError } from "@/doguinho/errors";
import type { UnidadeMedida } from "@/doguinho/types";
import { UNIDADES } from "@/doguinho/types";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import {
  folhaAbrirCriar,
  folhaAbrirEditar,
  folhaAposCadastro,
  folhaContinuar,
  folhaFechar,
  folhaIndicador,
  folhaPodeContinuar,
  folhaRotuloEnviar,
  folhaVoltar,
  type FolhaEstado,
} from "./produto-folha-state";

export type ProdutoFolhaItem = {
  id: string;
  nome: string;
  unidade: UnidadeMedida;
  ativo: boolean;
};

function mensagemErro(error: unknown): string {
  if (isAppError(error)) return error.message;
  return "Não foi possível salvar.";
}

export function ProdutoFolha({ produtos }: { produtos: ProdutoFolhaItem[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nomeRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<FolhaEstado>(folhaFechar);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (estado.aberto && !dialog.open) dialog.showModal();
    if (!estado.aberto && dialog.open) dialog.close();
  }, [estado.aberto]);

  useEffect(() => {
    if (estado.aberto && estado.passo === 1) {
      nomeRef.current?.focus();
    }
  }, [estado.aberto, estado.passo]);

  function abrirCriar() {
    setErro(null);
    setEstado(folhaAbrirCriar());
  }

  function abrirEditar(produto: ProdutoFolhaItem) {
    setErro(null);
    setEstado(folhaAbrirEditar(produto));
  }

  function fechar() {
    setErro(null);
    setEstado(folhaFechar());
    dialogRef.current?.close();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (estado.passo === 1) {
      event.preventDefault();
      setEstado((atual) => folhaContinuar(atual));
    }
  }

  async function enviarCadastro(formData: FormData) {
    setErro(null);
    try {
      await criarProdutoAction(formData);
      setEstado((atual) => folhaAposCadastro(atual));
    } catch (error) {
      setErro(mensagemErro(error));
    }
  }

  async function enviarEdicao(formData: FormData) {
    setErro(null);
    try {
      await editarProdutoAction(formData);
      fechar();
    } catch (error) {
      setErro(mensagemErro(error));
    }
  }

  const titulo = estado.modo === "editar" ? "Editar produto" : "Novo produto";
  const enviar = folhaRotuloEnviar(estado.modo);

  return (
    <div className="produtos-mobile-only">
      <Button className="w-full" onClick={abrirCriar}>
        Cadastrar produto
      </Button>

      {produtos.length > 0 ? (
        <div className="listing-frame">
          {produtos.map((produto) => (
            <article key={produto.id} className="produto-card">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{produto.nome}</p>
                <p className="mt-1 text-sm text-steam">{produto.unidade}</p>
                <p className="mt-1 text-sm text-steam">{produto.ativo ? "Ativo" : "Desativado"}</p>
              </div>
              <form className="flex shrink-0 items-center gap-2">
                <input type="hidden" name="id" value={produto.id} />
                <Button
                  type="button"
                  variant="primary"
                  size="icon"
                  aria-label="Editar"
                  onClick={() => abrirEditar(produto)}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
                {produto.ativo ? (
                  <SubmitButton
                    formAction={desativarProdutoAction}
                    variant="counter"
                    size="icon"
                    aria-label="Desativar"
                  >
                    <Ban className="h-4 w-4" aria-hidden />
                  </SubmitButton>
                ) : null}
                <ConfirmSubmitButton
                  formAction={excluirProdutoAction}
                  variant="danger"
                  size="icon"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </ConfirmSubmitButton>
              </form>
            </article>
          ))}
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        className="produto-folha"
        aria-labelledby="folha-titulo"
        aria-modal="true"
        onClose={() => {
          setErro(null);
          setEstado(folhaFechar());
        }}
      >
        <div className="produto-folha-inner">
          <header className="flex items-center gap-3">
            {estado.passo === 2 ? (
              <Button
                type="button"
                variant="counter"
                onClick={() => setEstado((atual) => folhaVoltar(atual))}
              >
                Voltar
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={fechar}>
                <X className="h-5 w-5" aria-hidden />
              </Button>
            )}
            <p className="ml-auto tabular text-sm font-medium text-steam">{folhaIndicador(estado.passo)}</p>
          </header>

          <div className="mt-6 flex min-h-0 flex-1 flex-col">
            <h2 id="folha-titulo" className="font-display text-2xl font-bold text-balance text-ink">
              {titulo}
            </h2>

            {estado.banner ? (
              <div className="mt-4 rounded-md border border-border bg-paper px-3 py-2">
                <p role="status">{estado.banner}</p>
                <Button type="button" variant="counter" className="mt-3" onClick={fechar}>
                  Ver lista
                </Button>
              </div>
            ) : null}

            {erro ? (
              <p role="alert" className="mt-4 rounded-md border border-border bg-paper px-3 py-2 text-sm text-ketchup">
                {erro}
              </p>
            ) : null}

            <form
              className="mt-6 flex min-h-0 flex-1 flex-col"
              action={estado.modo === "editar" ? enviarEdicao : enviarCadastro}
              onSubmit={onSubmit}
            >
              {estado.produtoId ? <input type="hidden" name="id" value={estado.produtoId} /> : null}
              <input type="hidden" name="unidade" value={estado.unidade} />

              {estado.passo === 1 ? (
                <div>
                  <Label htmlFor="folha-nome" className="text-steam">
                    Nome
                  </Label>
                  <Input
                    ref={nomeRef}
                    id="folha-nome"
                    name="nome"
                    value={estado.nome}
                    onChange={(event) =>
                      setEstado((atual) => ({ ...atual, nome: event.target.value }))
                    }
                    required
                    autoComplete="off"
                    className="produto-folha-nome mt-2"
                  />
                </div>
              ) : (
                <>
                  <input type="hidden" name="nome" value={estado.nome} />
                  <p className="mb-6 font-semibold text-ink">{estado.nome}</p>
                  <div>
                    <p id="folha-unidade-label" className="text-[15px] font-medium text-steam">
                      Unidade
                    </p>
                    <div
                      className="produto-folha-chips mt-3"
                      role="group"
                      aria-labelledby="folha-unidade-label"
                    >
                      {UNIDADES.map((unidade) => {
                        const selected = estado.unidade === unidade;
                        return (
                          <button
                            key={unidade}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setEstado((atual) => ({ ...atual, unidade }))}
                            className={cn(
                              "produto-chip",
                              selected ? "produto-chip-on" : "produto-chip-off",
                            )}
                          >
                            {unidade}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div className="mt-auto pt-8">
                {estado.passo === 1 ? (
                  <Button
                    type="button"
                    className="w-full"
                    disabled={!folhaPodeContinuar(estado.nome)}
                    onClick={() => setEstado((atual) => folhaContinuar(atual))}
                  >
                    Continuar
                  </Button>
                ) : (
                  <SubmitButton className="w-full">{enviar}</SubmitButton>
                )}
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
}
