import fs from 'fs';
import path from 'path';

// Generate minimal valid PNG icons with the app gradient and sparkle
// A 1x1 or raw PNG buffer or basic chunk generator
function createSolidPngBuffer(width, height, r, g, b) {
  // Use zlib deflate to create a compliant PNG image buffer
  import('zlib').then(zlib => {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    
    // IHDR
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData.writeUInt8(8, 8); // 8-bit depth
    ihdrData.writeUInt8(6, 9); // RGBA color type
    ihdrData.writeUInt8(0, 10);
    ihdrData.writeUInt8(0, 11);
    ihdrData.writeUInt8(0, 12);
    
    const ihdrChunk = createChunk('IHDR', ihdrData);

    // Raw image scanlines: filter byte 0 followed by width * 4 bytes per scanline
    const rowSize = 1 + width * 4;
    const rawData = Buffer.alloc(rowSize * height);

    for (let y = 0; y < height; y++) {
      const rowOffset = y * rowSize;
      rawData.writeUInt8(0, rowOffset); // No filter

      // Draw rounded rect center badge or dark gradient
      const cy = y - height / 2;
      for (let x = 0; x < width; x++) {
        const cx = x - width / 2;
        const dist = Math.sqrt(cx * cx + cy * cy);
        const pixelOffset = rowOffset + 1 + x * 4;

        // Sparkle center or background
        if (dist < width * 0.18) {
          // White-cyan sparkle center
          rawData.writeUInt8(147, pixelOffset);     // R
          rawData.writeUInt8(197, pixelOffset + 1); // G
          rawData.writeUInt8(253, pixelOffset + 2); // B
          rawData.writeUInt8(255, pixelOffset + 3); // A
        } else if (dist < width * 0.35) {
          // Indigo glow
          rawData.writeUInt8(99, pixelOffset);      // R
          rawData.writeUInt8(102, pixelOffset + 1); // G
          rawData.writeUInt8(241, pixelOffset + 2); // B
          rawData.writeUInt8(255, pixelOffset + 3); // A
        } else {
          // Dark background #0f172a
          rawData.writeUInt8(15, pixelOffset);      // R
          rawData.writeUInt8(23, pixelOffset + 1);  // G
          rawData.writeUInt8(42, pixelOffset + 2);  // B
          rawData.writeUInt8(255, pixelOffset + 3); // A
        }
      }
    }

    const compressed = zlib.deflateSync(rawData);
    const idatChunk = createChunk('IDAT', compressed);
    const iendChunk = createChunk('IEND', Buffer.alloc(0));

    const finalPng = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);

    const publicDir = path.resolve('public');
    const files = [
      path.join(publicDir, `icon-${width}.png`),
      path.join(publicDir, `pwa-${width}x${width}.png`)
    ];

    if (width === 180) {
      files.push(path.join(publicDir, 'apple-touch-icon.png'));
    }
    if (width === 512) {
      files.push(path.join(publicDir, 'icon-maskable-512.png'));
      files.push(path.join(publicDir, 'pwa-maskable-512x512.png'));
    }

    files.forEach(f => {
      fs.writeFileSync(f, finalPng);
      console.log('Wrote', f);
    });
  });
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcTable = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 4; i < 8 + length; i++) {
    crc = crcTable[(crc ^ chunk[i]) & 0xff] ^ (crc >>> 8);
  }
  chunk.writeInt32BE((crc ^ 0xffffffff) | 0, 8 + length);
  return chunk;
}

let crcTableCache = null;
function getCrcTable() {
  if (crcTableCache) return crcTableCache;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  crcTableCache = table;
  return table;
}

createSolidPngBuffer(192, 192, 15, 23, 42);
createSolidPngBuffer(512, 512, 15, 23, 42);
createSolidPngBuffer(180, 180, 15, 23, 42);
