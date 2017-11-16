'use strict'

const { spawn } = require('child_process')

module.exports = function() {
  const args = Array.prototype.slice.call(arguments)

  return new Promise((resolve, reject) => {
    const child = spawn.apply(null, args)

    let settled = false

    child.on('exit', (code, signal) => {
      if (!settled) {
        settled = true
        if (code === 0) {
          resolve()
        } else if (code) {
          reject(new Error(`'${args[0]}' exited with code ${code}`))
        } else {
          reject(new Error(`'${args[0]}' exited with signal ${signal}`))
        }
      }
    })

    child.on('error', err => {
      if (!settled) {
        settled = true
        reject(err)
      }
    })
  })
}
