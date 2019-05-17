'use strict'

const uuid = require('uuid')
const { CommandHandlerNotFoundError } = require('./errors')
const Log = require('./log')

const log = Log.stdout()
const logErr = Log.stderr()

/**
 * The outside world uses the CommandBus to sends instructions into the domain.
 * The instructions are sent as Commands.
 */
class CommandBus {
  constructor(domainRepository) {
    if (!domainRepository) throw new Error('Missing domainRepository')
    this._domainRepository = domainRepository
    this._paused = false
    this._busy = false
    this._queue = []
    this._handlers = {}
  }

  /**
   * Send a command into the Domain.
   *
   * @param command
   * @returns {Promise} resolves when the command has been committed to the domain. Will always resolve even
   * if the command failed.
   */
  async dispatch(command, { resolve, reject } = {}) {
    const commandUid = uuid.v4()
    log(
      'Dispatching [%s] %o (queue: %i)',
      commandUid,
      command,
      this._queue.length
    )
    const handler = this._findCommandHandler(command)
    if (!handler)
      return Promise.reject(
        new CommandHandlerNotFoundError(command.constructor.name)
      )
    command.validate()
    this._queue.push({ handler, command, commandUid, resolve, reject })
    log(
      'Command [%s] added to queue (queue: %i)',
      commandUid,
      this._queue.length
    )
    this._processQueue()
  }

  async dispatchAndWait(command) {
    await new Promise((resolve, reject) =>
      this.dispatch(command, { resolve, reject })
    )
  }

  async pause() {
    this._paused = true
  }

  async resume() {
    this._paused = false
    await this._processQueue()
  }

  async _processQueue() {
    if (this._paused || this._busy || this._queue.length === 0) return
    this._busy = true
    process.nextTick(async () => {
      await this._processNextQueuedCommand()
      this._busy = false
      this._processQueue()
    })
  }

  async _processNextQueuedCommand() {
    const {
      command,
      commandUid,
      handler,
      resolve,
      reject,
    } = this._queue.shift()

    const unitOfWork = this._domainRepository.startUnitOfWork()
    const entityLoader = async (Ctor, entityUid) => {
      const _entity = await this._domainRepository.loadEntityByUid(
        Ctor,
        entityUid
      )
      unitOfWork.add(_entity)
      return _entity
    }
    const entity = new Proxy(entityLoader, {
      get: (target, prop) => async (Ctor, ...args) => {
        const _entity = await Ctor[prop](...args)
        unitOfWork.add(_entity)
        return _entity
      },
    })

    try {
      log(
        'Executing command handler "%s.%s" [%s] (queue: %i)...',
        command.constructor.name,
        handler.name,
        commandUid,
        this._queue.length
      )
      await handler(entity, command)
      await this._domainRepository.commit(unitOfWork)
      log('Command [%s] succeeded (queue: %i)', commandUid, this._queue.length)
      resolve && resolve()
    } catch (err) {
      logErr(
        'Command [%s] failed (queue: %i): %o',
        commandUid,
        this._queue.length,
        err
      )
      reject && reject(err)
    }
  }

  registerCommandHandler(Command, commandHandler) {
    this._handlers[Command.name] = commandHandler
  }

  _findCommandHandler(command) {
    return this._handlers[command.constructor.name]
  }
}

module.exports = CommandBus
