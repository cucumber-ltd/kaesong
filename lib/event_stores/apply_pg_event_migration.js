'use strict'

const { Success } = require('monet')
const { getPgPool } = require('../pg')
const PgEventStore = require('./pg_event_store')
const written = require('../written')
const connectStreamWithPipes = require('../connect_streams_with_pipes')
const validateEventStream = require('../validate_event_stream')
const Log = require('../log')

const log = Log.stdout()

module.exports = async function applyPgEventMigration({
  transformers,
  validator,
  deserialize,
  pgUrl,
  tableName = 'events',
  migrationId,
  onMigrationApplied,
  onMigrationSkipped,
  logError,
}) {
  if(!logError) throw new Error('Missing logError function')
  const pgPool = getPgPool(pgUrl)
  const backupTableName = `backup_${tableName}_before_${migrationId}`
  const backupEventStore = new PgEventStore({
    pgPool,
    deserialize,
    tableName: backupTableName,
    logError,
  })
  await backupEventStore.start()

  if (transformers.length === 0) {
    log(`Skipping deprecated event migration #${migrationId}`)
    onMigrationSkipped(migrationId)
    return Success()
  }

  if (await backupEventStore.tableExists()) {
    log(`Skipping already applied event migration #${migrationId}`)
    onMigrationSkipped(migrationId)
    return Success()
  }

  log(`Applying event migration #${migrationId}`)
  const oldEventStore = new PgEventStore({
    pgPool,
    deserialize,
    tableName,
    logError
  })
  await oldEventStore.start()

  const temporaryTableName = `temp_${migrationId}_${Date.now()}`
  const tempEventStore = await oldEventStore.createEmptyCopy(temporaryTableName)
  await tempEventStore.start()

  await written(
    connectStreamWithPipes({
      source: oldEventStore.streamAllEvents(),
      destination: tempEventStore.openWriteEventsStream(),
      connections: transformers,
    }),
    'close'
  )

  const success = await validateEventStream(
    tempEventStore.streamAllEvents(),
    validator
  )

  const renameTables = async () => {
    await oldEventStore.renameTable(backupTableName)
    await tempEventStore.renameTable(tableName)
  }
  const logMigrationError = async err => {
    // eslint-disable-next-line no-console
    console.error(
      `There was an error processing migration, ${err.stack}\n\nPlease see table: ${temporaryTableName}.`
    )
  }
  await success.cata(logMigrationError, renameTables)
  success.map(() => onMigrationApplied(migrationId))
  return success
}
