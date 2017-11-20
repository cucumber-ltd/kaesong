'use strict'

const Stream = require('stream')
const QueryStream = require('pg-query-stream')
const Log = require('../log')

const log = Log.stdout()
const logError = Log.stderr()

class PgQueryStream extends Stream.PassThrough {
  constructor(pgPool, queryStream) {
    super({ objectMode: true, highWaterMark: 0 })
    pgPool.connect((err, client, done) => {
      if (err) {
        this.emit('error', err)
        return done(err)
      }
      client
        .query(queryStream)
        .on('end', done)
        .on('error', done)
        .pipe(this)
    })
  }
}

class PgResultToEventStream extends Stream.Transform {
  constructor(deserialize) {
    super({ objectMode: true, highWaterMark: 0 })
    this._deserialize = deserialize
  }

  _transform(row, _, callback) {
    try {
      const e = Object.assign({}, row.data, {
        entityUid: row.entity_uid,
        entityVersion: row.entity_version,
        timestamp: row.timestamp,
        isBeingReplayed: false,
        __type__: row.type
      })
      const event = this._deserialize(JSON.stringify(e))
      // const EventConstructor = Events[row.type]
      // const event = new EventConstructor(args)
      this.push(event)
      callback()
    } catch (err) {
      err.message += ` - The ${row.type} event with sequence number ${row.sequence_number} for entityUid ${row.entity_uid} payload is ${JSON.stringify(
        row.data
      )}.`
      callback(err)
    }
  }
}

class PgWriteEventsStream extends Stream.Writable {
  constructor(pool, tableName, logError) {
    super({ objectMode: true })
    this._pgPool = pool
    this._tableName = tableName
    const commit = () => {
      this._commit()
    }
    this.on('finish', commit)
    this.once('error', err => {
      logError(err)
      this.removeListener('finish', commit)
      this._query('ROLLBACK')
        .then(() => {
          this._client.release()
          this._client = null
        })
        .catch(err => {
          this._client.release()
          this._client = null
          logError('ROLLBACK failed (%o)', err)
        })
    })
  }

  _write(event, _, callback) {
    log('write(%o)', event)
    this._writeEvent(event)
      .then(() => callback())
      .catch(err => callback(err))
  }

  async _writeEvent(event) {
    if (!this._client) {
      this._client = await this._pgPool.connect()
      await this._query('BEGIN')
    }

    await this._query({
      text: `INSERT INTO ${this
        ._tableName} (entity_uid, entity_version, timestamp, type, data) VALUES ($1, $2, $3, $4, $5)`,
      values: [
        event.entityUid,
        event.entityVersion,
        event.timestamp.toISOString(),
        event.constructor.name,
        JSON.stringify(event.data)
      ]
    })
  }

  async _query(query) {
    log('query(%o)', query)
    try {
      const result = await this._client.query(query)
      log('query succeeded')
      return result
    } catch (err) {
      logError('query failed: %o', err)
      throw err
    }
  }

  async _commit() {
    log('commit()')
    if (!this._client) {
      log('empty transaction, no need to commit')
      return this.emit('close')
    }
    try {
      await this._query('COMMIT')
    } finally {
      this._client.release()
      this._client = null
      log('released client')
      this.emit('close')
    }
  }
}

class PgEventStore {
  constructor({ pgPool, deserialize, tableName, logError }) {
    if (!pgPool) throw new Error('Missing pgPool')
    if (!logError) throw new Error('Missing logError function')

    this._pgPool = pgPool
    this._deserialize = deserialize
    this._tableName = tableName
    this._logError = logError
  }

  async start() {
    log('start()')
  }

  async stop() {
    log('stop()')
  }

  async dropAllEvents() {
    log('dropAllEvents()')
    await this._pgPool.query(`TRUNCATE ${this._tableName} RESTART IDENTITY`)
  }

  openWriteEventsStream() {
    log('openWriteEventsStream()')
    return new PgWriteEventsStream(this._pgPool, this._tableName, this._logError)
  }

  findEventsByEntityUid(entityUid) {
    log('findEventsByEntityUid("%s")', entityUid)
    const queryStream = new QueryStream(
      `SELECT * FROM ${this
        ._tableName} WHERE entity_uid=$1 ORDER BY sequence_number`,
      [entityUid],
      { highWaterMark: 0 }
    )
    return new PgQueryStream(this._pgPool, queryStream).pipe(
      new PgResultToEventStream(this._deserialize)
    )
  }

  streamAllEvents() {
    log('streamAllEvents()')
    const queryStream = new QueryStream(
      `SELECT * FROM ${this._tableName} ORDER BY sequence_number`,
      [],
      { highWaterMark: 0 }
    )
    return new PgQueryStream(this._pgPool, queryStream).pipe(
      new PgResultToEventStream(this._deserialize)
    )
  }

  async countAllEvents() {
    log('countAllEvents()')
    const result = await this._pgPool.query(
      `SELECT COUNT(sequence_number) FROM ${this._tableName}`
    )
    return parseInt(result.rows[0].count)
  }

  // Not part of contract - only used in tests
  async query() {
    return this._pgPool.query.apply(this._pgPool, arguments)
  }

  async tableExists() {
    const result = await this.query(
      'SELECT 1 FROM information_schema.tables WHERE table_name=$1',
      [this._tableName]
    )
    return result.rowCount === 1
  }

  async createEmptyCopy(tableName) {
    await this.query(
      `CREATE TABLE ${tableName} (LIKE ${this._tableName} INCLUDING ALL)`
    )
    await this.query(
      `CREATE SEQUENCE ${tableName}_sequence_number_seq OWNED BY ${tableName}.sequence_number`
    )
    await this.query(
      `ALTER TABLE ${tableName} ALTER sequence_number SET DEFAULT nextval('${tableName}_sequence_number_seq'::regclass)`
    )
    await this.query(
      `ALTER INDEX ${tableName}_entity_uid_entity_version_key RENAME TO ${tableName}_entity_uid_entity_version_unique`
    )

    return new this.constructor({
      pgPool: this._pgPool,
      deserialize: this._deserialize,
      tableName,
      logError: this._logError
    })
  }

  async renameTable(tableName) {
    await this.query(`ALTER TABLE ${this._tableName} RENAME TO ${tableName}`)
    await this.query(
      `ALTER SEQUENCE ${this
        ._tableName}_sequence_number_seq RENAME TO ${tableName}_sequence_number_seq`
    )
    await this.query(
      `ALTER INDEX ${this._tableName}_pkey RENAME TO ${tableName}_pkey`
    )
    await this.query(
      `ALTER INDEX ${this
        ._tableName}_entity_uid_entity_version_unique RENAME TO ${tableName}_entity_uid_entity_version_unique`
    )

    return new this.constructor({
      pgPool: this._pgPool,
      deserialize: this._deserialize,
      tableName,
      logError: this._logError
    })
  }
}

module.exports = PgEventStore
