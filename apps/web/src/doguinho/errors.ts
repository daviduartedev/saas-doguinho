export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
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
