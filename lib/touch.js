'use strict'

const fs = require('fs')
const promisify = require('es6-promisify')

const open = promisify(fs.open)
const close = promisify(fs.close)

const touch = async filePath => {
  const fd = await open(filePath, 'a')
  await close(fd)
}

module.exports = touch
