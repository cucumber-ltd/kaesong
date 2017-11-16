'use strict'

/**
 * Some objects, such as stores, should only be queried by most part of the code.
 * Wrapping them in a readOnlyProxy allows us to prevent incorrect usage, where
 * people might accidentally mutate state in parts of the code that shouldn't do
 * that.
 * Only projections should mutate state in stores.
 */
function makeReadOnlyProxy(proxied, determineMethodType) {
  determineMethodType =
    makeReadOnlyProxy.determineMethodType || determineMethodType

  return new Proxy(proxied, {
    get(target, method) {
      if (!proxied[method])
        throw new Error(
          `No such method '${proxied.constructor.name}#${method}'`
        )

      const methodType = determineMethodType(method)

      if (methodType === 'read' || methodType === 'lifetime')
        return proxied[method].bind(proxied)

      if (methodType === 'write' || methodType === 'private')
        return function() {
          throw new Error(
            `Attempted to call ${methodType} method '${method}' on read-only proxy`
          )
        }

      throw new Error(
        `Cannot determine if '${method}' is a read or write method`
      )
    },
  })
}

makeReadOnlyProxy.determineMethodType = function(name) {
  if (/^(get|is|indexOf|search)/.test(name) || /exists$/i.test(name))
    return 'read'
  if (/^(constructor|start|stop|on)$/.test(name)) return 'lifetime'
  if (/^_/.test(name)) return 'private'
  if (
    /^(store|delete|grant|revoke|index|add|remove|set|unset|create)/.test(name)
  )
    return 'write'
}

module.exports = makeReadOnlyProxy
