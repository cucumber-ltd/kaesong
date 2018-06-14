'use strict'

const microtime = require('microtime')
const log = require('./log').stdout()
const ReplayFinished = require('./replay_finished')

/**
 * Turns events into method calls and invokes them
 * sequentially on a list of targets
 */
class SerialInvoker {
  constructor(targets, opts = {}) {
    this._targets = targets
    this._consoleError = opts.consoleError || console.error.bind(console) //eslint-disable-line no-console
    this._shouldRaiseErrors = opts.shouldRaiseErrors
    this._durations = new Map(targets.map(target => [target, 0]))
  }

  async on(event) {
    if (event instanceof ReplayFinished) this._reportReplayDurations()

    for (const target of this._targets) {
      try {
        const startTime = microtime.now()
        await invokeMaybe(event, target)
        const duration = microtime.now() - startTime
        this._recordDuration({ target, duration })
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

  _recordDuration({ target, duration }) {
    let total = this._durations.get(target) + duration
    this._durations.set(target, total)
  }

  _reportReplayDurations() {
    const stats = Array.from(this._durations.entries()).sort(
      ([, a], [, b]) => b - a
    )
    stats.map(([target, duration]) =>
      log(
        `${target.constructor.name} replay duration: ${Math.round(
          duration / 1000
        )}ms`
      )
    )
  }
}

const invokeMaybe = async (event, target) => {
  const fname = `on${event.constructor.name}`
  const fn = target[fname]
  if (!fn) return
  return fn.call(target, event)
}

module.exports = SerialInvoker
