'use strict'

const wrap = asyncFn => (req, res, next) => {
  asyncFn(req, res, next).catch(err => next(err))
}

module.exports = function(app) {
  const asyncify = method => (...args) => {
    const fn = args.pop()
    return app[method](...args, wrap(fn))
  }

  return {
    delete: asyncify('delete'),
    get: asyncify('get'),
    post: asyncify('post'),
    put: asyncify('put'),
  }
}
