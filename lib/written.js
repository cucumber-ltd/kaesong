'use strict'

/**
 * Wrap a writable stream in a promise that resolves when
 * the stream has been written
 *
 * @param writableStream
 * @returns {Promise}
 */
module.exports = function written(writableStream, resolveEvent = 'finish') {
  return new Promise((resolve, reject) => {
    writableStream.on('error', reject).on(resolveEvent, resolve)
  })
}
