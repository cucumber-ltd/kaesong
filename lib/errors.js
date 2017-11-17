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

class CommandHandlerNotFoundError extends ExtendableError {
  constructor(commandName) {
    super(`Command handler for command "${commandName}" not found`)
  }
}

module.exports = {
  BaseError,
  NoSuchEntityError,
  CommandHandlerNotFoundError,
}
