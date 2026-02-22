/* Version capacity table: [totalCodewords, ecCodewordsPerBlock, numBlocks] for EC level L */
const VERSION_TABLE = [
  null,
  [26,7,1],[44,10,1],[70,15,1],[100,20,1],[134,26,1],
  [172,18,2],[196,20,2],[242,24,2],[292,30,2],[346,18,2],
  [404,20,4],[466,24,4],[532,26,4],[581,30,4],[655,22,6]
];

const ALIGNMENTS = [
  null,[],
  [6,18],[6,22],[6,26],[6,30],[6,34],
  [6,22,38],[6,24,42],[6,26,46],[6,28,50],
  [6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70]
];

/* GF(256) with primitive polynomial 0x11D */
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGF() {
  let v = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = v;
    GF_LOG[v] = i;
    v <<= 1;
    if (v >= 256) v ^= 0x11D;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree) {
  let g = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      next[j] ^= g[j];
      next[j + 1] ^= gfMul(g[j], GF_EXP[i]);
    }
    g = next;
  }
  return g;
}

function rsEncode(data, ecLen) {
  const gen = rsGeneratorPoly(ecLen);
  const msg = new Array(data.length + ecLen).fill(0);
  for (let i = 0; i < data.length; i++) msg[i] = data[i];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

function chooseVersion(byteLen) {
  for (let v = 1; v <= 15; v++) {
    const [total, ecPerBlock, blocks] = VERSION_TABLE[v];
    const dataCodewords = total - ecPerBlock * blocks;
    /* byte mode: 4-bit mode indicator + character count bits + data */
    const ccBits = v <= 9 ? 8 : 16;
    const availBits = dataCodewords * 8;
    const neededBits = 4 + ccBits + byteLen * 8;
    if (neededBits <= availBits) return v;
  }
  return -1;
}

function encodeData(bytes, version) {
  const [total, ecPerBlock, numBlocks] = VERSION_TABLE[version];
  const dataCodewords = total - ecPerBlock * numBlocks;
  const ccBits = version <= 9 ? 8 : 16;

  /* build bit stream */
  let bits = [];
  const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };

  push(0b0100, 4); /* byte mode indicator */
  push(bytes.length, ccBits);
  for (const b of bytes) push(b, 8);

  /* terminator (up to 4 zeros) */
  const cap = dataCodewords * 8;
  const termLen = Math.min(4, cap - bits.length);
  for (let i = 0; i < termLen; i++) bits.push(0);

  /* pad to byte boundary */
  while (bits.length % 8 !== 0) bits.push(0);

  /* convert to bytes */
  const dataBytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    dataBytes.push(b);
  }

  /* pad bytes */
  const pads = [0xEC, 0x11];
  let pi = 0;
  while (dataBytes.length < dataCodewords) {
    dataBytes.push(pads[pi]);
    pi ^= 1;
  }

  /* split into blocks and compute EC */
  const blockDataLen = Math.floor(dataCodewords / numBlocks);
  const longerBlocks = dataCodewords % numBlocks;
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;

  for (let b = 0; b < numBlocks; b++) {
    const len = blockDataLen + (b >= numBlocks - longerBlocks ? 1 : 0);
    const block = dataBytes.slice(offset, offset + len);
    dataBlocks.push(block);
    ecBlocks.push(rsEncode(block, ecPerBlock));
    offset += len;
  }

  /* interleave */
  const result = [];
  const maxDataLen = blockDataLen + (longerBlocks > 0 ? 1 : 0);
  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < dataBlocks[b].length) result.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      result.push(ecBlocks[b][i]);
    }
  }

  return result;
}

function createMatrix(version) {
  const size = version * 4 + 17;
  const matrix = Array.from({ length: size }, () => new Int8Array(size)); /* 0=unset, 1=dark, -1=light */
  const reserved = Array.from({ length: size }, () => new Uint8Array(size));

  function setModule(r, c, dark) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = dark ? 1 : -1;
      reserved[r][c] = 1;
    }
  }

  /* finder patterns */
  function drawFinder(row, col) {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = row + dr, c = col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const dark = (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) ||
                     (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6)) ||
                     (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
        setModule(r, c, dark);
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  /* timing patterns */
  for (let i = 8; i < size - 8; i++) {
    setModule(6, i, i % 2 === 0);
    setModule(i, 6, i % 2 === 0);
  }

  /* alignment patterns */
  const aligns = ALIGNMENTS[version] || [];
  for (const ar of aligns) {
    for (const ac of aligns) {
      if (reserved[ar][ac]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
          setModule(ar + dr, ac + dc, dark);
        }
      }
    }
  }

  /* dark module */
  setModule(size - 8, 8, true);

  /* reserve format info areas */
  for (let i = 0; i < 8; i++) {
    if (!reserved[8][i]) { reserved[8][i] = 1; matrix[8][i] = 0; }
    if (!reserved[8][size - 1 - i]) { reserved[8][size - 1 - i] = 1; matrix[8][size - 1 - i] = 0; }
    if (!reserved[i][8]) { reserved[i][8] = 1; matrix[i][8] = 0; }
    if (!reserved[size - 1 - i][8]) { reserved[size - 1 - i][8] = 1; matrix[size - 1 - i][8] = 0; }
  }
  if (!reserved[8][8]) { reserved[8][8] = 1; matrix[8][8] = 0; }

  /* reserve version info for version >= 7 */
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        reserved[i][size - 11 + j] = 1;
        reserved[size - 11 + j][i] = 1;
      }
    }
  }

  return { matrix, reserved, size };
}

function placeData(matrix, reserved, size, codewords) {
  let bitIdx = 0;
  const totalBits = codewords.length * 8;

  function getBit() {
    if (bitIdx >= totalBits) return 0;
    const byte = codewords[bitIdx >> 3];
    const bit = (byte >> (7 - (bitIdx & 7))) & 1;
    bitIdx++;
    return bit;
  }

  let col = size - 1;
  let upward = true;

  while (col >= 0) {
    if (col === 6) col--; /* skip timing column */
    for (let row = 0; row < size; row++) {
      const actualRow = upward ? size - 1 - row : row;
      for (let dx = 0; dx <= 1; dx++) {
        const c = col - dx;
        if (c < 0 || reserved[actualRow][c]) continue;
        matrix[actualRow][c] = getBit() ? 1 : -1;
      }
    }
    upward = !upward;
    col -= 2;
  }
}

const MASK_FNS = [
  (r, c) => (r + c) % 2 === 0,
  (r, c) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => (r * c) % 2 + (r * c) % 3 === 0,
  (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
  (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0,
];

function applyMask(matrix, reserved, size, maskIdx) {
  const fn = MASK_FNS[maskIdx];
  const m = matrix.map(row => Int8Array.from(row));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c] && fn(r, c)) {
        m[r][c] = m[r][c] === 1 ? -1 : 1;
      }
    }
  }
  return m;
}

/* Format info: EC level L = 01 */
const FORMAT_INFOS = [
  0x77C4, 0x72F3, 0x7DAA, 0x789D, 0x662F, 0x6318, 0x6C41, 0x6976
];

function writeFormatInfo(matrix, size, maskIdx) {
  const info = FORMAT_INFOS[maskIdx];
  /* horizontal */
  const hPos = [0,1,2,3,4,5,7,8,size-8,size-7,size-6,size-5,size-4,size-3,size-2,size-1];
  for (let i = 0; i < 15; i++) {
    const bit = (info >> (14 - i)) & 1;
    matrix[8][hPos[i]] = bit ? 1 : -1;
  }
  /* vertical */
  const vPos = [size-1,size-2,size-3,size-4,size-5,size-6,size-7,size-8,7,5,4,3,2,1,0];
  for (let i = 0; i < 15; i++) {
    const bit = (info >> (14 - i)) & 1;
    matrix[vPos[i]][8] = bit ? 1 : -1;
  }
}

function penalty(matrix, size) {
  let score = 0;

  /* Rule 1: consecutive same-color runs */
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c < size; c++) {
      if (matrix[r][c] === matrix[r][c - 1]) { run++; }
      else { if (run >= 5) score += run - 2; run = 1; }
    }
    if (run >= 5) score += run - 2;
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r < size; r++) {
      if (matrix[r][c] === matrix[r - 1][c]) { run++; }
      else { if (run >= 5) score += run - 2; run = 1; }
    }
    if (run >= 5) score += run - 2;
  }

  /* Rule 2: 2x2 blocks */
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = matrix[r][c];
      if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) score += 3;
    }
  }

  /* Rule 3: finder-like patterns (simplified) */
  const pat1 = [1, -1, 1, 1, 1, -1, 1, -1, -1, -1, -1];
  const pat2 = [-1, -1, -1, -1, 1, -1, 1, 1, 1, -1, 1];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      let m1 = true, m2 = true;
      for (let k = 0; k < 11; k++) {
        if (matrix[r][c + k] !== pat1[k]) m1 = false;
        if (matrix[r][c + k] !== pat2[k]) m2 = false;
        if (!m1 && !m2) break;
      }
      if (m1 || m2) score += 40;
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      let m1 = true, m2 = true;
      for (let k = 0; k < 11; k++) {
        if (matrix[r + k][c] !== pat1[k]) m1 = false;
        if (matrix[r + k][c] !== pat2[k]) m2 = false;
        if (!m1 && !m2) break;
      }
      if (m1 || m2) score += 40;
    }
  }

  /* Rule 4: proportion of dark modules */
  let dark = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (matrix[r][c] === 1) dark++;
  const pct = (dark / (size * size)) * 100;
  score += Math.abs(Math.floor(pct / 5) * 5 - 50) * 2;

  return score;
}

/**
 * Generate a QR code and render to a canvas element.
 * @param {string} text - The text/URL to encode
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {number} [scale=6] - Pixels per module
 * @param {number} [quietZone=4] - Quiet zone modules
 */
export function renderQR(text, canvas, scale = 6, quietZone = 4) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const version = chooseVersion(bytes.length);
  if (version < 0) throw new Error('Data too large for QR code');

  const codewords = encodeData(bytes, version);
  const { matrix, reserved, size } = createMatrix(version);
  placeData(matrix, reserved, size, codewords);

  /* try all 8 masks, pick lowest penalty */
  let bestMask = 0, bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    const masked = applyMask(matrix, reserved, size, m);
    writeFormatInfo(masked, size, m);
    const s = penalty(masked, size);
    if (s < bestScore) { bestScore = s; bestMask = m; }
  }

  const finalMatrix = applyMask(matrix, reserved, size, bestMask);
  writeFormatInfo(finalMatrix, size, bestMask);

  /* render to canvas */
  const totalSize = (size + quietZone * 2) * scale;
  canvas.width = totalSize;
  canvas.height = totalSize;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, totalSize, totalSize);
  ctx.fillStyle = '#000000';

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (finalMatrix[r][c] === 1) {
        ctx.fillRect((c + quietZone) * scale, (r + quietZone) * scale, scale, scale);
      }
    }
  }
}

export function qrDataUrl(text, scale = 6, quietZone = 4) {
  const canvas = document.createElement('canvas');
  renderQR(text, canvas, scale, quietZone);
  return canvas.toDataURL('image/png');
}