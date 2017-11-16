'use strict'

const enableDestroy = require('server-destroy')

class Server {
  constructor({ webApp }) {
    this._webApp = webApp
  }

  start(port) {
    return new Promise((resolve, reject) => {
      this._server = this._webApp.listen(port, err => {
        if (err) return reject(err)
        resolve()
      })
      enableDestroy(this._server)
    })
  }

  stop() {
    if (!this._server) return Promise.resolve()
    return new Promise((resolve, reject) => {
      this._server.destroy(err => {
        if (err) return reject(err)
        resolve()
      })
    })
  }
}

module.exports = Server
