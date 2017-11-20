'use strict'

const url = require('url')
const PgPool = require('pg-pool')
const getEnv = require('./get_env')
const spawnPromise = require('./spawn_promise')

const pgUrl = basename =>
  getEnv('DATABASE_URL', {
    test: `postgres://localhost/${basename}-test`,
    development: `postgres://localhost/${basename}-development`,
  })

let pools = {}

const getPgPool = basename => {
  console.log('URL', pgUrl(basename))
  if (pools[basename]) return pools[basename]
  const params = url.parse(pgUrl(basename))
  const auth = (params.auth || '').split(':')

  const config = {
    user: auth[0],
    password: auth[1],
    host: params.hostname,
    port: params.port,
    database: params.pathname.split('/')[1],
    ssl: false,
  }

  pools[basename] = new PgPool(config)
  return pools[basename]
}

// Migrate the database - read-only means do not dump a schema which
// requires pg_dump. We won't bundle this in the image.

const migrateDb = ({ basename, verbose = false }) => {
  const stdin = 'ignore'
  const stderr = process.stderr
  const stdout = verbose ? process.stdout : 'ignore'

  if (!basename) throw new Error('Missing basename')
  return spawnPromise(
    './bin/dogfish',
    ['--read-only', 'migrate', pgUrl(basename)],
    { stdio: [stdin, stdout, stderr] }
  )
}
module.exports = { getPgPool, migrateDb }
