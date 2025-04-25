class ApiResponse {
  constructor(statusCode, data, message, errors) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.errors = statusCode < 400;
  }

  //   static success(statusCode, data, message) {
  //     return new ApiResponse(statusCode, data, message, null);
  //   }

  //   static error(statusCode, errors, message) {
  //     return new ApiResponse(statusCode, null, message, errors);
  //   }
}
