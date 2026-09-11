# Authentication and session audit

ASVS: V6.1–V6.3, V7.1–V7.4. V6.4 e V7.3 (recovery, timeout) adiados no negócio (Q24).

## Mecanismo (V6.1)

E-mail + senha. Contas criadas só pelo Dono. Sem IdP, sem MFA, sem signup.

## Senha (V6.2)

Armazenar com hash próprio para senha (ex. Argon2id / bcrypt via lib mantida). Comparar em tempo constante. Política mínima de tamanho na implementação (não grillada). Não logar senha nem senha inicial em texto.

Senha inicial definida pelo Dono: risco de compartilhamento (WhatsApp). Residual aceito no MVP; refine pode forçar troca no primeiro login (não é requisito confirmado).

## Login (V6.3)

- Mensagem única de falha (não distinguir e-mail inexistente).
- Rate limit no endpoint de login (V2.4), mesmo sistema interno.
- Sem enumeração via “esqueci senha” enquanto recovery estiver fora.

## Sessão (V7.1, V7.2)

Preferir sessão no servidor (cookie opaco) em vez de JWT com estoque no payload. Cookie: `HttpOnly`, `Secure`, `SameSite`. Identificador com RNG criptográfico (V11.5).

**UNKNOWN de produto:** TTL idle/absolute (Q24). **Default de implementação:** sessão absoluta de **12 horas** (`SESSION_TTL_MS` em `apps/web/src/doguinho/app.ts`). Sem idle timeout separado no MVP. Cookie opaco, `HttpOnly`, `Secure` em produção, `SameSite=Lax`.

## Término (V7.4)

Logout invalida servidor. Disable do usuário invalida no próximo request (CONFIRMADO). Troca de senha, quando existir, deve invalidar sessões (ASVS; feature ainda não grillada).

## Verificação

- Anônimo não cria usuário.
- Hash não é SHA-256 “simples”.
- Após disable, request com cookie antigo falha.
- Login com senha errada não revela se o e-mail existe.

## Residual

Um Dono semente sem recovery (Q24) é risco operacional de lockout, não de IDOR. Tratar no refine.
