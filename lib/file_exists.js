'use strict'

const fs = require('fs')
const { promisify } = require('util')

const lstat = promisify(fs.lstat)

module.exports = async path => {
  try {
    await lstat(path)
    return true
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
    return false
  }
}
