'use strict'

const assert = require('assert')

module.exports = function assertError(
  error,
  expectedErrorMessage,
  expectedErrorType
) {
  assert.equal(
    arguments.length,
    3,
    'assertError expects 3 arguments (error, expectedErrorMessage, expectedErrorType)'
  )
  assert.ok(error, `Expected ${expectedErrorType.name} but got no error`)
  assert(
    error instanceof Error,
    `Expected an error of type ${expectedErrorType.name}, but got ${JSON.stringify(
      error,
      null,
      2
    )} of type ${typeof error}`
  )
  assert(
    error instanceof expectedErrorType,
    `Expected error type ${expectedErrorType.name} but got ${error.constructor
      .name} with message: ${error.message}`
  )
  if (
    expectedErrorMessage instanceof RegExp &&
    (!error.message || !error.message.match(expectedErrorMessage))
  )
    throw new Error(
      `Expected "${error.message}" to match "${expectedErrorMessage}"`
    )
  else if (typeof expectedErrorMessage === 'string')
    assert.equal(error.message, expectedErrorMessage)
}
