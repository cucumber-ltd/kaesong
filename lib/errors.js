'use strict'

const ExtendableError = require('es6-error')

// FYI: we use ExtendableError so that `instanceof` matches our custom Error
//      classes properly as babel will always create plain `Error` instances that
//      do not inherit from our own.

class BaseError extends ExtendableError {
  static fromJSON(obj) {
    return new this(obj.message)
  }

  toJSON() {
    return {
      __type__: this.constructor.name,
      message: this.message,
    }
  }
}

class NoSuchEntityError extends BaseError {
  static make(entityUid) {
    return new this(`No events found for entityUid "${entityUid}"`)
  }
}

// HTTP generics (mapping status codes)
class BadRequestError extends BaseError {} // 400
class UnauthorizedError extends BaseError {} // 401
class ForbiddenError extends BaseError {} // 403
class NotFoundError extends BaseError {} // 404
class ConflictError extends BaseError {} // 409

// HTTP specifics
class ValidationError extends BadRequestError {
  static make(valueObjectValidationError) {
    return new this(
      valueObjectValidationError.failures.failures
        .map(f => f.message)
        .join(', ')
    )
  }
}

class CommandHandlerNotFoundError extends ExtendableError {
  constructor(commandName) {
    super(`Command handler for command "${commandName}" not found`)
  }
}

module.exports = {
  BaseError,
  NoSuchEntityError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  CommandHandlerNotFoundError,
}
