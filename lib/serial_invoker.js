'use strict'

/**
 * Turns events into method calls and invokes them
 * sequentially on a list of targets
 */
class SerialInvoker {
  constructor(targets, opts = {}) {
    this._targets = targets
    this._consoleError = opts.consoleError || console.error //eslint-disable-line no-console
    this._shouldRaiseErrors = opts.shouldRaiseErrors
  }

  async on(event) {
    for (const target of this._targets) {
      try {
        await invokeMaybe(event, target)
      } catch (err) {
        if (this._shouldRaiseErrors) throw err
        this._consoleError(
          'Error handling event',
          target.constructor.name,
          event,
          err.stack
        )
      }
    }
  }
}

const invokeMaybe = async (event, target) => {
  const fname = `on${event.constructor.name}`
  const fn = target[fname]
  if (!fn) return
  return fn.call(target, event)
}

module.exports = SerialInvoker
