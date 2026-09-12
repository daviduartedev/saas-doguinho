// Correção de vereditos QA-04 após análise da evidência (overlay em shadow DOM).
import { record } from "./helpers.mjs";

await record("AUTHZ-05", "FAIL",
  "BUG QA-003 (Medium): /fechamento renderiza 'Guardar rascunho' e 'Enviar fechamento' para usuário sem submit_*; servidor rejeita com 'Sem autorização.' ao clicar; auto-save dispara requests rejeitados silenciosamente a cada edição. Evidência: authz-05-restrito-*.png");

await record("AUTHZ-06", "PASS",
  "Corrigido: /produtos,/usuarios,/perfis,/configuracoes → redirect /fechamento; /historico → ForbiddenError no servidor (sem vazar dados) MAS sem error boundary → crash page (dev overlay; prod = 'Application error'). BUG QA-004 (Low): ausência de error boundary torna negação inconsistente. Evidência: authz-06-restrito-historico.png");

console.log("vereditos corrigidos");
