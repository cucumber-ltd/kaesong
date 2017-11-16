'use strict'

const { Writable } = require('stream')
const arrayToStream = require('../lib/array_to_stream')

module.exports = async ({
  events,
  stream,
  listener,
  saga,
  projection,
  resolveOn = 'finish',
}) => {
  // listener, saga, projection are all synonymous
  if (!stream) stream = listener || saga || projection

  await new Promise((resolve, reject) => {
    const readableStream = arrayToStream(events)
    readableStream.pipe(stream).on('error', reject) //.on(resolveOn, resolve)
    readableStream
      .pipe(
        new Writable({
          objectMode: true,
          highWaterMark: 0,
          write: (_, __, cb) => cb(),
        })
      )
      .on(resolveOn, resolve)
  })
}
