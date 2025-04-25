class ApiErrors extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stacks = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.success = false;
    this.data = null;

    if (stacks) {
      this.stacks = stacks;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
