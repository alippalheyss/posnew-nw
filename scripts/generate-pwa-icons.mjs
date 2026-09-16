import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPNG(width, height, drawFn) {
  // RGBA buffer
  const stride = width * 4;
  const rawData = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (stride + 1);
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([138, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression method: 0
  ihdr[11] = 0; // Filter method: 0
  ihdr[12] = 0; // Interlace method: 0

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = crc32(crcInput);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }

  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

// Draw modern gradient POS terminal icon
function drawPosIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;
  const cx = 0.5;
  const cy = 0.5;
  const dist = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2);

  // Background rounded squircle / gradient
  const bgR = Math.round(15 + 15 * nx);
  const bgG = Math.round(23 + 20 * ny);
  const bgB = Math.round(42 + 40 * nx);

  // Rounded box bounds
  const cornerR = 0.22;
  const inBox = Math.abs(nx - 0.5) < 0.44 && Math.abs(ny - 0.5) < 0.44;
  
  // Icon drawing: POS cash register / screen symbol
  // Main screen rectangle: x: [0.28, 0.72], y: [0.24, 0.56]
  const inScreen = nx >= 0.28 && nx <= 0.72 && ny >= 0.24 && ny <= 0.56;
  const isScreenBorder = inScreen && (nx <= 0.32 || nx >= 0.68 || ny <= 0.28 || ny >= 0.52);
  const inScreenInner = nx > 0.32 && nx < 0.68 && ny > 0.28 && ny < 0.52;

  // Base stand: x: [0.44, 0.56], y: [0.56, 0.68]
  const inStand = nx >= 0.44 && nx <= 0.56 && ny >= 0.56 && ny <= 0.68;
  
  // Base plate: x: [0.25, 0.75], y: [0.68, 0.76]
  const inBase = nx >= 0.25 && nx <= 0.75 && ny >= 0.68 && ny <= 0.76;

  // Modern Accent color: Vibrant Emerald & Orange
  if (inScreenInner) {
    // Glowing emerald screen
    const glow = 1 - Math.abs(nx - 0.5) * 2;
    return [16, Math.round(185 + glow * 50), Math.round(129 + glow * 30), 255];
  }
  if (isScreenBorder || inStand || inBase) {
    // Primary orange / slate accent
    return [249, 115, 22, 255]; // vibrant orange #f97316
  }

  // Background gradient fill
  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve(process.cwd(), 'public');

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, drawPosIcon));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, drawPosIcon));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, drawPosIcon));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, drawPosIcon));

console.log('PWA icons created successfully in public directory!');
