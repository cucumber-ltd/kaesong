'use strict'

module.exports = function getEnv(key, defaultValueMap) {
  if (process.env[key]) return process.env[key]

  const env = process.env.NODE_ENV || 'test'
  const defaultValue = defaultValueMap && defaultValueMap[env]

  if (defaultValue === undefined)
    throw new Error(
      `Environment variable '${key}' required when NODE_ENV=${env}`
    )

  return typeof defaultValue === 'function' ? defaultValue() : defaultValue
}
