'use strict'

const assertError = require('./assert_error')

module.exports = function assertThrows(
  fn,
  expectedErrorMessage = null,
  expectedErrorType = Error
) {
  let result
  try {
    result = fn()
  } catch (err) {
    return assertError(err, expectedErrorMessage, expectedErrorType)
  }
  if (result && typeof result.then === 'function') {
    // return result.then(result => { throw new Error(`Expected an error of type ${expectedErrorType.name}, but no error was thrown`) })
    return result.then(
      result => {
        throw new Error(
          `Expected an error of type ${expectedErrorType.name} but no error was thrown (returned ${JSON.stringify(
            result
          )} instead)`
        )
      },
      e => assertError(e, expectedErrorMessage, expectedErrorType)
    )
  } else {
    return assertError(result, expectedErrorMessage, expectedErrorType)
  }
}
