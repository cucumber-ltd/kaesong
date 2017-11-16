'use strict'

const path = require('path')
const globWithCallback = require('glob')

const glob = async (dir, pattern) => {
  return new Promise((resolve, reject) => {
    globWithCallback(path.join(dir, pattern), (err, repoPaths) => {
      if (err) return reject(err)
      resolve(repoPaths)
    })
  })
}

module.exports = glob
