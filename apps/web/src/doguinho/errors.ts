export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

const APP_ERROR_CODES = new Set(["auth_failed", "forbidden", "validation", "conflict", "unauthenticated"]);

/**
 * QA-004: `instanceof AppError` falha quando o erro atravessa as camadas do dev
 * server (SSR × server action têm instâncias próprias deste módulo). Checagem
 * estrutural por `code` de domínio — códigos de banco (ex.: SQLSTATE) nunca casam.
 */
export function isAppError(error: unknown): error is AppError {
  return (
    error instanceof AppError ||
    (typeof error === "object" &&
      error !== null &&
      APP_ERROR_CODES.has(String((error as { code?: unknown }).code)) &&
      typeof (error as { message?: unknown }).message === "string")
  );
}

/** ASVS V6.3: same message whether the e-mail exists or the password is wrong. */
export class AuthFailedError extends AppError {
  constructor() {
    super("E-mail ou senha inválidos.", "auth_failed");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Sem autorização.") {
    super(message, "forbidden");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "validation");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "conflict");
  }
}

export class UnauthenticatedError extends AppError {
  constructor() {
    super("Sessão inválida.", "unauthenticated");
  }
}
