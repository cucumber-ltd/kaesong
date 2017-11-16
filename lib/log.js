/* eslint-disable no-console */
'use strict'

const debug = require('debug')
const caller = require('caller')

/**
 * Thin wrapper around the debug module that automatically sets the logger name.
 * Also provides convenience methods for creating stdout and stderr loggers.
 */
module.exports = {
  stdout: function stdout() {
    const log = debug(this.name(caller()))
    log.log = console.log.bind(console)
    return log
  },

  stderr: function stderr() {
    return debug(this.name(caller()))
  },

  name: function name(caller) {
    let path
    if (caller.indexOf(process.cwd() + '/') === 0) {
      path = caller.substr((process.cwd() + '/').length)
    } else {
      path = caller
    }
    // TODO: make this prefix configurable
    return `kaesong:${path}`
  },
}
