'use strict'

const url = require('url')
const PgPool = require('pg-pool')
const spawnPromise = require('./spawn_promise')

const getPgPool = pgUrl => {
  const params = url.parse(pgUrl)
  const auth = (params.auth || '').split(':')

  const config = {
    user: auth[0],
    password: auth[1],
    host: params.hostname,
    port: params.port,
    database: params.pathname.split('/')[1],
    ssl: false,
  }

  return new PgPool(config)
}

// Migrate the database - read-only means do not dump a schema which
// requires pg_dump. We won't bundle this in the image.

const migrateDb = ({ pgUrl, verbose = false }) => {
  if (!pgUrl) throw new Error('Missing pgUrl')

  const stdin = 'ignore'
  const stderr = process.stderr
  const stdout = verbose ? process.stdout : 'ignore'

  return spawnPromise(
    './bin/dogfish',
    ['--read-only', 'migrate', pgUrl],
    { stdio: [stdin, stdout, stderr] }
  )
}
module.exports = { getPgPool, migrateDb }
