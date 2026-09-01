import { createWriteStream } from 'node:fs'
import { deflateSync, crc32 } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

function crc(buf) {
  return crc32(buf)
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc(Buffer.concat([typeBuf, data])) >>> 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function writePng(path, size, paint) {
  const pixels = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x, y, size)
      const i = (y * size + x) * 4
      pixels[i] = r
      pixels[i + 1] = g
      pixels[i + 2] = b
      pixels[i + 3] = a
    }
  }
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
  createWriteStream(path).end(png)
}

function dist(x, y, cx, cy) {
  const dx = x - cx
  const dy = y - cy
  return Math.hypot(dx, dy)
}

function roundedRect(x, y, size, radius) {
  const r = radius
  if (x >= r && x < size - r && y >= 0 && y < size) return true
  if (y >= r && y < size - r && x >= 0 && x < size) return true
  if (dist(x, y, r, r) <= r) return true
  if (dist(x, y, size - 1 - r, r) <= r) return true
  if (dist(x, y, r, size - 1 - r) <= r) return true
  if (dist(x, y, size - 1 - r, size - 1 - r) <= r) return true
  return false
}

function ellipseEdge(x, y, cx, cy, rx, ry, stroke) {
  const v = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
  const inner = ((rx - stroke) / rx) ** 2
  return v <= 1 && v >= inner
}

function paint(x, y, size) {
  const paper = [243, 246, 244, 255]
  const forest = [30, 58, 52, 255]
  const rose = [196, 91, 106, 255]
  if (!roundedRect(x, y, size, size * 0.28)) return [0, 0, 0, 0]
  const cx = (size - 1) / 2
  const lockCx = cx
  const lockCy = size * 0.53
  const rx = size * 0.22
  const ry = size * 0.25
  const stroke = Math.max(2.2, size / 28)
  if (ellipseEdge(x, y, lockCx, lockCy, rx, ry, stroke)) return paper
  if (dist(x, y, cx, size * 0.375) <= size * 0.05) return rose
  if (Math.abs(x - cx) < stroke * 0.55 && y >= size * 0.42 && y <= size * 0.5) return paper
  return forest
}

for (const [file, size] of [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
]) {
  writePng(join(root, file), size, paint)
  console.log('wrote', file)
}
