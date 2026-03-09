const LZString = (function () {
  const f = String.fromCharCode;

  function compress(input, bpc, getChar) {
    if (input == null) return "";
    let i, val, dict = {}, dictCreate = {}, cc = "", wc = "", w = "",
        enlargeIn = 2, dictSize = 3, numBits = 2, data = [], dataVal = 0, dataPos = 0;

    for (let ii = 0; ii < input.length; ii++) {
      cc = input.charAt(ii);
      if (!dict.hasOwnProperty(cc)) { dict[cc] = dictSize++; dictCreate[cc] = true; }
      wc = w + cc;
      if (dict.hasOwnProperty(wc)) { w = wc; }
      else {
        if (dictCreate.hasOwnProperty(w)) {
          if (w.charCodeAt(0) < 256) {
            for (i = 0; i < numBits; i++) { dataVal <<= 1; if (dataPos == bpc - 1) { dataPos = 0; data.push(getChar(dataVal)); dataVal = 0; } else dataPos++; }
            val = w.charCodeAt(0);
            for (i = 0; i < 8; i++) { dataVal = (dataVal << 1) | (val & 1); if (dataPos == bpc - 1) { dataPos = 0; data.push(getChar(dataVal)); dataVal = 0; } else dataPos++; val >>= 1; }
          } else {
            val = 1;
            for (i = 0; i < numBits; i++) { dataVal = (dataVal << 1) | val; if (dataPos == bpc - 1) { dataPos = 0; data.push(getChar(dataVal)); dataVal = 0; } else dataPos++; val = 0; }
            val = w.charCodeAt(0);
            for (i = 0; i < 16; i++) { dataVal = (dataVal << 1) | (val & 1); if (dataPos == bpc - 1) { dataPos = 0; data.push(getChar(dataVal)); dataVal = 0; } else dataPos++; val >>= 1; }
          }
          enlargeIn--;
          if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
          delete dictCreate[w];
        } else {
          val = dict[w];
          for (i = 0; i < numBits; i++) { dataVal = (dataVal << 1) | (val & 1); if (dataPos == bpc - 1) { dataPos = 0; data.push(getChar(dataVal)); dataVal = 0; } else dataPos++; val >>= 1; }
        }
        enlargeIn--;
        if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
        dict[wc] = dictSize++;
        w = String(cc);
      }
    }
    if (w !== "") {
      if (dictCreate.hasOwnProperty(w)) {
        if (w.charCodeAt(0) < 256) {
          for (i = 0; i < numBits; i++) { dataVal <<= 1; if (dataPos == bpc - 1) { dataPos = 0; data.push(getChar(dataVal)); dataVal = 0; } else dataPos++; }
          val = w.charCodeAt(0);
          for (i = 0; i < 8; i++) { dataVal = (dataVal << 1) | (val & 1); if (dataPos == bpc - 1) { dataPos = 0; data.push(getChar(dataVal)); dataVal = 0; } else dataPos++; val >>= 1; }
        } else {
          val = 1;
          for (i = 0; i < numBits; i++) { dataVal = (dataVal << 1) | val; if (dataPos == bpc - 1) { dataPos = 0; data.push(getChar(dataVal)); dataVal = 0; } else dataPos++; val = 0; }
          val = w.charCodeAt(0);
          for (i = 0; i < 16; i++) { dataVal = (dataVal << 1) | (val & 1); if (dataPos == bpc - 1) { dataPos = 0; data.push(getChar(dataVal)); dataVal = 0; } else dataPos++; val >>= 1; }
        }
        enlargeIn--;
        if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
        delete dictCreate[w];
      } else {
        val = dict[w];
        for (i = 0; i < numBits; i++) { dataVal = (dataVal << 1) | (val & 1); if (dataPos == bpc - 1) { dataPos = 0; data.push(getChar(dataVal)); dataVal = 0; } else dataPos++; val >>= 1; }
      }
      enlargeIn--;
      if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
    }
    val = 2;
    for (i = 0; i < numBits; i++) { dataVal = (dataVal << 1) | (val & 1); if (dataPos == bpc - 1) { dataPos = 0; data.push(getChar(dataVal)); dataVal = 0; } else dataPos++; val >>= 1; }
    while (true) { dataVal <<= 1; if (dataPos == bpc - 1) { data.push(getChar(dataVal)); break; } else dataPos++; }
    return data.join("");
  }

  function decompress(length, resetVal, getNext) {
    let dict = [], enlargeIn = 4, dictSize = 4, numBits = 3, entry = "", result = [],
        w, c, data = { val: getNext(0), position: resetVal, index: 1 };
    for (let i = 0; i < 3; i++) dict[i] = i;
    let bits = 0, max = Math.pow(2, 2), power = 1;
    while (power != max) { let resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetVal; data.val = getNext(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
    switch (bits) {
      case 0: bits = 0; max = Math.pow(2, 8); power = 1; while (power != max) { let resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetVal; data.val = getNext(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; } c = f(bits); break;
      case 1: bits = 0; max = Math.pow(2, 16); power = 1; while (power != max) { let resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetVal; data.val = getNext(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; } c = f(bits); break;
      case 2: return "";
    }
    dict[3] = c; w = c; result.push(c);
    while (true) {
      if (data.index > length) return "";
      bits = 0; max = Math.pow(2, numBits); power = 1;
      while (power != max) { let resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetVal; data.val = getNext(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
      switch (c = bits) {
        case 0: bits = 0; max = Math.pow(2, 8); power = 1; while (power != max) { let resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetVal; data.val = getNext(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; } dict[dictSize++] = f(bits); c = dictSize - 1; enlargeIn--; break;
        case 1: bits = 0; max = Math.pow(2, 16); power = 1; while (power != max) { let resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetVal; data.val = getNext(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; } dict[dictSize++] = f(bits); c = dictSize - 1; enlargeIn--; break;
        case 2: return result.join("");
      }
      if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
      entry = dict[c] ? dict[c] : (c === dictSize ? w + w.charAt(0) : null);
      if (entry === null) return null;
      result.push(entry);
      dict[dictSize++] = w + entry.charAt(0);
      enlargeIn--;
      if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
      w = entry;
    }
  }

  return {
    compressToUTF16(input) {
      if (input == null) return "";
      return compress(input, 15, a => f(a + 32)) + " ";
    },
    decompressFromUTF16(input) {
      if (input == null) return "";
      if (input === "") return null;
      return decompress(input.length, 16384, i => input.charCodeAt(i) - 32);
    }
  };
})();
export default LZString;