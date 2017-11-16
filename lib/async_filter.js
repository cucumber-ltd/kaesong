'use strict'

const asyncFilter = async (array, predicate) => {
  const filtered = []
  for (const item of array) {
    if (await predicate(item)) filtered.push(item)
  }
  return filtered
}

module.exports = asyncFilter
