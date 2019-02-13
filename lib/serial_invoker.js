'use strict'

const microtime = require('microtime')
const log = require('./log').stdout()
const ReplayFinished = require('./replay_finished')

const roundMs = duration => Math.round(duration / 1000)

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
    const durationEntries = Array.from(this._durations.entries())
    const totalDuration = durationEntries.reduce(
      (total, [, time]) => total + time,
      0
    )
    log(`Total replay duration: ${roundMs(totalDuration)}ms`)
    const stats = durationEntries.sort(([, a], [, b]) => b - a)
    stats.map(([target, duration]) =>
      log(
        `˫ ${target.constructor.name} replay duration: ${roundMs(duration)}ms`
      )
    )
  }
}

const invokeMaybe = async (event, target) => {
  if (target.on) await target.on(event)
  const fname = `on${event.constructor.name}`
  if (target[fname]) return target[fname](event)
}

module.exports = SerialInvoker
