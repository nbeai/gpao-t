export class RuntimeError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.name = "RuntimeError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function asPublicError(error) {
  if (error instanceof RuntimeError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status
    };
  }
  return { code: "internal_error", message: "Native Runtime internal error", status: 500 };
}
