'use strict'

const path = require('path')
const fs = require('fs')

/*
  Automatically adds this stuff to an index.js:

  module.exports.Foo = require('./foo')
  module.exports.Bar = require('./bar')
*/
module.exports.classes = (mod, dir) => {
  fs.readdirSync(dir).forEach(file => {
    if (file === 'index.js') return
    const stat = fs.statSync(path.join(dir, file))
    if (stat.isDirectory()) return

    const ctor = toPascalCase(path.basename(file, '.js'))
    mod.exports[ctor] = require(path.join(dir, file))

    function toPascalCase(string) {
      return string
        .replace(/_/g, ' ')
        .replace(/(?:^|\s)(\w)/g, (matches, letter) => letter.toUpperCase())
    }
  })
}
