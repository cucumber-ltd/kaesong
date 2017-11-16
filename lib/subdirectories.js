'use strict'

const fs = require('fs')
const path = require('path')

module.exports = directory =>
  fs
    .readdirSync(directory)
    .filter(file => fs.lstatSync(path.join(directory, file)).isDirectory())
