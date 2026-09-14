export function VinculoCheckboxes({
  lojas,
  defaultCheckedIds,
}: {
  lojas: Array<{ id: string; nome: string }>;
  defaultCheckedIds?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {lojas.map((item) => (
        <label key={item.id} className="flex items-center gap-2 text-[15px] text-ink">
          <input
            type="checkbox"
            name="lojaIds"
            value={item.id}
            defaultChecked={defaultCheckedIds?.includes(item.id)}
            className="h-5 w-5 rounded-sm border-border accent-[var(--ketchup)]"
          />
          {item.nome}
        </label>
      ))}
    </div>
  );
}
