/* eslint-disable no-console */
'use strict'

const debug = require('debug')
const caller = require('caller')


/**
 * Thin wrapper around the debug module that automatically sets the logger label.
 * Also provides convenience methods for creating stdout and stderr loggers.
 */
const defaultLogTag = 'plutonium'
let makeLogger = (logTag = defaultLogTag) => ({
  stdout: function stdout() {
    const log = debug(this.label(caller()))
    log.log = console.log.bind(console)
    return log
  },

  stderr: function stderr() {
    return debug(this.label(caller()))
  },

  label: function label(caller) {
    let path
    if (caller.indexOf(process.cwd() + '/') === 0) {
      path = caller.substr((process.cwd() + '/').length)
    } else {
      path = caller
    }
    return `${logTag || defaultLogTag}:${path}`
  },
})

let defaultLogger = makeLogger()
makeLogger.stdout = defaultLogger.stdout
makeLogger.stderr = defaultLogger.stdout
makeLogger.label = defaultLogger.label

module.exports = makeLogger
