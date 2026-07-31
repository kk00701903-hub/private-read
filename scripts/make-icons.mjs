import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

// Minimal PNG writer (RGBA, no filtering complexity beyond None)
function crcTable() {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
}
const CRC = crcTable()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  const crcData = Buffer.concat([typeBuf, data])
  crcBuf.writeUInt32BE(crc32(crcData))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}
function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a = 255] = paint(x, y, size)
      const i = row + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function icon(size) {
  return png(size, (x, y, s) => {
    const nx = (x + 0.5) / s
    const ny = (y + 0.5) / s
    // rounded rect bg
    const r = 0.22
    const px = Math.min(nx, 1 - nx)
    const py = Math.min(ny, 1 - ny)
    const inside =
      (px >= r && py >= 0) ||
      (py >= r && px >= 0) ||
      (px < r && py < r && (px - r) ** 2 + (py - r) ** 2 <= r * r)
    if (!inside) return [0, 0, 0, 0]
    // charcoal bg
    let rC = 15,
      gC = 20,
      bC = 25
    // letter-like mark (rounded bar)
    const inMark =
      (nx > 0.28 && nx < 0.42 && ny > 0.26 && ny < 0.74) ||
      (nx > 0.28 && nx < 0.68 && ny > 0.26 && ny < 0.4) ||
      (nx > 0.28 && nx < 0.62 && ny > 0.46 && ny < 0.58)
    if (inMark) {
      rC = 126
      gC = 184
      bC = 168
    }
    return [rC, gC, bC, 255]
  })
}

writeFileSync(new URL('../public/pwa-192.png', import.meta.url), icon(192))
writeFileSync(new URL('../public/pwa-512.png', import.meta.url), icon(512))
console.log('icons written')
