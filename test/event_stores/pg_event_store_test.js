'use strict'

const Stream = require('stream')
const assert = require('assert')
const uid = require('uuid')
const verifyContract = require('./verify_event_store_contract')
const PgEventStore = require('../../lib/event_stores/pg_event_store')
const { getPgPool, migrateDb } = require('../../lib/pg')

const PG_URL = process.env.DATABASE_URL || 'postgres://localhost/plutonium-test'
const logError = console.error.bind(console)

describe('PgEventStore', () => {

  let pgPool

  const makeEventStore = (deserialize, tableName = 'events') => {
    return new PgEventStore({ pgPool, deserialize, tableName, logError })
  }

  before(async function() {
    pgPool = await getPgPool(PG_URL)
    await migrateDb({ pgUrl: PG_URL })
  })

  after(async function () {
    await pgPool.end()
  })

  verifyContract(makeEventStore)

  let eventStore

  it('bubbles up deserialize errors', async () => {
    const deserializeError = new Error('No can do')
    const deserialize = () => {
      throw deserializeError
    }
    eventStore = makeEventStore(deserialize)
    await eventStore.start()
    await eventStore.dropAllEvents()

    await eventStore.query(
      'INSERT INTO events (entity_uid, entity_version, type, data) VALUES ($1, $2, $3, $4)',
      [uid.v4(), 1, 'TestEvent', '{"__type__": "UnknownType"}']
    )

    return new Promise((resolve, reject) => {
      eventStore
        .streamAllEvents()
        .on('error', err => {
          assert.equal(err.message.indexOf(deserializeError.message), 0)
          resolve()
        })
        .on('end', () => reject(new Error('Why no failure?')))
        .pipe(new Stream.PassThrough())
    })
  })

  describe('#tableExists', () => {
    it('is true when the table exists', async () => {
      eventStore = makeEventStore(() => {}, 'events')
      await eventStore.start()
      assert(await eventStore.tableExists())
    })

    it('is false when the table does not exist', async () => {
      eventStore = makeEventStore(() => {}, 'does-not-exist')
      await eventStore.start()
      assert(!await eventStore.tableExists())
    })
  })

  describe('#createEmptyCopy', () => {
    it('creates an empty table with the same structure', async () => {
      await pgPool.query('DROP TABLE IF EXISTS new_events')
      const eventStore = makeEventStore(() => {}, 'events')
      await eventStore.start()
      const newEventStore = await eventStore.createEmptyCopy('new_events')
      await newEventStore.start()
      assert(await newEventStore.tableExists())
    })
  })

  describe('#renameTable', () => {
    it("renames the store's events table and return a new store for the renamed table", async () => {
      await pgPool.query('DROP TABLE IF EXISTS new_events')
      await pgPool.query('DROP TABLE IF EXISTS renamed_events')
      const eventStore = makeEventStore(() => {}, 'events')
      await eventStore.start()
      const newEventStore = await eventStore.createEmptyCopy('new_events')
      await newEventStore.start()
      await newEventStore.query(
        'INSERT INTO new_events (entity_uid, entity_version, type, data) VALUES ($1, $2, $3, $4)',
        [uid.v4(), 1, 'NewEvent', '{"__type__": "SomeEvent"}']
      )
      const renamedEventStore = await newEventStore.renameTable(
        'renamed_events'
      )
      await renamedEventStore.start()
      assert(
        await renamedEventStore.tableExists(),
        'Expected renamed_events table to exist'
      )
      assert(
        !await newEventStore.tableExists(),
        'Did not expect new_events table to exist'
      )
      assert.equal(
        (await renamedEventStore.query('SELECT * FROM renamed_events'))
          .rowCount,
        1
      )
    })
  })
})
