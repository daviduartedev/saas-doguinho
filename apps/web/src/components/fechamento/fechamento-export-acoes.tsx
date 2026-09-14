import { Button } from "@mantine/core";

export function FechamentoExportAcoes({ loja }: { loja: string }) {
  const recorte = encodeURIComponent(loja);
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        component="a"
        href={`/fechamento/export?formato=xlsx&loja=${recorte}`}
        size="sm"
        color="ketchup"
      >
        Baixar Excel
      </Button>
      <Button
        component="a"
        href={`/fechamento/export?formato=pdf&loja=${recorte}`}
        size="sm"
        color="ketchup"
      >
        Baixar PDF
      </Button>
    </div>
  );
}
