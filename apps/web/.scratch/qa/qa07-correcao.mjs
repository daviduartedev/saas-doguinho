// Correção de vereditos QA-07: innerText não lê input values; verificação refeita via evaluateAll.
import { record } from "./helpers.mjs";

await record("PROD-01", "PASS", "Corrigido: Ração Premium criado e listado em /produtos pág.2 (verificação via input[value]); presente no Fechamento (PROD-01b).");
await record("PROD-04", "PASS", "Corrigido: Tomate → Tomate Italiano persistido e visível em /produtos e no Fechamento (PROD-04b).");
await record("PROD-10", "PASS", "Corrigido: nome com 300 chars + emoji ACEITO (sem limite de tamanho no servidor — observação registrada). Visível em /produtos pág.2.");
await record("PROD-OBS", "SUSPICIOUS", "Observações: (1) /estoque esconde Produto desativado mesmo com quantidade oficial > 0 — decisão de domínio a confirmar; (2) pager clampa página fora de range para a última (comportamento ok); (3) erro de duplicado chega via crash page — reforça QA-004.");

console.log("vereditos QA-07 corrigidos");
