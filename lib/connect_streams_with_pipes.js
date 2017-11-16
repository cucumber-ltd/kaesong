'use strict'

module.exports = function connectStreamsWithPipes({
  source,
  destination,
  connections,
}) {
  return connections
    .reduce((upstream, connection) => upstream.pipe(connection), source)
    .pipe(destination)
}
