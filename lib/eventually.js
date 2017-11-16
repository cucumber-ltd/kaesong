'use strict'

/**
 * Runs a function (that returns a promise) over and over until either:
 * - it returns a promise that resolves
 * - it times out
 *
 * If there are particular errors you'd expect to get while waiting, you can use the pattern
 * to ignore them.
 */
module.exports = function eventually(
  fn,
  pattern = null,
  remainingAttempts = 200,
  interval = 10
) {
  const isErrorTolerated = err => {
    return !pattern || err.message.match(pattern)
  }

  return new Promise((resolve, reject) => {
    const fnPromise = new Promise(resolve => resolve(fn()))
    fnPromise.then(resolve, err => {
      if (--remainingAttempts <= 0 || !isErrorTolerated(err)) return reject(err)
      setTimeout(() => {
        eventually(fn, pattern, remainingAttempts, interval).then(
          resolve,
          reject
        )
      }, interval)
    })
  })
}
