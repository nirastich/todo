import { qrDataUrl } from '/qr.js';
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

const Crypto = {
  _keyCache: {},
  async deriveKey(fullSyncKey) {
    if (this._keyCache[fullSyncKey]) return this._keyCache[fullSyncKey];
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey('raw', enc.encode(fullSyncKey), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    const key = await window.crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode('todo-app-salt-v1:' + fullSyncKey.substring(0, 16)), iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    this._keyCache[fullSyncKey] = key;
    return key;
  },
  clearKeyCache() { this._keyCache = {}; },
  async getServerId(fullSyncKey) {
    const enc = new TextEncoder();
    const hash = await window.crypto.subtle.digest('SHA-256', enc.encode(fullSyncKey));
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  },
  async encrypt(data, fullSyncKey) {
    try {
      const key = await this.deriveKey(fullSyncKey);
      const enc = new TextEncoder();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);
      let binary = '';
      const bytes = new Uint8Array(combined);
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    } catch (e) { console.error('Encryption failed:', e); return null; }
  },
  async decrypt(encryptedBase64, fullSyncKey) {
    try {
      const key = await this.deriveKey(fullSyncKey);
      const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) { console.error('Decryption failed:', e); return null; }
  },
  async getDeleteToken(fullSyncKey) {
    const hash = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode('delete-token:' + fullSyncKey));
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 64);
  },
  async getWriteToken(fullSyncKey) {
    const hash = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode('write-token:' + fullSyncKey));
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
};

const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const FOLDER_COLORS = ['#4A9EFF','#A78BFA','#FB923C','#EF4444','#10B981','#F472B6','#FBBF24','#6366F1'];

const Store = {
  todos: [],
  folders: [],
  settings: { theme: window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark', lang: (navigator.language || '').startsWith('de') ? 'de' : 'en', accent: '#76b852', activeFolder: null },

  load() {
    try {
      const raw = localStorage.getItem('todo_data');
      if (raw) this.todos = JSON.parse(LZString.decompressFromUTF16(raw)) || [];
    } catch (e) { this.todos = []; }
    try {
      const raw = localStorage.getItem('todo_folders');
      if (raw) this.folders = JSON.parse(raw) || [];
    } catch (e) { this.folders = []; }
    try {
      const s = JSON.parse(localStorage.getItem('todo_settings'));
      if (s) this.settings = { ...this.settings, ...s };
    } catch (e) {}
  },
  
  loadHidden() {
    try { this.hiddenFolders = JSON.parse(localStorage.getItem('todo_hidden_folders')) || []; }
    catch (e) { this.hiddenFolders = []; }
  },
  saveHidden() { localStorage.setItem('todo_hidden_folders', JSON.stringify(this.hiddenFolders)); },
  
  loadIsolated() {
    try { this.isolatedFolders = JSON.parse(localStorage.getItem('todo_isolated_folders')) || []; }
    catch (e) { this.isolatedFolders = []; }
  },
  saveIsolated() { localStorage.setItem('todo_isolated_folders', JSON.stringify(this.isolatedFolders)); },

  loadNoSync() {
    try { this.noSyncFolders = JSON.parse(localStorage.getItem('todo_nosync_folders')) || []; }
    catch (e) { this.noSyncFolders = []; }
  },
  saveNoSync() { localStorage.setItem('todo_nosync_folders', JSON.stringify(this.noSyncFolders)); },

  saveTodos(affectedFolderIds) {
    try { localStorage.setItem('todo_data', LZString.compressToUTF16(JSON.stringify(this.todos))); } catch (e) {}
    Sync.onLocalChange(affectedFolderIds);
  },

  saveFolders(affectedFolderIds) {
    try { localStorage.setItem('todo_folders', JSON.stringify(this.folders)); } catch (e) {}
    Sync.onLocalChange(affectedFolderIds);
  },

  saveSettings() { localStorage.setItem('todo_settings', JSON.stringify(this.settings)); }
};

function ordinal(n) {
  if (Store.settings.lang === 'de') return n + '.';
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const I18N = {
  en: {
    add: 'Add', allTodos: 'All Todos', settings: 'Settings', todoDetails: 'Todo Details',
    addTodo: 'Add Todo', editTodo: 'Edit Todo', title: 'Title',
    titlePH: 'What needs to be done?', notes: 'Notes', notesPH: 'Optional details...',
    schedule: 'Schedule', singleDay: 'Single Day', dateRange: 'Date Range',
    recurring: 'Recurring', dueTime: 'Due Time (optional)', save: 'Save',
    update: 'Update', deleteTodo: 'Delete Todo', date: 'Date', start: 'Start', end: 'End',
    frequency: 'Frequency', daily: 'Daily', weekly: 'Weekly', biweekly: 'Biweekly',
    monthly: 'Monthly', yearly: 'Yearly', days: 'Days',
    spanMode: 'Span mode (e.g. Friday → Sunday)', dayOfMonth: 'Day of Month',
    month: 'Month', day: 'Day', starts: 'Starts', endsOpt: 'Ends (optional)',
    repeatsDaily: 'Repeats every day.', everyWeek: 'every week',
    everyOtherWeek: 'every other week', theme: 'Theme',
    themeSub: 'Switch between dark and light mode', language: 'Language',
    langSub: 'Choose your language', accentColor: 'Accent Color',
    accentSub: 'Customize the highlight color', exportData: 'Export Data',
    exportSub: 'Download all todos as JSON', export: 'Export',
    importData: 'Import Data', importSub: 'Load todos from a JSON file', import: 'Import',
    resetData: 'Reset Data', resetSub: 'Delete all todos permanently', reset: 'Reset',
    cancel: 'Cancel', delete: 'Delete', deleteAll: 'Delete Everything',
    addExisting: 'Merge', overwrite: 'Overwrite',
    importTodos: 'Import Todos', importErr: 'Import Error',
    importErrMsg: 'Could not read the file. Make sure it is a valid JSON export.',
    resetTitle: 'Reset All Data',
    resetMsg: 'This will permanently delete all your todos. This cannot be undone.',
    delTitle: 'Delete Todo', delMsg: 'Are you sure you want to delete this todo?',
    noTodos: 'No todos for this day.', enjoy: 'Enjoy the free time!',
    open: 'open', done: 'done', completed: '✓ Completed', openSt: 'Open',
    markOpen: 'Mark Open', markDone: 'Mark Done', edit: 'Edit',
    all: 'All', single: 'Single', range: 'Range', to: 'to', ok: 'OK',
    noYet: 'No todos yet.', everyDay: 'Every day', weeklyOn: 'Weekly',
    biweeklyOn: 'Every other week', custom: 'Custom',
    allDone: 'All done for today!', timesPerSpan: 'Times per span',untilDone: 'Until done',
    notToday: 'Not today', showAgain: 'Show again',
    nHidden: n => `${n} hidden`,
    isolated: 'Isolated',
    isolatedDesc: 'Todos only visible when folder is selected',
    noSyncFolder: 'Local only',
    noSyncDesc: 'Exclude from sync, keep only on this device',
    noSyncConfirmTitle: 'Remove from sync?',
    noSyncConfirmMsg: 'This folder and its todos will be removed from all synced devices and only kept locally on this device.',
    noSyncDisableTitle: 'Enable sync for folder?',
    noSyncDisableMsg: 'This folder and its todos will be included in sync again and shared across devices.',
    hideDesc: 'Hide from folder list and overview',
    dayNames: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    dayFull: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    monthNames: MONTHS_EN,
    importMsg: n => `Found ${n} todo(s). How would you like to import?`,
    storageUsed: 'Storage Used', storageSub: 'Data saved in your browser',
    cleanup: 'Clean Up', cleanupData: 'Clean Up Data',
    cleanupSub: 'Remove past single & range todos and old completion dates',
    cleanupTitle: 'Clean Up Data',
    cleanupMsg: n => n > 0 ? `This will remove ${n} past todo(s) and trim old data. Continue?` : 'Nothing to clean up. All todos are current.',
    cleaned: 'Done',
    monthlyOn: d => `Monthly on the ${ordinal(d)}`,
    yearlyOn: (m, d) => `Yearly on ${MONTHS_EN[m]} ${d}`,
    sync: 'Sync', syncOn: 'On', syncOff: 'Off', syncGenerate: 'New',
    syncJoin: 'Join', syncStop: 'Stop sync', syncCopied: 'Copied',
    syncIdPH: 'Enter sync key...',
    syncJoinTitle: 'Join Sync',
    syncJoinMsg: (remote, local) => `Remote has ${remote} todo(s). You have ${local} local todo(s). How would you like to proceed?`,
    syncServerNote: 'Your todos are end-to-end encrypted. Anyone with this sync key has full access to the data.',
    syncDeleteServer: 'Delete Server Data',
    syncDeleteTitle: 'Delete Server Data',
    syncDeleteMsg: 'This will permanently remove all synced data from the server and stop syncing. Local data is kept.',
    syncDownloadServer: 'Download Server Data',
    syncPrivacy: 'Data Privacy',
    syncPrivacyTitle: 'Sync Data Privacy',
    syncPrivacyH1: 'What data is stored on the server?',
    syncPrivacyWhat: 'When sync is enabled, the following data is transmitted to and stored on the server:',
    syncPrivacyItem1: 'Your todos (titles, notes, dates, completion state), fully end-to-end encrypted',
    syncPrivacyItem2: 'A dataset identifier derived from a hash of your sync key',
    syncPrivacyItem3: 'A version counter used for conflict detection and synchronization',
    syncPrivacyH2: 'How is the data protected?',
    syncPrivacyEncrypt: 'All todo data is encrypted locally on your device using AES-256-GCM before being sent to the server. The encryption key is derived from your sync key using PBKDF2 with 100,000 iterations. The server never receives the encryption key and cannot decrypt your data.',
    syncPrivacyH3: 'How is the data stored?',
    syncPrivacyHow: 'Encrypted data is stored on the server as an opaque file identified only by the hashed dataset identifier. No accounts, names, email addresses, or personal identifiers are used. The server cannot determine the contents of your todos.',
    syncPrivacyH4: 'Access and control',
    syncPrivacyRights: 'Anyone with the full sync key can access and modify the encrypted data. You can download the encrypted server data at any time or permanently delete it using the delete function. Disabling sync does not automatically delete server data.',
    syncPrivacyH5: 'Logging and tracking',
    syncPrivacyNo: 'No analytics, advertising, cookies, or tracking technologies are used. The server may temporarily log IP addresses and request timestamps solely for operational security and abuse prevention. These logs are not linked to identifiable user profiles.',
    syncPrivacyH6: 'Shared Folders',
    syncPrivacyFolder: 'In addition to full sync, individual folders can be shared with others using a separate sync key. Each shared folder creates an independent encrypted dataset on the server with its own key. Shared folder data is encrypted using the same AES-256-GCM standard. The folder sync key only grants access to that specific folder, not to your other todos or main sync data. When you stop sharing a folder, the server data persists until explicitly deleted.',
    installApp: 'Install App',
    installSub: 'Add to home screen for offline use and a native app experience',
    install: 'Install',
    folders: 'Folders', folder: 'Folder', allFolders: 'All',
    noFolder: 'No folder', manageFolders: 'Manage Folders',
    foldersSub: 'Organize your todos into folders',
    folderName: 'Folder name', folderNamePH: 'e.g. Work, Personal...',
    addFolder: 'Add', editFolder: 'Edit Folder', deleteFolder: 'Delete Folder',
    deleteFolderTitle: 'Delete Folder',
    deleteFolderMsg: 'Delete this folder? Todos in this folder will be kept but unassigned.',
    folderColor: 'Color',
    renameFolderPH: 'New name...',
    hide: 'Hide on this device', show: 'Show on this device',
    supportProject: 'Support this project',
    syncTooLargeTitle: 'Sync Limit Reached',
    syncTooLargeMsg: 'Your data exceeds the 512 KB sync limit. Remove old todos via Clean Up to continue syncing.',
    installHow: 'How to',
    installIOSSub: 'In Safari: Share → Add to Home Screen',
    installIOSHowMsg: 'In Safari tap Share, then Add to Home Screen.',
    installFirefoxSub: 'Firefox: Menu → Install / Add to Home screen',
    installFirefoxHowMsg: 'Open the Firefox menu and choose Install or Add to Home screen.',
    syncDataSize: 'Sync Data',
    syncDataSub: 'Todo data saved on server',
    cacheSize: 'App Cache',
    cacheSub: 'Data saved in your browser',
    versionConflict: 'Data conflict',
    versionConflictMessage: 'Synchronized data has changed since your last connection.',
    dataDiscard: 'Discard my changes',
    dataOverwrite: 'Overwrite with my changes',
    folderSync: 'Shared Folder',
    folderSyncSetup: 'Share Folder',
    folderSyncDesc: 'Share this folder with others via a separate sync key',
    folderSyncStop: 'Stop sharing',
    folderSyncDelete: 'Delete shared data',
    folderSyncNote: 'Anyone with this key can access all todos in this folder.',
    folderSyncJoinTitle: 'Join Shared Folder',
    folderSyncJoinMsg: (remote, local) => `Shared folder has ${remote} todo(s). You have ${local} local todo(s) in this folder. How would you like to proceed?`,
    cleanupWillRemove: 'Will remove:',
    cleanupMore: n => `… and ${n} more.`,
    cleanupReasonSingle: d => `Single (${d})`,
    cleanupReasonRange: (s, e) => `Range (${s} → ${e})`,
    cleanupReasonUntilDone: (done, target) => `Until done (${done}/${target})`,
    cleanupReasonRecurring: d => `Recurring (ended ${d})`,
    sourceCode: 'Source code on',
    welcomeTour: 'Welcome Tour',
    welcomeTourSub: 'Replay the intro and feature overview',
    welcomeTourBtn: 'Replay',
    welcomeSkip: 'Skip',
    welcomeNext: 'Next',
    welcomeBack: 'Back',
    welcomeDone: 'Get started',
    w1Title: 'Welcome to Todo',
    w1Sub: 'A simple, private to-do app with folders, recurring tasks, encrypted sync, and offline support.',
    w2Title: 'Flexible Scheduling',
    w2Single: 'Single day',
    w2Range: 'Date range',
    w2Recurring: 'Recurring',
    w2Span: 'Span mode',
    w2Ex1: 'Buy birthday present',
    w2Ex2: 'Read 3 chapters',
    w2Ex3: 'Water plants',
    w2Ex4: 'Go for a run',
    w3Title: 'Organize with Folders',
    w3Ex1: 'Work',
    w3Ex2: 'Personal',
    w3Ex3: 'Shared',
    w3Feat1: 'Color-coded',
    w3Feat2: 'Hide or isolate per device',
    w3Feat3: 'Share folders with others',
    w4Title: 'End-to-End Encrypted Sync',
    w4Device: 'Your device',
    w4Encrypted: 'Encrypted',
    w4Server: 'Server',
    w4Feat1: 'AES-256 end-to-end encryption.',
    w4Feat2: 'No accounts, no tracking, no ads',
    w4Feat3: 'Works offline, syncs when back online',
    w5Title: 'Quick Tips',
    w5Tip1T: 'Navigate days',
    w5Tip1D: 'Use the arrow buttons or keyboard arrows',
    w5Tip2T: 'Reorder todos',
    w5Tip2D: 'Long-press or drag to rearrange',
    w5Tip3T: 'Todo details',
    w5Tip3D: 'Tap a todo for details, skip, or edit',
    w5Tip4T: 'Install as app',
    w5Tip4D: 'Find it in Settings for the best experience',
    resetMsgShared: names => `This will permanently delete all your local todos. You have shared folders (${names})! Their server data will be kept for other users unless you choose to delete it.`,
    resetKeepShared: 'Local reset only',
    resetDeleteShared: 'Reset & delete server data',
      },
  de: {
    add: 'Neu', allTodos: 'Alle Todos', settings: 'Einstellungen', todoDetails: 'Todo Details',
    addTodo: 'Todo hinzufügen', editTodo: 'Todo bearbeiten', title: 'Titel',
    titlePH: 'Was muss erledigt werden?', notes: 'Notizen', notesPH: 'Optionale Details...',
    schedule: 'Zeitplan', singleDay: 'Einzelner Tag', dateRange: 'Zeitraum',
    recurring: 'Wiederkehrend', dueTime: 'Uhrzeit (optional)', save: 'Speichern',
    update: 'Aktualisieren', deleteTodo: 'Todo löschen', date: 'Datum', start: 'Start',
    end: 'Ende', frequency: 'Häufigkeit', daily: 'Täglich', weekly: 'Wöchentlich',
    biweekly: 'Alle 2 Wochen', monthly: 'Monatlich', yearly: 'Jährlich', days: 'Tage',
    spanMode: 'Zeitspanne (z.B. Freitag → Sonntag)', dayOfMonth: 'Tag im Monat',
    month: 'Monat', day: 'Tag', starts: 'Beginn', endsOpt: 'Ende (optional)',
    repeatsDaily: 'Wiederholt sich jeden Tag.', everyWeek: 'jede Woche',
    everyOtherWeek: 'jede zweite Woche', theme: 'Design',
    themeSub: 'Zwischen Hell und Dunkel wechseln', language: 'Sprache',
    langSub: 'Sprache auswählen', accentColor: 'Akzentfarbe',
    accentSub: 'App-Farbe anpassen', exportData: 'Daten exportieren',
    exportSub: 'Alle Todos als JSON herunterladen', export: 'Export',
    importData: 'Daten importieren', importSub: 'Todos aus JSON-Datei laden',
    import: 'Import', resetData: 'Daten zurücksetzen',
    resetSub: 'Alle Todos unwiderruflich löschen', reset: 'Zurücksetzen',
    cancel: 'Abbrechen', delete: 'Löschen', deleteAll: 'Alles löschen',
    addExisting: 'Zusammenführen', overwrite: 'Überschreiben',
    importTodos: 'Todos importieren', importErr: 'Import Fehler',
    importErrMsg: 'Datei konnte nicht gelesen werden.',
    resetTitle: 'Alle Daten zurücksetzen',
    resetMsg: 'Alle Todos werden unwiderruflich gelöscht.',
    delTitle: 'Todo löschen', delMsg: 'Dieses Todo wirklich löschen?',
    noTodos: 'Keine Todos für diesen Tag.', enjoy: 'Genieße die freie Zeit!',
    open: 'offen', done: 'erledigt', completed: '✓ Erledigt', openSt: 'Offen',
    markOpen: 'Wieder öffnen', markDone: 'Erledigen', edit: 'Bearbeiten',
    all: 'Alle', single: 'Einzeln', range: 'Zeitraum', to: 'bis', ok: 'OK',
    noYet: 'Noch keine Todos.', everyDay: 'Jeden Tag', weeklyOn: 'Wöchentlich',
    biweeklyOn: 'Alle 2 Wochen', custom: 'Benutzerdefiniert',
    allDone: 'Alles erledigt für heute!', timesPerSpan: 'Mal pro Zeitspanne',untilDone: 'Bis erledigt',
    notToday: 'Nicht heute', showAgain: 'Wieder anzeigen',
    nHidden: n => `${n} ausgeblendet`,
    isolated: 'Isoliert',
    isolatedDesc: 'Todos nur sichtbar wenn Ordner ausgewählt ist',
    noSyncFolder: 'Nur lokal',
    noSyncDesc: 'Nicht synchronisieren, nur auf diesem Gerät behalten',
    noSyncConfirmTitle: 'Aus Sync entfernen?',
    noSyncConfirmMsg: 'Dieser Ordner und seine Todos werden von allen synchronisierten Geräten entfernt und nur lokal auf diesem Gerät behalten.',
    noSyncDisableTitle: 'Sync für Ordner aktivieren?',
    noSyncDisableMsg: 'Dieser Ordner und seine Todos werden wieder synchronisiert und auf allen Geräten geteilt.',
    hideDesc: 'Aus Ordnerliste und Übersicht ausblenden',
    dayNames: ['So','Mo','Di','Mi','Do','Fr','Sa'],
    dayFull: ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'],
    monthNames: MONTHS_DE,
    importMsg: n => `${n} Todo(s) gefunden. Wie importieren?`,
    storageUsed: 'Speicherverbrauch', storageSub: 'Im Browser gespeicherte Daten',
    cleanup: 'Aufräumen', cleanupData: 'Daten aufräumen',
    cleanupSub: 'Vergangene Einzel- & Zeitraum-Todos und alte Daten entfernen',
    cleanupTitle: 'Daten aufräumen',
    cleanupMsg: n => n > 0 ? `${n} vergangene(s) Todo(s) werden entfernt und alte Daten bereinigt. Fortfahren?` : 'Nichts aufzuräumen. Alle Todos sind aktuell.',
    cleaned: 'Fertig',
    monthlyOn: d => `Monatlich am ${d}.`,
    yearlyOn: (m, d) => `Jährlich am ${d}. ${MONTHS_DE[m]}`,
    sync: 'Sync', syncOn: 'An', syncOff: 'Aus', syncGenerate: 'Neu',
    syncJoin: 'Beitreten', syncStop: 'Sync stoppen', syncCopied: 'Kopiert',
    syncIdPH: 'Sync-Schlüssel eingeben...',
    syncJoinTitle: 'Sync beitreten',
    syncJoinMsg: (remote, local) => `Remote hat ${remote} Todo(s). Du hast ${local} lokale Todo(s). Wie möchtest du fortfahren?`,
    syncServerNote: 'Deine Todos sind Ende-zu-Ende verschlüsselt. Jeder mit diesem Sync-Schlüssel hat vollständigen Zugriff auf die Daten.',
    syncDeleteServer: 'Serverdaten löschen',
    syncDeleteTitle: 'Serverdaten löschen',
    syncDeleteMsg: 'Alle synchronisierten Daten werden unwiderruflich vom Server entfernt und die Synchronisierung gestoppt. Lokale Daten bleiben erhalten.',
    syncDownloadServer: 'Serverdaten herunterladen',
    syncPrivacy: 'Datenschutz',
    syncPrivacyTitle: 'Sync Datenschutz',
    syncPrivacyH1: 'Welche Daten werden auf dem Server gespeichert?',
    syncPrivacyWhat: 'Wenn Sync aktiviert ist, werden folgende Daten an den Server übertragen und dort gespeichert:',
    syncPrivacyItem1: 'Deine Todos (Titel, Notizen, Termine, Erledigungsstatus), vollständig Ende-zu-Ende verschlüsselt',
    syncPrivacyItem2: 'Eine Datensatz-ID, abgeleitet aus einem Hash deines Sync-Schlüssels',
    syncPrivacyItem3: 'Ein Versionszähler zur Synchronisation und Konflikterkennung',
    syncPrivacyH2: 'Wie werden die Daten geschützt?',
    syncPrivacyEncrypt: 'Alle Todo-Daten werden lokal auf deinem Gerät mit AES-256-GCM verschlüsselt, bevor sie an den Server gesendet werden. Der Verschlüsselungsschlüssel wird aus deinem Sync-Schlüssel mittels PBKDF2 mit 100.000 Iterationen abgeleitet. Der Server erhält niemals den Verschlüsselungsschlüssel und kann deine Daten nicht entschlüsseln.',
    syncPrivacyH3: 'Wie werden die Daten gespeichert?',
    syncPrivacyHow: 'Die verschlüsselten Daten werden auf dem Server als undurchsichtige Datei gespeichert, die ausschließlich über die gehashte Datensatz-ID referenziert wird. Es werden keine Konten, Namen, E-Mail-Adressen oder personenbezogenen Daten verwendet. Der Server kann den Inhalt deiner Todos nicht einsehen.',
    syncPrivacyH4: 'Zugriff und Kontrolle',
    syncPrivacyRights: 'Jede Person mit dem vollständigen Sync-Schlüssel kann auf die verschlüsselten Daten zugreifen und sie verändern. Du kannst die auf dem Server gespeicherten Daten jederzeit herunterladen oder vollständig löschen. Das Deaktivieren der Synchronisation löscht die Serverdaten nicht automatisch.',
    syncPrivacyH5: 'Protokollierung und Tracking',
    syncPrivacyNo: 'Es werden keine Analyse-, Werbe-, Cookie- oder Tracking-Technologien eingesetzt. Der Server kann IP-Adressen und Zeitpunkte von Anfragen kurzfristig aus technischen Gründen zur Sicherheit und Missbrauchsprävention protokollieren. Diese Protokolle werden nicht mit Nutzerprofilen verknüpft.',
    syncPrivacyH6: 'Geteilte Ordner',
    syncPrivacyFolder: 'Zusätzlich zur vollständigen Synchronisation können einzelne Ordner über einen separaten Sync-Schlüssel mit anderen geteilt werden. Jeder geteilte Ordner erzeugt einen unabhängigen verschlüsselten Datensatz auf dem Server mit eigenem Schlüssel. Geteilte Ordner werden mit dem gleichen AES-256-GCM Standard verschlüsselt. Der Ordner-Sync-Schlüssel gewährt nur Zugriff auf diesen einen Ordner, nicht auf andere Todos oder die Haupt-Synchronisation. Wenn du das Teilen eines Ordners beendest, bleiben die Serverdaten bestehen, bis sie explizit gelöscht werden.',
    installApp: 'App installieren',
    installSub: 'Zum Startbildschirm hinzufügen für Offline-Nutzung und natives App-Erlebnis',
    install: 'Installieren',
    folders: 'Ordner', folder: 'Ordner', allFolders: 'Alle',
    noFolder: 'Kein Ordner', manageFolders: 'Ordner verwalten',
    foldersSub: 'Organisiere deine Todos in Ordnern',
    folderName: 'Ordnername', folderNamePH: 'z.B. Arbeit, Privat...',
    addFolder: 'Hinzufügen', editFolder: 'Ordner bearbeiten', deleteFolder: 'Ordner löschen',
    deleteFolderTitle: 'Ordner löschen',
    deleteFolderMsg: 'Diesen Ordner löschen? Todos in diesem Ordner werden behalten, aber nicht mehr zugeordnet.',
    folderColor: 'Farbe',
    renameFolderPH: 'Neuer Name...',
    hide: 'Auf diesem Gerät ausblenden', show: 'Auf diesem Gerät einblenden',
    supportProject: 'Dieses Projekt unterstützen',
    syncTooLargeTitle: 'Sync-Limit erreicht',
    syncTooLargeMsg: 'Deine Daten überschreiten das 512 KB Sync-Limit. Entferne alte Todos über Aufräumen, um weiter zu synchronisieren.',
    installHow: 'Anleitung',
    installIOSSub: 'In Safari: Teilen → Zum Home-Bildschirm',
    installIOSHowMsg: 'In Safari tippe auf Teilen und dann auf "Zum Home-Bildschirm".',
    installFirefoxSub: 'Firefox: Menü → Installieren / Zum Startbildschirm',
    installFirefoxHowMsg: 'Öffne das Firefox-Menü und wähle Installieren oder Zum Startbildschirm hinzufügen.',
    syncDataSize: 'Sync-Daten',
    syncDataSub: 'Todo-Daten die auf dem Server gespeichert werden',
    cacheSize: 'App-Cache',
    cacheSub: 'Im Browser gespeicherte Daten',
    versionConflict: 'Datenkonflikt',
    versionConflictMessage: 'Die synchronisierten Daten haben sich seit der letzten Verbindung geändert.',
    dataDiscard: 'Meine Änderungen verwerfen',
    dataOverwrite: 'Mit meinen Änderungen überschreiben',
    folderSync: 'Geteilter Ordner',
    folderSyncSetup: 'Ordner teilen',
    folderSyncDesc: 'Diesen Ordner über einen separaten Sync-Schlüssel mit anderen teilen',
    folderSyncStop: 'Teilen beenden',
    folderSyncDelete: 'Geteilte Daten löschen',
    folderSyncNote: 'Jeder mit diesem Schlüssel hat Zugriff auf alle Todos in diesem Ordner.',
    folderSyncJoinTitle: 'Geteiltem Ordner beitreten',
    folderSyncJoinMsg: (remote, local) => `Geteilter Ordner hat ${remote} Todo(s). Du hast ${local} lokale Todo(s) in diesem Ordner. Wie möchtest du fortfahren?`,
    cleanupWillRemove: 'Wird entfernt:',
    cleanupMore: n => `… und ${n} weitere.`,
    cleanupReasonSingle: d => `Einzeln (${d})`,
    cleanupReasonRange: (s, e) => `Zeitraum (${s} → ${e})`,
    cleanupReasonUntilDone: (done, target) => `Bis erledigt (${done}/${target})`,
    cleanupReasonRecurring: d => `Wiederkehrend (endete ${d})`,
    sourceCode: 'Quellcode auf',
    welcomeTour: 'Willkommenstour',
    welcomeTourSub: 'Einführung und Funktionsübersicht wiederholen',
    welcomeTourBtn: 'Nochmal',
    welcomeSkip: 'Überspringen',
    welcomeNext: 'Weiter',
    welcomeBack: 'Zurück',
    welcomeDone: 'Los geht\'s',
    w1Title: 'Willkommen bei TODO.73.nu',
    w1Sub: 'Eine einfache, private Todo-App mit Ordnern, wiederkehrenden Aufgaben, verschlüsseltem Sync und Offline-Unterstützung.',
    w2Title: 'Flexible Planung',
    w2Single: 'Einzelner Tag',
    w2Range: 'Zeitraum',
    w2Recurring: 'Wiederkehrend',
    w2Span: 'Zeitspanne',
    w2Ex1: 'Geburtstagsgeschenk kaufen',
    w2Ex2: '3 Kapitel lesen',
    w2Ex3: 'Pflanzen gießen',
    w2Ex4: 'Laufen gehen',
    w3Title: 'Ordner & Organisation',
    w3Ex1: 'Arbeit',
    w3Ex2: 'Privat',
    w3Ex3: 'Geteilt',
    w3Feat1: 'Farblich markiert',
    w3Feat2: 'Pro Gerät aus- oder einblenden',
    w3Feat3: 'Ordner mit anderen teilen',
    w4Title: 'Ende-zu-Ende verschlüsselter Sync',
    w4Device: 'Dein Gerät',
    w4Encrypted: 'Verschlüsselt',
    w4Server: 'Server',
    w4Feat1: 'AES-256 Ende-zu-Ende Verschlüsselung',
    w4Feat2: 'Keine Konten, kein Tracking, keine Werbung',
    w4Feat3: 'Funktioniert offline, synchronisiert automatisch',
    w5Title: 'Schnelltipps',
    w5Tip1T: 'Tage wechseln',
    w5Tip1D: 'Pfeiltasten oder Pfeil-Buttons nutzen',
    w5Tip2T: 'Todos sortieren',
    w5Tip2D: 'Lang drücken oder ziehen zum Umsortieren',
    w5Tip3T: 'Todo-Details',
    w5Tip3D: 'Antippen für Details, Überspringen oder Bearbeiten',
    w5Tip4T: 'Als App installieren',
    w5Tip4D: 'Mehr Info in den Einstellungen',
    resetMsgShared: names => `Alle lokalen Todos werden unwiderruflich gelöscht. Du hast geteilte Ordner (${names})! Deren Serverdaten bleiben für andere Nutzer erhalten, es sei denn du löschst sie.`,
    resetKeepShared: 'Nur Lokal Zurücksetzen',
    resetDeleteShared: 'Zurücksetzen & Serverdaten löschen',
  }
};

function L(key) { return I18N[Store.settings.lang]?.[key] ?? I18N.en[key] ?? key; }
function LF(key, ...args) { const val = I18N[Store.settings.lang]?.[key] ?? I18N.en[key]; return typeof val === 'function' ? val(...args) : val; }

const Util = {
  dateStr(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
  formatShort(s) { const d = this.parseDate(s); return `${d.getDate()} ${L('monthNames')[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; },
  uid() { return crypto.randomUUID(); },
  isToday(ds) { return ds === this.dateStr(new Date()); },
  esc(s) { const el = document.createElement('div'); el.textContent = s; return el.innerHTML; },
  safeId(s) { return s.replace(/[^a-zA-Z0-9_-]/g, ''); },
  formatTime(t) {
    if (!t) return '';
    if (Store.settings.lang === 'de') return t + ' Uhr';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  },
  weeksDiff(d1, d2) {
    const a = new Date(d1); a.setHours(0, 0, 0, 0);
    const b = new Date(d2); b.setHours(0, 0, 0, 0);
    const da = a.getDay() || 7; a.setDate(a.getDate() - da + 1);
    const db = b.getDay() || 7; b.setDate(b.getDate() - db + 1);
    return Math.round((b - a) / (7 * 864e5));
  },
  inSpan(day, start, end) { return start <= end ? (day >= start && day <= end) : (day >= start || day <= end); },
  getSpanWeekStart(dateStr, r) {
    const d = this.parseDate(dateStr);
    const dow = d.getDay();
    const spanStart = r.spanStart;
    const diff = ((dow - spanStart) % 7 + 7) % 7;
    const weekStart = new Date(d);
    weekStart.setDate(weekStart.getDate() - diff);
    return this.dateStr(weekStart);
  }
};

const Folders = {
  getById(id) { return Store.folders.find(f => f.id === id) || null; },
  getColor(id) { const f = this.getById(id); return f ? f.color : null; },
  getName(id) { const f = this.getById(id); return f ? f.name : ''; },
  todosInFolder(folderId) { return Store.todos.filter(t => t.folderId === folderId).length; },

  add(name, color) {
    if (!name.trim()) return;
    Store.folders.push({ id: Util.uid(), name: name.trim(), color: color || FOLDER_COLORS[Store.folders.length % FOLDER_COLORS.length] });
    Store.saveFolders();
  },

  rename(id, name) {
    const f = this.getById(id);
    if (f && name.trim()) { f.name = name.trim(); Store.saveFolders([id]); }
  },

  setColor(id, color) {
    const f = this.getById(id);
    if (f) { f.color = color; Store.saveFolders([id]); }
  },

  remove(id) {
    Sync.stopFolder(id);
    Store.folders = Store.folders.filter(f => f.id !== id);
    Store.todos.forEach(t => { if (t.folderId === id) delete t.folderId; });
    Store.saveFolders();
    Store.saveTodos();
    if (Store.settings.activeFolder === id) {
      Store.settings.activeFolder = null;
      Store.saveSettings();
    }
  },
  
  isHidden(id) { return Store.hiddenFolders.includes(id); },
  toggleHidden(id) {
    const idx = Store.hiddenFolders.indexOf(id);
    if (idx >= 0) Store.hiddenFolders.splice(idx, 1);
    else {
      Store.hiddenFolders.push(id);
      if (Store.settings.activeFolder === id) {
        Store.settings.activeFolder = null;
        Store.saveSettings();
      }
    }
    Store.saveHidden();
  },
  
  isIsolated(id) { return Store.isolatedFolders.includes(id); },
  toggleIsolated(id) {
    const idx = Store.isolatedFolders.indexOf(id);
    if (idx >= 0) Store.isolatedFolders.splice(idx, 1);
    else Store.isolatedFolders.push(id);
    Store.saveIsolated();
  },

  isNoSync(id) { return Store.noSyncFolders.includes(id); },
  setNoSync(id, val) {
    if (val && Sync.isFolderShared(id)) return;
    const idx = Store.noSyncFolders.indexOf(id);
    if (val && idx < 0) Store.noSyncFolders.push(id);
    else if (!val && idx >= 0) Store.noSyncFolders.splice(idx, 1);
    Store.saveNoSync();
    Sync.onLocalChange();
  },
};

const Todos = {
  isOnDate(todo, ds) {
    const d = Util.parseDate(ds);
    switch (todo.type) {
      case 'single': return todo.date === ds;
      case 'range':  return ds >= todo.startDate && (!todo.endDate || ds <= todo.endDate);
      case 'recurring': return this._matchRecurrence(todo, d, ds);
    }
    return false;
  },

  _matchRecurrence(todo, date, ds) {
    const r = todo.recurrence;
    if (!r || ds < r.startDate || (r.endDate && ds > r.endDate)) return false;
    const dow = date.getDay();
    switch (r.frequency) {
      case 'daily': return true;
      case 'weekly':
        if (r.spanEnabled) return Util.inSpan(dow, r.spanStart, r.spanEnd);
        return (r.days || []).includes(dow);
      case 'biweekly': {
        const w = Util.weeksDiff(Util.parseDate(r.startDate), date);
        if (((w % 2) + 2) % 2 !== 0) return false;
        if (r.spanEnabled) return Util.inSpan(dow, r.spanStart, r.spanEnd);
        return (r.days || []).includes(dow);
      }
      case 'monthly': return date.getDate() === r.dayOfMonth;
      case 'yearly':  return date.getMonth() === r.month && date.getDate() === r.dayOfMonth;
    }
    return false;
  },

  _isSpan(todo) {
    const r = todo.recurrence;
    return todo.type === 'recurring' && r && r.spanEnabled && (r.frequency === 'weekly' || r.frequency === 'biweekly');
  },

  spanCompletionCount(todo, ds) {
    if (!todo.completedDates?.length) return 0;
    const r = todo.recurrence;
    const spanWeek = Util.getSpanWeekStart(ds, r);
    return todo.completedDates.filter(cd => Util.getSpanWeekStart(cd, r) === spanWeek).length;
  },

  spanTarget(todo) { return todo.recurrence?.spanCount || 1; },

  isSpanFullyDone(todo, ds) {
    if (!this._isSpan(todo)) return false;
    return this.spanCompletionCount(todo, ds) >= this.spanTarget(todo);
  },

  _isRangeCount(todo) { return todo.type === 'range' && (todo.rangeCount || 0) > 0; },
  rangeTarget(todo) { return todo.rangeCount || 0; },
  rangeCompletionCount(todo) {
    if (!todo.completedDates?.length) return 0;
    return todo.completedDates.filter(d => d >= todo.startDate && (!todo.endDate || d <= todo.endDate)).length;
  },
  isRangeFullyDone(todo) {
    if (!this._isRangeCount(todo)) return false;
    return this.rangeCompletionCount(todo) >= this.rangeTarget(todo);
  },

  isVisible(todo, ds) {
    if (!this.isOnDate(todo, ds)) return false;
    if (this._isSpan(todo) && this.isSpanFullyDone(todo, ds)) return (todo.completedDates || []).includes(ds);
    if (this._isRangeCount(todo) && this.isRangeFullyDone(todo)) return (todo.completedDates || []).includes(ds);
    return true;
  },

  isDone(todo, ds) { return todo.completedDates?.includes(ds) || false; },

  isSkipped(todo, ds) { return todo.skippedDates?.includes(ds) || false; },

  toggleSkip(id, ds) {
    const todo = Store.todos.find(t => t.id === id);
    if (!todo) return;
    if (!todo.skippedDates) todo.skippedDates = [];
    const idx = todo.skippedDates.indexOf(ds);
    if (idx >= 0) todo.skippedDates.splice(idx, 1);
    else todo.skippedDates.push(ds);
    todo._modified = Date.now();
    Store.saveTodos(todo.folderId ? [todo.folderId] : null);
    App.render();
  },

  isOnlyOnDate(todo, ds) {
    return todo.type === 'single' && todo.date === ds;
  },

  toggleDone(id, ds) {
    const todo = Store.todos.find(t => t.id === id);
    if (!todo) return;
    if (!todo.completedDates) todo.completedDates = [];
    const idx = todo.completedDates.indexOf(ds);
    if (idx >= 0) todo.completedDates.splice(idx, 1);
    else todo.completedDates.push(ds);
    todo._modified = Date.now();
    Store.saveTodos(todo.folderId ? [todo.folderId] : null);
    App.render();
  },

  describe(todo) {
    switch (todo.type) {
      case 'single': return Util.formatShort(todo.date);
      case 'range': {
        const base = `${Util.formatShort(todo.startDate)} → ${todo.endDate ? Util.formatShort(todo.endDate) : '∞'}`;
        return base + ((todo.rangeCount || 0) > 0 ? ` (${todo.rangeCount}×)` : '');
      }
      case 'recurring': return this.describeRec(todo.recurrence);
    }
    return '';
  },

  describeRec(r) {
    if (!r) return L('recurring');
    const dayList = (r.days || []).map(d => L('dayNames')[d]).join(', ');
    const countSuffix = r.spanEnabled ? ` (${r.spanCount || 1}×)` : '';
    switch (r.frequency) {
      case 'daily':    return L('everyDay');
      case 'weekly':   return r.spanEnabled
        ? `${L('weeklyOn')} ${L('dayNames')[r.spanStart]}–${L('dayNames')[r.spanEnd]}${countSuffix}`
        : `${L('weeklyOn')}: ${dayList}`;
      case 'biweekly': return r.spanEnabled
        ? `${L('biweeklyOn')} ${L('dayNames')[r.spanStart]}–${L('dayNames')[r.spanEnd]}${countSuffix}`
        : `${L('biweeklyOn')}: ${dayList}`;
      case 'monthly':  return LF('monthlyOn', r.dayOfMonth);
      case 'yearly':   return LF('yearlyOn', r.month, r.dayOfMonth);
    }
    return L('recurring');
  }
};

const Modal = {
  open(name) {
    if (name === 'list')     { document.getElementById('listModalTitle').textContent = L('allTodos'); ListView.render(); }
    if (name === 'settings') { document.getElementById('settingsModalTitle').textContent = L('settings'); Settings.render(); }
    if (name === 'detail')   { document.getElementById('detailModalTitle').textContent = L('todoDetails'); }
    requestAnimationFrame(() => document.getElementById(name + 'Modal').classList.add('open'));
  },
  close(name) {
    document.getElementById(name + 'Modal').classList.remove('open');
    if (name === 'add') App.editingId = null;
  },
  confirm(title, msg, buttons) {
    document.getElementById('confirmTitle').textContent = title;
    const msgEl = document.getElementById('confirmMsg');
    msgEl.textContent = msg;
    msgEl.style.whiteSpace = 'pre-line';
    const el = document.getElementById('confirmActions');
    el.innerHTML = buttons.map((b, i) => `<button class="btn ${b.cls}" data-i="${i}">${b.label}</button>`).join('');
    el.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => {
        document.getElementById('confirmDialog').classList.remove('open');
        buttons[parseInt(btn.dataset.i)].action();
      };
    });
    document.getElementById('confirmDialog').classList.add('open');
  }
};

class SyncChannel {
  constructor({ id, getPayload, applyPayload, onRender, onPushSuccess }) {
    this.id = id;
    this._getPayload = getPayload;
    this._applyPayload = applyPayload;
    this._onRender = onRender || (() => App.render());
    this._onPushSuccess = onPushSuccess || null;
    this.fullSyncKey = null;
    this.serverId = null;
    this.version = 0;
    this.enabled = false;
    this._dirty = false;
    this._pushing = false;
    this._applying = false;
    this._pushTimer = null;
    this._pollTimer = null;
    this._abortCtrl = null;
    this._pollErrors = 0;
    this._lastActivity = Date.now();
    this._dirtyConflictResolve = null;
    this._lastKnownRemoteIds = null;
    this._debug = false;
  }

  _log(...args) { if (this._debug) console.log(`%c[Sync:${this.id}]`, 'color:#4A9EFF;font-weight:bold', ...args); }
  _warn(...args) { if (this._debug) console.warn(`%c[Sync:${this.id}]`, 'color:#FB923C;font-weight:bold', ...args); }
  _err(...args) { if (this._debug) console.error(`%c[Sync:${this.id}]`, 'color:#EF4444;font-weight:bold', ...args); }

  _storageKey() {
    return this.id === 'main' ? 'todo_sync' : `todo_sync_folder_${this.id}`;
  }

  _saveState() {
    if (this.enabled && this.fullSyncKey) {
      localStorage.setItem(this._storageKey(), JSON.stringify({
        fullSyncKey: this.fullSyncKey,
        version: this.version,
        dirty: this._dirty
      }));
    } else {
      localStorage.removeItem(this._storageKey());
    }
  }

  loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(this._storageKey()));
      if (s && s.fullSyncKey) return s;
    } catch (e) {}
    return null;
  }

  async start(fullSyncKey, version, dirty) {
    this.fullSyncKey = fullSyncKey;
    this.serverId = await Crypto.getServerId(fullSyncKey);
    this.version = version || 0;
    this._dirty = dirty || false;
    this.enabled = true;
    this._saveState();
    this._stopPoll();
    this._log('start', { version: this.version, dirty: this._dirty, serverId: this.serverId?.slice(0, 8) + '…' });
    await this._poll(true);
  }

  stop() {
    this._log('stop', { wasVersion: this.version });
    this.enabled = false;
    this.fullSyncKey = null;
    this.serverId = null;
    this.version = 0;
    this._dirty = false;
    this._lastKnownRemoteIds = null;
    clearTimeout(this._pushTimer);
    this._stopPoll();
    this._saveState();
    Crypto.clearKeyCache();
  }

  resetActivity() {
    this._lastActivity = Date.now();
    this._pollErrors = 0;
  }

  onLocalChange() {
    if (!this.enabled || this._applying) return;
    this._lastActivity = Date.now();
    this._pollErrors = 0;
    if (!navigator.onLine) { this._log('localChange', 'offline, marking dirty'); this._dirty = true; this._saveState(); return; }
    this._log('localChange', 'scheduling push in 500ms');
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => this.push(), 500);
  }

  async push(force) {
    if (!this.enabled || !this.fullSyncKey || !this.serverId || this._pushing) return;
    this._pushing = true;
    try {
      const payload = this._getPayload();
      this._log('push', `encrypting ${(payload.todos || []).length} todos, ${(payload.folders || payload.folder ? 1 : 0)} folder(s), v${this.version}`);
      const encrypted = await Crypto.encrypt(payload, this.fullSyncKey);
      if (!encrypted) { this._err('push', 'encryption failed'); this._pushing = false; return; }
      const sizeKB = (encrypted.length / 1024).toFixed(1);
      if (encrypted.length > 512 * 1024) {
        this._warn('push', `payload too large: ${sizeKB} KB`);
        Modal.confirm(L('syncTooLargeTitle'), L('syncTooLargeMsg'), [
          { label: L('ok'), cls: 'btn-outline', action() {} }
        ]);
        this._pushing = false;
        return;
      }
      this._log('push', `sending ${sizeKB} KB, v${this.version}`);
      const res = await fetch('sync.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'push', id: this.serverId, version: this.version, encrypted,
          deleteToken: await Crypto.getDeleteToken(this.fullSyncKey),
          writeToken: await Crypto.getWriteToken(this.fullSyncKey)
        })
      });
      if (res.status === 413) {
        this._warn('push', 'server rejected: 413 too large');
        Modal.confirm(L('syncTooLargeTitle'), L('syncTooLargeMsg'), [
          { label: L('ok'), cls: 'btn-outline', action() {} }
        ]);
        this._pushing = false;
        return;
      }
      const data = await res.json();
      if (data.ok) {
        this._dirty = false;
        this.version = data.version;
        this._lastKnownRemoteIds = new Set((payload.todos || []).map(t => t.id));
        this._saveState();
        this._log('push', `✓ success → v${data.version}`);
        if (this._onPushSuccess) this._onPushSuccess(payload);
      } else if (data.conflict) {
        this._warn('push', `conflict at v${this.version}, server has v${data.version}`);
        await this._mergeOnConflict(data);
      }
    } catch (e) { this._dirty = true; this._err('push', 'network error', e.message); }
    this._pushing = false;
  }

  async pull() {
    if (!this.enabled || !this.serverId) return;
    this._log('pull', `fetching, local v${this.version}, dirty=${this._dirty}`);
    try {
      const res = await fetch('sync.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'pull', id: this.serverId })
      });
      const data = await res.json();
      if (!data.ok) { this._warn('pull', 'server returned not ok'); return; }
      if (data.version > this.version) {
        this._log('pull', `remote v${data.version} > local v${this.version}`);
        if (this._dirty) { this._warn('pull', 'dirty conflict, asking user'); await this._resolveDirtyConflict(data); }
        else await this._applyRemote(data);
      } else if (data.version === this.version && this._dirty) {
        this._log('pull', 'versions match, pushing dirty changes');
        await this.push();
      } else if (this._dirty) {
        this._log('pull', 'dirty, pushing');
        await this.push();
      } else {
        this._log('pull', 'up to date');
      }
    } catch (e) { this._err('pull', 'network error', e.message); }
  }

  async _applyRemote(data) {
    if (!data.encrypted) return;
    const decrypted = await Crypto.decrypt(data.encrypted, this.fullSyncKey);
    if (!decrypted) { this._err('applyRemote', 'decryption failed'); return; }
    this._log('applyRemote', `applying v${data.version}: ${(decrypted.todos || []).length} todos`);
    this._applying = true;
    this._applyPayload(decrypted);
    this._applying = false;
    this._lastKnownRemoteIds = new Set((decrypted.todos || []).map(t => t.id));
    this.version = data.version;
    this._saveState();
    this._onRender();
  }

  async _mergeOnConflict(data) {
    if (!data.encrypted) return;
    const localPayload = this._getPayload();
    const remoteDecrypted = await Crypto.decrypt(data.encrypted, this.fullSyncKey);
    if (!remoteDecrypted) { this._err('merge', 'decryption failed'); return; }

    const localTodos = localPayload.todos || [];
    const remoteTodos = remoteDecrypted.todos || [];
    const mergedTodos = SyncChannel._mergeTodos(localTodos, remoteTodos, this._lastKnownRemoteIds);

    const localFolders = localPayload.folders || [];
    const remoteFolderArr = remoteDecrypted.folders || (remoteDecrypted.folder ? [remoteDecrypted.folder] : []);
    const mergedFolders = SyncChannel._mergeFolders(localFolders, remoteFolderArr);

    const localOnly = mergedTodos.filter(t => !remoteTodos.some(r => r.id === t.id)).length;
    const remoteOnly = mergedTodos.filter(t => !localTodos.some(l => l.id === t.id)).length;
    const bothModified = mergedTodos.length - localOnly - remoteOnly;
    this._log('merge', `local=${localTodos.length} remote=${remoteTodos.length} → merged=${mergedTodos.length} (localOnly=${localOnly} remoteOnly=${remoteOnly} both=${bothModified})`);

    const merged = {};
    if (remoteDecrypted.folders !== undefined) merged.folders = mergedFolders;
    if (remoteDecrypted.folder !== undefined) merged.folder = mergedFolders[0] || remoteDecrypted.folder;
    merged.todos = mergedTodos;

    this._applying = true;
    this._applyPayload(merged);
    this._applying = false;
    this._lastKnownRemoteIds = new Set(mergedTodos.map(t => t.id));
    this.version = data.version;
    this._saveState();
    this._onRender();
    this._log('merge', `applied → v${data.version}, re-pushing merged`);
    setTimeout(() => this.push(), 300);
  }

  static _mergeTodos(localTodos, remoteTodos, lastKnownRemoteIds) {
    const remoteMap = new Map(remoteTodos.map(t => [t.id, t]));
    const merged = new Map();

    remoteTodos.forEach(t => merged.set(t.id, { ...t }));

    localTodos.forEach(lt => {
      const rt = remoteMap.get(lt.id);
      if (!rt) {
        if (lastKnownRemoteIds && lastKnownRemoteIds.has(lt.id)) return;
        merged.set(lt.id, { ...lt });
        return;
      }
      const m = { ...rt };
      const localDates = new Set(lt.completedDates || []);
      const remoteDates = new Set(rt.completedDates || []);
      const unionDates = [...new Set([...localDates, ...remoteDates])];
      unionDates.sort();
      m.completedDates = unionDates;
      const localSkipped = new Set(lt.skippedDates || []);
      const remoteSkipped = new Set(rt.skippedDates || []);
      const unionSkipped = [...new Set([...localSkipped, ...remoteSkipped])];
      unionSkipped.sort();
      m.skippedDates = unionSkipped;
      m._modified = Math.max(lt._modified || lt.created || 0, rt._modified || rt.created || 0);
      if (lt.title !== rt.title || lt.notes !== rt.notes || lt.time !== rt.time ||
          lt.type !== rt.type || lt.folderId !== rt.folderId || lt.sortOrder !== rt.sortOrder) {
        const lmod = lt._modified || lt.created || 0;
        const rmod = rt._modified || rt.created || 0;
        const source = lmod >= rmod ? lt : rt;
        m.title = source.title;
        m.notes = source.notes;
        m.time = source.time;
        m.type = source.type;
        if (source.folderId) m.folderId = source.folderId; else delete m.folderId;
        if (source.sortOrder != null) m.sortOrder = source.sortOrder; else delete m.sortOrder;
        if (source.date) m.date = source.date; else delete m.date;
        if (source.startDate) m.startDate = source.startDate; else delete m.startDate;
        if (source.endDate !== undefined) m.endDate = source.endDate; else delete m.endDate;
        if (source.rangeCount) m.rangeCount = source.rangeCount; else delete m.rangeCount;
        if (source.recurrence) m.recurrence = source.recurrence; else delete m.recurrence;
      }
      merged.set(lt.id, m);
    });

    return [...merged.values()];
  }

  static _mergeFolders(localFolders, remoteFolders) {
    const merged = new Map();
    remoteFolders.forEach(f => { if (f) merged.set(f.id, { ...f }); });
    localFolders.forEach(f => { if (f && !merged.has(f.id)) merged.set(f.id, { ...f }); });
    return [...merged.values()];
  }

  async _resolveDirtyConflict(remoteData) {
    const decrypted = remoteData.encrypted ? await Crypto.decrypt(remoteData.encrypted, this.fullSyncKey) : null;
    this._warn('dirtyConflict', `local v${this.version} dirty, remote v${remoteData.version}, remote todos=${(decrypted?.todos || []).length}`);

    return new Promise(resolve => {
      this._dirtyConflictResolve = async () => { this._dirty = false; await this._applyRemote(remoteData); resolve(); };
      Modal.confirm(
        L('versionConflict'),
        L('versionConflictMessage'),
        [
          { label: L('dataDiscard'), cls: 'btn-outline', action: async () => {
            this._dirtyConflictResolve = null;
            this._log('dirtyConflict', 'user chose: discard local');
            this._dirty = false;
            await this._applyRemote(remoteData);
            resolve();
          }},
          { label: L('addExisting'), cls: 'btn-outline', action: async () => {
            this._dirtyConflictResolve = null;
            this._log('dirtyConflict', 'user chose: merge');
            if (decrypted) {
              const existingIds = new Set(Store.todos.map(t => t.id));
              Store.todos = [...Store.todos, ...(decrypted.todos || []).filter(t => !existingIds.has(t.id))];
              if (decrypted.folders) {
                const existingFolderIds = new Set(Store.folders.map(f => f.id));
                Store.folders = [...Store.folders, ...(decrypted.folders || []).filter(f => !existingFolderIds.has(f.id))];
              }
              if (decrypted.folder) {
                const idx = Store.folders.findIndex(f => f.id === this.id);
                if (idx >= 0) {
                  Store.folders[idx] = { ...Store.folders[idx], name: decrypted.folder.name, color: decrypted.folder.color };
                } else if (this.id !== 'main') {
                  Store.folders.push({ ...decrypted.folder, id: this.id });
                }
              }
              try { localStorage.setItem('todo_data', LZString.compressToUTF16(JSON.stringify(Store.todos))); } catch (e) {}
              try { localStorage.setItem('todo_folders', JSON.stringify(Store.folders)); } catch (e) {}
            }
            this.version = remoteData.version;
            this._saveState();
            this._dirty = false;
            this._onRender();
            await this.push();
            resolve();
          }},
          { label: L('dataOverwrite'), cls: 'btn-danger', action: async () => {
            this._dirtyConflictResolve = null;
            this._log('dirtyConflict', 'user chose: overwrite remote');
            this.version = remoteData.version;
            this._saveState();
            this._dirty = false;
            await this.push();
            resolve();
          }}
        ]
      );
    });
  }

  _getPollInterval() {
    const idle = Date.now() - this._lastActivity;
    if (this._pollErrors >= 5) return Math.min(300000, 10000 * Math.pow(2, this._pollErrors - 4));
    if (idle > 3600000) return 1800000;
    if (idle > 600000) return 120000;
    if (idle > 120000) return 30000;
    return 5000;
  }

  _startPoll() {
    this._stopPoll();
    if (!this.enabled) return;
    const interval = this._getPollInterval();
    this._log('poll', `next poll in ${(interval / 1000).toFixed(0)}s`);
    this._pollTimer = setTimeout(() => this._poll(), interval);
  }

  _stopPoll() {
    clearTimeout(this._pollTimer);
    if (this._abortCtrl) { this._abortCtrl.abort(); this._abortCtrl = null; }
  }

  async _poll(immediate) {
    this._pollTimer = null;
    if (!this.enabled || !this.serverId) return;
    const timeout = immediate ? 0 : 10;
    this._log('poll', `${immediate ? 'immediate' : 'long-poll'} v${this.version}, dirty=${this._dirty}`);
    try {
      this._abortCtrl = new AbortController();
      const clientTimeout = setTimeout(() => this._abortCtrl?.abort(), 25000);
      const res = await fetch('sync.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'poll', id: this.serverId, since: this.version, timeout }),
        signal: this._abortCtrl.signal
      });
      clearTimeout(clientTimeout);
      const data = await res.json();
      if (data.ok && data.changed && data.version > this.version) {
        this._log('poll', `remote changed v${this.version} → v${data.version}`);
        if (this._dirty) await this._resolveDirtyConflict(data);
        else await this._applyRemote(data);
      } else if (data.ok && this._dirty) {
        this._log('poll', 'no remote change, pushing dirty');
        await this.push();
      } else {
        this._log('poll', 'no changes');
      }
      this._pollErrors = 0;
    } catch (e) {
      if (e.name !== 'AbortError') { this._pollErrors++; this._warn('poll', `error #${this._pollErrors}`, e.message); }
    }
    this._abortCtrl = null;
    if (this.enabled && !this._pollTimer) this._startPoll();
  }

  getShareUrl() {
    if (this.id === 'main') return location.origin + location.pathname + '#sync=' + encodeURIComponent(this.fullSyncKey);
    return location.origin + location.pathname + '#fsync=' + encodeURIComponent(this.id) + ':' + encodeURIComponent(this.fullSyncKey);
  }

  getQrUrl() { return qrDataUrl(this.getShareUrl(), 6, 1); }

  copyUrl() {
    navigator.clipboard.writeText(this.getShareUrl()).then(() => {
      const t = document.getElementById('syncToast');
      t.textContent = L('syncCopied');
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 1500);
    }).catch(() => {});
  }

  async deleteServer() {
    if (!this.serverId) return;
    try {
      await fetch('sync.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'delete', id: this.serverId, deleteToken: await Crypto.getDeleteToken(this.fullSyncKey) })
      });
    } catch (e) {}
    this.stop();
  }

  async downloadServer() {
    if (!this.serverId) return;
    try {
      const res = await fetch('sync.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'pull', id: this.serverId })
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sync-data-${this.serverId.slice(0, 8)}.json`;
      a.click();
    } catch (e) {}
  }
}

const Sync = {
  main: null,
  folderChannels: {},
  _dirtyConflictResolve: null,
  _lastKnownRemoteFolderIds: null,

  get enabled() { return this.main?.enabled || false; },
  get fullSyncKey() { return this.main?.fullSyncKey || null; },
  get serverId() { return this.main?.serverId || null; },
  get version() { return this.main?.version || 0; },

  isFolderShared(folderId) {
    if (this.folderChannels[folderId]?.enabled) return true;
    try { return !!JSON.parse(localStorage.getItem('todo_sync_folder_' + folderId))?.fullSyncKey; } catch (e) { return false; }
  },

  _allChannels() {
    const channels = [];
    if (this.main?.enabled) channels.push(this.main);
    Object.values(this.folderChannels).forEach(c => { if (c.enabled) channels.push(c); });
    return channels;
  },

  enableDebug() {
    if (this.main) this.main._debug = true;
    Object.values(this.folderChannels).forEach(c => c._debug = true);
    console.log('%c[Sync] Debug enabled. Full state:', 'color:#10B981;font-weight:bold');
    console.table({
      mainEnabled: this.main?.enabled || false,
      mainVersion: this.main?.version || 0,
      mainDirty: this.main?._dirty || false,
      mainServerId: this.main?.serverId?.slice(0, 12) + '…' || '-',
      mainPushing: this.main?._pushing || false,
      mainPollErrors: this.main?._pollErrors || 0,
      mainPollInterval: this.main ? (this.main._getPollInterval() / 1000).toFixed(0) + 's' : '-',
      mainLastKnownIds: this.main?._lastKnownRemoteIds?.size ?? 'null',
      online: navigator.onLine,
      todosCount: Store.todos.length,
      foldersCount: Store.folders.length,
      noSyncFolders: Store.noSyncFolders?.length || 0,
    });
    const fcs = Object.entries(this.folderChannels);
    if (fcs.length) {
      console.log('%c[Sync] Folder channels:', 'color:#A78BFA;font-weight:bold');
      const table = {};
      fcs.forEach(([fid, ch]) => {
        const f = Folders.getById(fid);
        table[f?.name || fid.slice(0, 8)] = {
          enabled: ch.enabled,
          version: ch.version,
          dirty: ch._dirty,
          pushing: ch._pushing,
          pollErrors: ch._pollErrors,
          lastKnownIds: ch._lastKnownRemoteIds?.size ?? 'null',
          todosInFolder: Store.todos.filter(t => t.folderId === fid).length,
        };
      });
      console.table(table);
    }
  },

  disableDebug() {
    if (this.main) this.main._debug = false;
    Object.values(this.folderChannels).forEach(c => c._debug = false);
    console.log('%c[Sync] Debug disabled', 'color:#EF4444;font-weight:bold');
  },

  _getMainPayload() {
    const noSync = new Set(Store.noSyncFolders || []);
    return {
      todos: Store.todos.filter(t => !t.folderId || !noSync.has(t.folderId)),
      folders: Store.folders.filter(f => !noSync.has(f.id)).map(f => {
        const ch = this.folderChannels[f.id];
        if (ch?.enabled && ch.fullSyncKey) return { ...f, _syncKey: ch.fullSyncKey };
        return { ...f };
      })
    };
  },

  _applyMainPayload(data) {
    const noSync = new Set(Store.noSyncFolders || []);
    const localNoSyncTodos = Store.todos.filter(t => t.folderId && noSync.has(t.folderId));
    const localNoSyncFolders = Store.folders.filter(f => noSync.has(f.id));
    if (data.todos) Store.todos = [...data.todos.filter(t => !t.folderId || !noSync.has(t.folderId)), ...localNoSyncTodos];
    const folderSyncKeys = {};
    if (data.folders) {
      const remoteFolderIds = new Set(data.folders.map(f => f.id));
      const localOnlyFolders = Store.folders.filter(f =>
        !noSync.has(f.id) &&
        !remoteFolderIds.has(f.id) &&
        (!this._lastKnownRemoteFolderIds || !this._lastKnownRemoteFolderIds.has(f.id))
      );
      Store.folders = [...data.folders.filter(f => !noSync.has(f.id)), ...localNoSyncFolders, ...localOnlyFolders];
      this._lastKnownRemoteFolderIds = remoteFolderIds;
      data.folders.forEach(f => { if (f._syncKey) folderSyncKeys[f.id] = f._syncKey; });
      Store.folders.forEach(f => { delete f._syncKey; });
    }
    if (Store.hiddenFolders) {
      Store.hiddenFolders = Store.hiddenFolders.filter(id => Store.folders.some(f => f.id === id));
      Store.saveHidden();
    }
    if (Store.isolatedFolders) {
      Store.isolatedFolders = Store.isolatedFolders.filter(id => Store.folders.some(f => f.id === id));
      Store.saveIsolated();
    }
    if (Store.settings.activeFolder && !Store.folders.some(f => f.id === Store.settings.activeFolder)) {
      Store.settings.activeFolder = null;
      Store.saveSettings();
    }
    try { localStorage.setItem('todo_data', LZString.compressToUTF16(JSON.stringify(Store.todos))); } catch (e) {}
    try { localStorage.setItem('todo_folders', JSON.stringify(Store.folders)); } catch (e) {}
    Object.entries(folderSyncKeys).forEach(([fid, key]) => {
      if (!this.folderChannels[fid]?.enabled) {
        const ch = this._createFolderChannel(fid);
        ch.start(key);
      }
    });
    Object.keys(this.folderChannels).forEach(fid => {
      if (this.folderChannels[fid]?.enabled && !folderSyncKeys[fid] && data.folders) {
        const inRemote = data.folders.some(f => f.id === fid);
        if (inRemote) {
          this.folderChannels[fid].stop();
          delete this.folderChannels[fid];
        }
      }
    });
  },

  _getFolderPayload(folderId) {
    return {
      folder: Store.folders.find(f => f.id === folderId) || null,
      todos: Store.todos.filter(t => t.folderId === folderId)
    };
  },

  _applyFolderPayload(folderId, data) {
    Store.todos = [
      ...Store.todos.filter(t => t.folderId !== folderId),
      ...(data.todos || []).map(t => ({ ...t, folderId }))
    ];
    if (data.folder) {
      const idx = Store.folders.findIndex(f => f.id === folderId);
      if (idx >= 0) {
        Store.folders[idx] = { ...Store.folders[idx], name: data.folder.name, color: data.folder.color };
      } else {
        Store.folders.push({ ...data.folder, id: folderId });
      }
    }
    try { localStorage.setItem('todo_data', LZString.compressToUTF16(JSON.stringify(Store.todos))); } catch (e) {}
    try { localStorage.setItem('todo_folders', JSON.stringify(Store.folders)); } catch (e) {}
  },

  _createFolderChannel(folderId) {
    if (this.folderChannels[folderId]) return this.folderChannels[folderId];
    const channel = new SyncChannel({
      id: folderId,
      getPayload: () => this._getFolderPayload(folderId),
      applyPayload: (data) => this._applyFolderPayload(folderId, data),
      onRender: () => App.render()
    });
    this.folderChannels[folderId] = channel;
    return channel;
  },

  async init() {
    this.main = new SyncChannel({
      id: 'main',
      getPayload: () => this._getMainPayload(),
      applyPayload: (data) => this._applyMainPayload(data),
      onRender: () => App.render(),
      onPushSuccess: (payload) => { this._lastKnownRemoteFolderIds = new Set((payload.folders || []).map(f => f.id)); }
    });

    const mainState = this.main.loadState();
    if (mainState?.fullSyncKey) {
      await this.main.start(mainState.fullSyncKey, mainState.version, mainState.dirty);
    }

    Store.folders.forEach(f => {
      const key = `todo_sync_folder_${f.id}`;
      try {
        const s = JSON.parse(localStorage.getItem(key));
        if (s?.fullSyncKey) {
          const ch = this._createFolderChannel(f.id);
          ch.start(s.fullSyncKey, s.version, s.dirty);
        }
      } catch (e) {}
    });

    const hash = location.hash;
    const syncMatch = hash.match(/^#sync=([a-zA-Z0-9_-]{32,128})$/);
    if (syncMatch) {
      const syncParam = syncMatch[1];
      history.replaceState(null, '', location.pathname + location.search);
      if (syncParam !== this.main?.fullSyncKey) { await this._confirmJoin(syncParam); return; }
    }

    const folderSyncMatch = hash.match(/^#fsync=([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]{32,128})$/);
    if (folderSyncMatch) {
      const [, folderId, syncKey] = folderSyncMatch;
      history.replaceState(null, '', location.pathname + location.search);
      await this._confirmJoinFolder(folderId, syncKey);
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this._allChannels().forEach(c => { c._stopPoll(); c._poll(true); });
      } else {
        this._allChannels().forEach(c => c._stopPoll());
      }
    });

    window.addEventListener('online', () => {
      setTimeout(() => {
        this._allChannels().forEach(c => { c._stopPoll(); c._poll(true); });
        if (document.getElementById('settingsModal').classList.contains('open')) Settings.render();
      }, 1500);
    });

    const resetActivity = () => {
      this._allChannels().forEach(c => { c._lastActivity = Date.now(); c._pollErrors = 0; });
    };
    document.addEventListener('click', resetActivity);
    document.addEventListener('keydown', resetActivity);
    document.addEventListener('touchstart', resetActivity);

    window.addEventListener('offline', () => {
      this._allChannels().forEach(c => c._stopPoll());
      if (document.getElementById('settingsModal').classList.contains('open')) Settings.render();
    });
  },

  onLocalChange(affectedFolderIds) {
    if (this.main?.enabled && !this.main._applying) {
      this.main.onLocalChange();
    }
    if (affectedFolderIds) {
      affectedFolderIds.forEach(fid => {
        if (this.folderChannels[fid]?.enabled && !this.folderChannels[fid]._applying) {
          this.folderChannels[fid].onLocalChange();
        }
      });
    } else {
      Object.values(this.folderChannels).forEach(c => {
        if (c.enabled && !c._applying) c.onLocalChange();
      });
    }
  },

  async generate() {
    const array = new Uint8Array(48);
    window.crypto.getRandomValues(array);
    const key = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    await this.main.start(key);
    await this.main.push(true);
    if (document.getElementById('settingsModal').classList.contains('open')) Settings.render();
  },

  async join(key) {
    key = (key || '').trim();
    if (!key || !/^[a-zA-Z0-9_-]{32,128}$/.test(key)) return;
    await this._confirmJoin(key);
  },

  async _confirmJoin(fullKey) {
    let remote;
    try {
      const serverId = await Crypto.getServerId(fullKey);
      const res = await fetch('sync.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'pull', id: serverId }) });
      remote = await res.json();
    } catch (e) { return; }
    if (!remote?.ok) return;

    let decryptedData = { todos: [], folders: [] };
    if (remote.encrypted) {
      const decrypted = await Crypto.decrypt(remote.encrypted, fullKey);
      if (decrypted) { decryptedData = { todos: decrypted.todos || [], folders: decrypted.folders || [] }; }
      else { return; }
    }

    const remoteCount = decryptedData.todos.length;
    const localCount = Store.todos.length;

    if (localCount === 0) { await this._finishJoin(fullKey, { ...remote, ...decryptedData }, 'overwrite'); return; }

    Modal.confirm(L('syncJoinTitle'), LF('syncJoinMsg', remoteCount, localCount), [
      { label: L('cancel'), cls: 'btn-outline', action() {} },
      { label: L('addExisting'), cls: 'btn-outline', action: async () => await Sync._finishJoin(fullKey, { ...remote, ...decryptedData }, 'merge') },
      { label: L('overwrite'), cls: 'btn-danger', action: async () => await Sync._finishJoin(fullKey, { ...remote, ...decryptedData }, 'overwrite') }
    ]);
  },

  async _finishJoin(fullKey, remote, mode) {
    if (mode === 'overwrite') {
      Store.todos = remote.todos || [];
      Store.folders = remote.folders || [];
    } else {
      const existingIds = new Set(Store.todos.map(t => t.id));
      Store.todos = [...Store.todos, ...(remote.todos || []).filter(t => !existingIds.has(t.id))];
      const existingFolderIds = new Set(Store.folders.map(f => f.id));
      Store.folders = [...Store.folders, ...(remote.folders || []).filter(f => !existingFolderIds.has(f.id))];
    }
    this._applyMainPayload({ todos: Store.todos, folders: Store.folders });
    await this.main.start(fullKey, remote.version || 0);
    App.render();
    if (mode === 'merge') await this.main.push(true);
    if (document.getElementById('settingsModal').classList.contains('open')) Settings.render();
  },

  stop() {
    if (this.main) this.main.stop();
    if (document.getElementById('settingsModal').classList.contains('open')) Settings.render();
  },

  async generateForFolder(folderId) {
    if (Folders.isNoSync(folderId)) return;
    const channel = this._createFolderChannel(folderId);
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const key = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    await channel.start(key);
    await channel.push(true);
    if (document.getElementById('settingsModal').classList.contains('open')) Settings.render();
  },

  async joinFolder(folderId, fullKey) {
    fullKey = (fullKey || '').trim();
    if (!fullKey || !/^[a-zA-Z0-9_-]{32,128}$/.test(fullKey)) return;
    if (Folders.isNoSync(folderId)) return;
    await this._confirmJoinFolder(folderId, fullKey);
  },

  async _confirmJoinFolder(folderId, fullKey) {
    let remote;
    try {
      const serverId = await Crypto.getServerId(fullKey);
      const res = await fetch('sync.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'pull', id: serverId }) });
      remote = await res.json();
    } catch (e) { return; }
    if (!remote?.ok) return;

    let decryptedData = { todos: [], folder: null };
    if (remote.encrypted) {
      const decrypted = await Crypto.decrypt(remote.encrypted, fullKey);
      if (decrypted) { decryptedData = { todos: decrypted.todos || [], folder: decrypted.folder || null }; }
      else { return; }
    }

    if (!Store.folders.find(f => f.id === folderId)) {
      const remoteName = decryptedData.folder?.name || 'Shared';
      const remoteColor = decryptedData.folder?.color || FOLDER_COLORS[Store.folders.length % FOLDER_COLORS.length];
      Store.folders.push({ id: folderId, name: remoteName, color: remoteColor });
      try { localStorage.setItem('todo_folders', JSON.stringify(Store.folders)); } catch (e) {}
    }

    const remoteCount = decryptedData.todos.length;
    const localCount = Store.todos.filter(t => t.folderId === folderId).length;

    if (localCount === 0) {
      await this._finishJoinFolder(folderId, fullKey, remote, decryptedData, 'overwrite');
      return;
    }

    Modal.confirm(L('folderSyncJoinTitle'), LF('folderSyncJoinMsg', remoteCount, localCount), [
      { label: L('cancel'), cls: 'btn-outline', action() {} },
      { label: L('addExisting'), cls: 'btn-outline', action: async () => await Sync._finishJoinFolder(folderId, fullKey, remote, decryptedData, 'merge') },
      { label: L('overwrite'), cls: 'btn-danger', action: async () => await Sync._finishJoinFolder(folderId, fullKey, remote, decryptedData, 'overwrite') }
    ]);
  },

  async _finishJoinFolder(folderId, fullKey, remote, decryptedData, mode) {
    if (mode === 'overwrite') {
      Store.todos = [
        ...Store.todos.filter(t => t.folderId !== folderId),
        ...(decryptedData.todos || []).map(t => ({ ...t, folderId }))
      ];
    } else {
      const existingIds = new Set(Store.todos.map(t => t.id));
      Store.todos = [
        ...Store.todos,
        ...(decryptedData.todos || []).filter(t => !existingIds.has(t.id)).map(t => ({ ...t, folderId }))
      ];
    }
    if (decryptedData.folder) {
      const idx = Store.folders.findIndex(f => f.id === folderId);
      if (idx >= 0) {
        Store.folders[idx] = { ...Store.folders[idx], name: decryptedData.folder.name, color: decryptedData.folder.color };
      }
    }
    try { localStorage.setItem('todo_data', LZString.compressToUTF16(JSON.stringify(Store.todos))); } catch (e) {}
    try { localStorage.setItem('todo_folders', JSON.stringify(Store.folders)); } catch (e) {}

    const channel = this._createFolderChannel(folderId);
    await channel.start(fullKey, remote.version || 0);
    App.render();
    if (mode === 'merge') await channel.push(true);
    if (document.getElementById('settingsModal').classList.contains('open')) Settings.render();
  },

  stopFolder(folderId) {
    if (this.folderChannels[folderId]) {
      this.folderChannels[folderId].stop();
      delete this.folderChannels[folderId];
    }
    if (document.getElementById('settingsModal').classList.contains('open')) Settings.render();
  },

  async deleteFolderServer(folderId) {
    if (!this.folderChannels[folderId]) return;
    await this.folderChannels[folderId].deleteServer();
    delete this.folderChannels[folderId];
    if (document.getElementById('settingsModal').classList.contains('open')) Settings.render();
  },

  getShareUrl() { return this.main?.getShareUrl() || ''; },
  getQrUrl() { return this.main?.getQrUrl() || ''; },
  copyUrl() { if (this.main) this.main.copyUrl(); },

  async deleteServer() {
    if (!this.main?.serverId) return;
    Modal.confirm(L('syncDeleteTitle'), L('syncDeleteMsg'), [
      { label: L('cancel'), cls: 'btn-outline', action() {} },
      { label: L('delete'), cls: 'btn-danger', action: async () => {
        await Sync.main.deleteServer();
        if (document.getElementById('settingsModal').classList.contains('open')) Settings.render();
      }}
    ]);
  },

  async downloadServer() {
    if (this.main) await this.main.downloadServer();
  },

  showPrivacy() {
    const body = document.getElementById('detailModalBody');
    document.getElementById('detailModalTitle').textContent = L('syncPrivacyTitle');
    body.innerHTML = `
      <div class="privacy-body">
        <h4>${L('syncPrivacyH1')}</h4>
        <p class="intro">${L('syncPrivacyWhat')}</p>
        <ul>
          <li>${L('syncPrivacyItem1')}</li>
          <li>${L('syncPrivacyItem2')}</li>
          <li>${L('syncPrivacyItem3')}</li>
        </ul>
        <h4>${L('syncPrivacyH2')}</h4>
        <p>${L('syncPrivacyEncrypt')}</p>
        <h4>${L('syncPrivacyH3')}</h4>
        <p>${L('syncPrivacyHow')}</p>
        <h4>${L('syncPrivacyH4')}</h4>
        <p>${L('syncPrivacyRights')}</p>
        <h4>${L('syncPrivacyH6')}</h4>
        <p>${L('syncPrivacyFolder')}</p>
        <h4>${L('syncPrivacyH5')}</h4>
        <p>${L('syncPrivacyNo')}</p>
      </div>
      ${Sync.enabled ? `<div class="detail-actions mt-sm">
        <button class="btn btn-outline" onclick="Sync.downloadServer()">${L('syncDownloadServer')}</button>
        <button class="btn btn-danger" onclick="Modal.close('detail');Sync.deleteServer()">${L('syncDeleteServer')}</button>
      </div>` : ''}`;
    Modal.open('detail');
  }
};

const App = {
  currentDate: new Date(),
  editingId: null,
  showSkipped: false,

  init() {
    Store.load();
    Store.loadHidden();
    Store.loadIsolated();
    Store.loadNoSync();
    this.applyTheme();
    this.render();
    this._bindKeys();
    Sync.init().then(() => {
      if (document.getElementById('settingsModal').classList.contains('open')) Settings.render();
    });
    DragSort.init();
    Welcome.init();
  },

  applyTheme() {
    document.documentElement.setAttribute('data-theme', Store.settings.theme);
    document.documentElement.lang = Store.settings.lang;
    const c = Store.settings.accent || '#76b852';
    const [r, g, b] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const dk = '#' + [r, g, b].map(v => Math.max(0, v - 20).toString(16).padStart(2, '0')).join('');
    const s = document.documentElement.style;
    s.setProperty('--accent', c);
    s.setProperty('--accent-2', dk);
    s.setProperty('--accent-bg', `rgba(${r},${g},${b},0.08)`);
  },

  setFolder(val) {
    Store.settings.activeFolder = val || null;
    Store.saveSettings();
    this.render();
  },
  
  toggleShowSkipped(e) {
    if (e) e.stopPropagation();
    this.showSkipped = !this.showSkipped;
    this.render();
  },

  _renderFolderDropdown() {
    const wrap = document.getElementById('folderWrap');
    const btn = document.getElementById('folderBtn');
    const menu = document.getElementById('folderMenu');
    if (!Store.folders.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    const af = Store.settings.activeFolder;
    const activeFolder = af && af !== '_none' ? Folders.getById(af) : null;
    const color = activeFolder ? activeFolder.color : af === '_none' ? 'var(--text-2)' : 'var(--text-2)';
    const strike = af === '_none' ? '<line x1="2" y1="2" x2="22" y2="22" stroke-width="2"/>' : '';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"/>${strike}</svg>`;

    const ds = Util.dateStr(App.currentDate);
    const openCount = (filter) => {
      const list = filter === '_none' ? Store.todos.filter(t => !t.folderId)
        : filter ? Store.todos.filter(t => t.folderId === filter)
        : Store.todos.filter(t => !t.folderId || (!Store.hiddenFolders.includes(t.folderId) && !Store.isolatedFolders.includes(t.folderId)));
      return list.filter(t => Todos.isVisible(t, ds) && !Todos.isDone(t, ds) && !Todos.isSkipped(t, ds)).length;
    };
    const badge = (n) => n > 0 ? `<span class="folder-menu-count">${n}</span>` : '';

    let html = `<button class="folder-menu-item ${!af ? 'active' : ''}" onclick="App.setFolder('');App.closeFolderMenu()">${L('allFolders')}${badge(openCount(null))}</button>`;
    html += `<button class="folder-menu-item ${af === '_none' ? 'active' : ''}" onclick="App.setFolder('_none');App.closeFolderMenu()">${L('noFolder')}${badge(openCount('_none'))}</button>`;
    const visibleFolders = Store.folders.filter(f => !Folders.isHidden(f.id));
    const normalFolders = visibleFolders.filter(f => !Folders.isIsolated(f.id));
    const isolatedFolders = visibleFolders.filter(f => Folders.isIsolated(f.id));
    const renderFolderItem = (f) => {
      const isShared = Sync.isFolderShared(f.id);
      const dot = isShared
        ? `<svg class="folder-dot-shared" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${f.color}" stroke-width="3" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
        : `<span class="folder-dot" style="background:${f.color}"></span>`;
      return `<button class="folder-menu-item ${af === f.id ? 'active' : ''}" onclick="App.setFolder('${f.id}');App.closeFolderMenu()">${dot}<span class="folder-menu-name">${Util.esc(f.name)}</span>${badge(openCount(f.id))}</button>`;
    };
    normalFolders.forEach(f => { html += renderFolderItem(f); });
    if (isolatedFolders.length) {
      html += `<div class="folder-menu-divider"><span>${L('isolated').toLowerCase()}</span></div>`;
      isolatedFolders.forEach(f => { html += renderFolderItem(f); });
    }
    menu.innerHTML = html;
  },
  
  _renderFolderBadge(ds) {
    const af = Store.settings.activeFolder;
    const badge = document.getElementById('folderBadge');
    if (!badge) return;
    if (!af || !Store.folders.length) { badge.style.display = 'none'; return; }

    const hidden = Store.hiddenFolders;
    const isolated = Store.isolatedFolders;

    const allVisible = Store.todos.filter(t => {
      if (!t.folderId) return true;
      if (hidden.includes(t.folderId)) return false;
      if (isolated.includes(t.folderId)) return false;
      return true;
    });

    const shownIds = new Set(
      (af === '_none'
        ? Store.todos.filter(t => !t.folderId)
        : Store.todos.filter(t => t.folderId === af)
      ).map(t => t.id)
    );

    const otherOpen = allVisible.filter(t =>
      !shownIds.has(t.id) && Todos.isVisible(t, ds) && !Todos.isDone(t, ds) && !Todos.isSkipped(t, ds)
    ).length;

    if (otherOpen > 0) {
      badge.textContent = otherOpen;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  },

  toggleFolderMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('folderMenu');
    const isOpen = menu.classList.toggle('open');
    if (isOpen) {
      const close = (ev) => { if (!menu.contains(ev.target)) { menu.classList.remove('open'); document.removeEventListener('click', close); } };
      setTimeout(() => document.addEventListener('click', close), 0);
    }
  },

  closeFolderMenu() { document.getElementById('folderMenu').classList.remove('open'); },

  render() {
    const ds = Util.dateStr(this.currentDate);
    const af = Store.settings.activeFolder;

    const hidden = Store.hiddenFolders;
    const isolated = Store.isolatedFolders;
    const folderFiltered = af === '_none'
      ? Store.todos.filter(t => !t.folderId)
      : af
        ? Store.todos.filter(t => t.folderId === af)
        : Store.todos.filter(t => !t.folderId || (!hidden.includes(t.folderId) && !isolated.includes(t.folderId)));

    const visible = folderFiltered.filter(t => Todos.isVisible(t, ds));
    const skipped = visible.filter(t => Todos.isSkipped(t, ds));
    const active = visible.filter(t => !Todos.isDone(t, ds) && !Todos.isSkipped(t, ds));
    const done = visible.filter(t => Todos.isDone(t, ds) && !Todos.isSkipped(t, ds));
    const shownSkipped = this.showSkipped ? skipped : [];

    const sort = (a, b) => {
      const aHas = a.sortOrder != null;
      const bHas = b.sortOrder != null;
      if (aHas && bHas) return a.sortOrder - b.sortOrder;
      if (aHas) return -1;
      if (bHas) return 1;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return a.title.localeCompare(b.title);
    };
    active.sort(sort);
    done.sort(sort);

    const totalScheduled = folderFiltered.filter(t => Todos.isOnDate(t, ds)).length;

    const d = this.currentDate;
    document.getElementById('dateMain').textContent = `${L('monthNames')[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
    const dateEl = document.getElementById('dateDisplay');
    requestAnimationFrame(() => {
      const main = document.getElementById('dateMain');
      if (main && main.scrollWidth > dateEl.clientWidth - 8) {
        const scale = (dateEl.clientWidth - 8) / main.scrollWidth;
        main.style.transform = `scaleX(${Math.max(scale, 0.7)})`;
        main.style.transformOrigin = 'center';
        main.style.display = 'inline-block';
      } else if (main) {
        main.style.transform = '';
      }
    });
    const sub = document.getElementById('dateSub');
    sub.textContent = L('dayFull')[d.getDay()];
    sub.classList.toggle('is-today', Util.isToday(ds));
    document.getElementById('datePicker').value = ds;
    document.getElementById('addBtnLabel').textContent = L('add');

    this._renderFolderDropdown();
    this._renderFolderBadge(ds);

    const main = document.getElementById('mainContent');

    if (totalScheduled === 0) {
      main.innerHTML = `<div class="empty-state"><div class="icon">✓</div><p>${L('noTodos')}<br>${L('enjoy')}</p></div>`;
      return;
    }

    if (visible.length === 0 || (active.length === 0 && done.length === 0 && skipped.length === 0)) {
      main.innerHTML = `<div class="empty-state"><div class="icon">✓</div><p>${L('allDone')}</p></div>`;
      return;
    }

    if (active.length === 0 && done.length === 0 && skipped.length > 0 && !this.showSkipped) {
      main.innerHTML = `<div class="empty-state"><div class="icon">✓</div><p>${L('allDone')}</p></div>`;
      return;
    }

    const checkSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
    const renderItem = (todo) => {
      const dn = Todos.isDone(todo, ds);
      const sk = Todos.isSkipped(todo, ds);
      const time = todo.time ? `<div class="todo-time">${Util.formatTime(todo.time)}</div>` : '';
      const folderColor = todo.folderId ? Folders.getColor(todo.folderId) : null;
      const borderStyle = folderColor ? `border-left:2px solid ${folderColor}` : '';

      let progress = '';
      if (Todos._isSpan(todo) && Todos.spanTarget(todo) >= 1) {
        progress = `<div class="todo-progress">${Todos.spanCompletionCount(todo, ds)}/${Todos.spanTarget(todo)}</div>`;
      } else if (todo.type === 'range' && (todo.rangeCount || 0) > 0) {
        const target = Todos.rangeTarget(todo);
        if (target > 0) progress = `<div class="todo-progress">${Todos.rangeCompletionCount(todo)}/${target}</div>`;
      }

      if (sk) {
        return `<div class="todo-item skipped" style="${borderStyle}" data-id="${Util.safeId(todo.id)}">
          <div class="todo-body" style="flex:1"><div class="todo-title">${Util.esc(todo.title)}</div></div>
          <button class="btn btn-outline btn-xs" onclick="event.stopPropagation();Todos.toggleSkip('${Util.safeId(todo.id)}','${ds}')">${L('showAgain')}</button>
        </div>`;
      }

      return `<div class="todo-item ${dn ? 'done' : ''}" style="${borderStyle}" data-id="${Util.safeId(todo.id)}" role="button" tabindex="0" aria-label="${Util.esc(todo.title)}${dn ? ' - ' + L('done') : ''}" onclick="DetailView.show('${Util.safeId(todo.id)}','${ds}')">
        <div class="todo-check-wrap" onclick="event.stopPropagation();Todos.toggleDone('${Util.safeId(todo.id)}','${ds}')">
          <div class="todo-check">${checkSvg}</div>
        </div>
        <div class="todo-body"><div class="todo-title">${Util.esc(todo.title)}</div>${time}</div>
        ${progress}
      </div>`;
    };

    const items = [...active, ...done, ...shownSkipped].map(renderItem).join('');

    const skippedToggle = skipped.length
      ? `<button class="skipped-toggle ${this.showSkipped ? 'is-on' : ''}" onclick="App.toggleShowSkipped(event)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          ${LF('nHidden', skipped.length)}
        </button>`
      : '';

    main.innerHTML = `
      <div class="day-summary">
        <span>${active.length} ${L('open')} - ${done.length} ${L('done')}</span>
        ${skippedToggle}
      </div>
      <div class="todo-list">${items}</div>`;
    requestAnimationFrame(() => DragSort.bindList());
  },

  nav(offset) { this.currentDate = new Date(this.currentDate); this.currentDate.setDate(this.currentDate.getDate() + offset); this.render(); },
  jumpTo(val) { if (val) { this.currentDate = Util.parseDate(val); this.render(); } },
  openDatePicker() {
    const el = document.getElementById('datePicker');
    if (!el) return;
    if (el.showPicker) { el.showPicker(); return; }
    el.focus();
    el.click();
  },

  openAdd(id) {
    this.editingId = id || null;
    document.getElementById('addModalTitle').textContent = id ? L('editTodo') : L('addTodo');
    AddForm.render(id ? Store.todos.find(t => t.id === id) : null);
    Modal.open('add');
  },

  _bindKeys() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const cd = document.getElementById('confirmDialog');
        if (cd.classList.contains('open')) {
          cd.classList.remove('open');
          this._allChannels().forEach(c => {
            if (c._dirtyConflictResolve) { const fn = c._dirtyConflictResolve; c._dirtyConflictResolve = null; fn(); }
          });
          return;
        }
        for (const name of ['detail', 'add', 'list', 'settings', 'welcomeModal']) {
          const el = document.getElementById(name + 'Modal');
          if (el.classList.contains('open')) { Modal.close(name); return; }
        }
      }
      if (!document.querySelector('.modal.open') && !document.querySelector('.confirm-overlay.open')) {
        if (e.key === 'ArrowLeft') this.nav(-1);
        if (e.key === 'ArrowRight') this.nav(1);
      }
    });
  },

  _allChannels() { return Sync._allChannels(); }
};

const AddForm = {
  render(existing) {
    const t = existing || {};
    const type = t.type || 'single';
    const ds = Util.dateStr(App.currentDate);
    const body = document.getElementById('addModalBody');
    const currentFolderId = t.folderId || Store.settings.activeFolder || '';

    const folderOptions = `<option value="">${L('noFolder')}</option>` +
      Store.folders.map(f => `<option value="${f.id}" ${currentFolderId === f.id ? 'selected' : ''}>${Util.esc(f.name)}</option>`).join('');

    body.innerHTML = `
      <div class="form-group">
        <label class="form-label">${L('title')}</label>
        <input class="form-input" id="f_title" placeholder="${L('titlePH')}" value="${Util.esc(t.title || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">${L('notes')}</label>
        <textarea class="form-input" id="f_notes" placeholder="${L('notesPH')}" rows="2">${Util.esc(t.notes || '')}</textarea>
      </div>
      ${Store.folders.length ? `<div class="form-group">
        <label class="form-label">${L('folder')}</label>
        <select class="form-input form-input-folder" id="f_folder">${folderOptions}</select>
      </div>` : ''}
      <div class="form-group">
        <label class="form-label">${L('schedule')}</label>
        <div class="chip-group" id="typeTabs">
          <button class="chip ${type === 'single' ? 'active' : ''}" data-type="single">${L('singleDay')}</button>
          <button class="chip ${type === 'range' ? 'active' : ''}" data-type="range">${L('dateRange')}</button>
          <button class="chip ${type === 'recurring' ? 'active' : ''}" data-type="recurring">${L('recurring')}</button>
        </div>
      </div>
      <div id="scheduleFields"></div>
      <div class="form-group">
        <label class="form-label">${L('dueTime')}</label>
        <input class="form-input form-input-time" type="time" id="f_time" value="${t.time || ''}">
      </div>
      <button class="btn-primary" onclick="AddForm.save()">${existing ? L('update') : L('save')}</button>
      ${existing ? `<button class="btn-delete" onclick="AddForm.confirmDelete('${t.id}')">${L('deleteTodo')}</button>` : ''}`;

    body.querySelectorAll('#typeTabs .chip').forEach(tab => {
      tab.onclick = () => {
        body.querySelectorAll('#typeTabs .chip').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        this._renderSchedule(tab.dataset.type, existing);
      };
    });

    this._renderSchedule(type, existing);
    setTimeout(() => document.getElementById('f_title').focus(), 300);
  },

  _renderSchedule(type, existing) {
    const c = document.getElementById('scheduleFields');
    const t = existing || {};
    const ds = Util.dateStr(App.currentDate);

    if (type === 'single') {
      c.innerHTML = `<div class="form-group"><label class="form-label">${L('date')}</label>
        <input class="form-input" type="date" id="f_date" value="${t.date || ds}"></div>`;
    }
    else if (type === 'range') {
      const v = t.rangeCount || 0;
      const isOpenEnd = !t.endDate && v > 0;
      c.innerHTML = `
        <div class="form-row">
          <div class="form-group"><label class="form-label">${L('start')}</label><input class="form-input" type="date" id="f_startDate" value="${t.startDate || ds}"></div>
          <div class="form-group ${isOpenEnd ? 'disabled' : ''}" id="f_endGroup"><label class="form-label">${L('end')}</label><input class="form-input" type="date" id="f_endDate" value="${isOpenEnd ? '' : (t.endDate || ds)}"></div>
        </div>
        <div class="span-count-row mb">
          <input class="form-input form-input-narrow" type="number" id="f_rangeCount" min="0" value="${v > 0 ? v : ''}" placeholder="∞" oninput="AddForm.onRangeCountChange()">
          <span class="span-count-label">× ${L('timesPerSpan')}</span>
          <button type="button" class="chip chip-sm chip-ml ${isOpenEnd ? 'active' : ''}" id="untilDoneChip" onclick="AddForm.toggleUntilDone()">${L('untilDone')}</button>
        </div>`;
    }
    else {
      const r = t.recurrence || {};
      const freq = r.frequency || 'weekly';
      c.innerHTML = `
        <div class="form-group">
          <label class="form-label">${L('frequency')}</label>
          <div class="chip-group" id="freqTabs">
            ${['daily','weekly','biweekly','monthly','yearly'].map(f =>
              `<button class="chip chip-sm ${freq === f ? 'active' : ''}" data-freq="${f}">${L(f)}</button>`
            ).join('')}
          </div>
        </div>
        <div id="freqFields"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">${L('starts')}</label><input class="form-input" type="date" id="f_recStart" value="${r.startDate || ds}"></div>
          <div class="form-group"><label class="form-label">${L('endsOpt')}</label><input class="form-input" type="date" id="f_recEnd" value="${r.endDate || ''}"></div>
        </div>`;

      c.querySelectorAll('#freqTabs .chip').forEach(tab => {
        tab.onclick = () => {
          c.querySelectorAll('#freqTabs .chip').forEach(c => c.classList.remove('active'));
          tab.classList.add('active');
          this._renderFreq(tab.dataset.freq, r);
        };
      });
      this._renderFreq(freq, r);
    }
  },

  _renderFreq(freq, r) {
    const c = document.getElementById('freqFields');
    if (!c) return;
    r = r || {};
    if (freq === 'daily') {
      c.innerHTML = `<p class="form-note">${L('repeatsDaily')}</p>`;
    }
    else if (freq === 'weekly' || freq === 'biweekly') {
      const days = r.days || [];
      const span = r.spanEnabled || false;
      const label = freq === 'biweekly' ? L('everyOtherWeek') : L('everyWeek');
      c.innerHTML = `
        <div class="form-group">
          <label class="form-label">${L('days')} (${label})</label>
          <div class="day-chips" id="dayChips" ${span ? 'style="display:none"' : ''}>
            ${[0,1,2,3,4,5,6].map(d =>
              `<button class="day-chip ${days.includes(d) ? 'active' : ''}" data-day="${d}">${L('dayNames')[d]}</button>`
            ).join('')}
          </div>
          <div class="toggle-row">
            <div class="toggle-track ${span ? 'on' : ''}" id="spanToggle" onclick="AddForm.toggleSpan()"><div class="toggle-thumb"></div></div>
            <span class="toggle-label">${L('spanMode')}</span>
          </div>
          <div id="spanFields" style="display:${span ? 'block' : 'none'}">
            <div class="span-selects">
              <select class="form-input" id="f_spanStart">${[1,2,3,4,5,6,0].map(d => `<option value="${d}" ${r.spanStart === d ? 'selected' : ''}>${L('dayFull')[d]}</option>`).join('')}</select>
              <span>${L('to')}</span>
              <select class="form-input" id="f_spanEnd">${[1,2,3,4,5,6,0].map(d => `<option value="${d}" ${r.spanEnd === d ? 'selected' : ''}>${L('dayFull')[d]}</option>`).join('')}</select>
            </div>
            <div class="span-count-row mt">
              <input class="form-input" type="number" id="f_spanCount" min="1" max="7" value="${Math.max(1, parseInt(r.spanCount || 1))}">
              <span class="span-count-label">× ${L('timesPerSpan')}</span>
            </div>
          </div>
        </div>`;
      c.querySelectorAll('.day-chip').forEach(ch => { ch.onclick = () => ch.classList.toggle('active'); });
    }
    else if (freq === 'monthly') {
      c.innerHTML = `<div class="form-group"><label class="form-label">${L('dayOfMonth')}</label>
        <select class="form-input form-input-narrow" id="f_dayOfMonth">
          ${Array.from({length: 31}, (_, i) => i + 1).map(d => `<option value="${d}" ${r.dayOfMonth === d ? 'selected' : ''}>${ordinal(d)}</option>`).join('')}
        </select></div>`;
    }
    else if (freq === 'yearly') {
      c.innerHTML = `<div class="form-row">
        <div class="form-group"><label class="form-label">${L('month')}</label>
          <select class="form-input" id="f_yearMonth">${L('monthNames').map((m, i) => `<option value="${i}" ${r.month === i ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">${L('day')}</label>
          <select class="form-input" id="f_yearDay">${Array.from({length: 31}, (_, i) => i + 1).map(d => `<option value="${d}" ${r.dayOfMonth === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
      </div>`;
    }
  },

  toggleSpan() {
    const toggle = document.getElementById('spanToggle');
    const fields = document.getElementById('spanFields');
    const chips = document.getElementById('dayChips');
    const on = toggle.classList.toggle('on');
    fields.style.display = on ? 'block' : 'none';
    if (chips) chips.style.display = on ? 'none' : 'flex';
  },
  
  toggleUntilDone() {
    const chip = document.getElementById('untilDoneChip');
    const endGroup = document.getElementById('f_endGroup');
    const countInput = document.getElementById('f_rangeCount');
    const isActive = chip.classList.toggle('active');
    if (isActive) {
      if (!countInput.value || parseInt(countInput.value) < 1) countInput.value = 1;
      document.getElementById('f_endDate').value = '';
      endGroup.style.opacity = '0.35';
      endGroup.style.pointerEvents = 'none';
    } else {
      const ds = Util.dateStr(App.currentDate);
      const startVal = document.getElementById('f_startDate').value || ds;
      document.getElementById('f_endDate').value = startVal;
      endGroup.style.opacity = '';
      endGroup.style.pointerEvents = '';
    }
  },

  onRangeCountChange() {
    const chip = document.getElementById('untilDoneChip');
    const countInput = document.getElementById('f_rangeCount');
    const val = parseInt(countInput.value) || 0;
    if (val < 1 && chip.classList.contains('active')) {
      chip.classList.remove('active');
      const endGroup = document.getElementById('f_endGroup');
      const ds = Util.dateStr(App.currentDate);
      document.getElementById('f_endDate').value = document.getElementById('f_startDate').value || ds;
      endGroup.style.opacity = '';
      endGroup.style.pointerEvents = '';
    }
  },

  save() {
    const title = document.getElementById('f_title').value.trim();
    if (!title) { document.getElementById('f_title').focus(); return; }

    const type = document.querySelector('#typeTabs .chip.active')?.dataset.type || 'single';
    const time = document.getElementById('f_time').value || null;
    const notes = document.getElementById('f_notes').value.trim();
    const folderEl = document.getElementById('f_folder');
    const folderId = folderEl ? folderEl.value || null : null;

    let todo = App.editingId
      ? Store.todos.find(t => t.id === App.editingId)
      : { id: Util.uid(), completedDates: [], created: Date.now() };
    if (!App.editingId) Store.todos.push(todo);

    const oldFolderId = todo.folderId || null;
    Object.assign(todo, { title, notes, time, type, _modified: Date.now() });
    if (folderId) todo.folderId = folderId; else delete todo.folderId;
    delete todo.date; delete todo.startDate; delete todo.endDate; delete todo.recurrence; delete todo.rangeCount;

    if (type === 'single') {
      todo.date = document.getElementById('f_date').value;
    }
    else if (type === 'range') {
      todo.startDate = document.getElementById('f_startDate').value;
      todo.endDate = document.getElementById('f_endDate').value || null;
      todo.rangeCount = Math.max(0, parseInt(document.getElementById('f_rangeCount').value) || 0);
      if (!todo.endDate && todo.rangeCount < 1) todo.endDate = todo.startDate;
      if (todo.endDate && todo.startDate > todo.endDate) [todo.startDate, todo.endDate] = [todo.endDate, todo.startDate];
    }
    else {
      const freq = document.querySelector('#freqTabs .chip.active')?.dataset.freq || 'weekly';
      const rec = { frequency: freq, startDate: document.getElementById('f_recStart').value };
      rec.endDate = document.getElementById('f_recEnd').value || null;
      if (freq === 'weekly' || freq === 'biweekly') {
        rec.spanEnabled = document.getElementById('spanToggle')?.classList.contains('on') || false;
        if (rec.spanEnabled) {
          rec.spanStart = parseInt(document.getElementById('f_spanStart').value);
          rec.spanEnd = parseInt(document.getElementById('f_spanEnd').value);
          rec.spanCount = Math.max(1, parseInt(document.getElementById('f_spanCount').value) || 1);
          rec.days = [];
        } else {
          rec.days = [...document.querySelectorAll('.day-chip.active')].map(c => parseInt(c.dataset.day));
        }
      } else if (freq === 'monthly') {
        rec.dayOfMonth = parseInt(document.getElementById('f_dayOfMonth').value);
      } else if (freq === 'yearly') {
        rec.month = parseInt(document.getElementById('f_yearMonth').value);
        rec.dayOfMonth = parseInt(document.getElementById('f_yearDay').value);
      }
      todo.recurrence = rec;
    }

    const affected = new Set();
    if (folderId) affected.add(folderId);
    if (oldFolderId && oldFolderId !== folderId) affected.add(oldFolderId);
    Store.saveTodos(affected.size ? [...affected] : null);
    Modal.close('add');
    App.render();
  },

  confirmDelete(id) {
    Modal.confirm(L('delTitle'), L('delMsg'), [
      { label: L('cancel'), cls: 'btn-outline', action() {} },
      { label: L('delete'), cls: 'btn-danger', action() {
        const todo = Store.todos.find(t => t.id === id);
        const fid = todo?.folderId || null;
        Store.todos = Store.todos.filter(t => t.id !== id);
        Store.saveTodos(fid ? [fid] : null);
        Modal.close('add');
        App.render();
        if (document.getElementById('listModal').classList.contains('open')) ListView.render();
      }}
    ]);
  }
};

const DetailView = {
  show(id, ds) {
    const todo = Store.todos.find(t => t.id === id);
    if (!todo) return;
    const dn = Todos.isDone(todo, ds);
    const body = document.getElementById('detailModalBody');

    let html = `<div class="detail-title">${Util.esc(todo.title)}</div>`;
    if (todo.folderId) {
      const folder = Folders.getById(todo.folderId);
      if (folder) html += `<div class="detail-field"><div class="detail-field-label">${L('folder')}</div><div class="detail-field-value detail-field-value-flex"><span class="folder-dot" style="background:${folder.color}"></span>${Util.esc(folder.name)}</div></div>`;
    }
    if (todo.notes) html += `<div class="detail-field"><div class="detail-field-label">${L('notes')}</div><div class="detail-field-value">${Util.esc(todo.notes).replace(/\n/g, '<br>')}</div></div>`;
    html += `<div class="detail-field"><div class="detail-field-label">${L('schedule')}</div><div class="detail-field-value">${Todos.describe(todo)}</div></div>`;
    if (todo.time) html += `<div class="detail-field"><div class="detail-field-label">${L('dueTime')}</div><div class="detail-field-value">${Util.formatTime(todo.time)}</div></div>`;
    html += `<div class="detail-field"><div class="detail-field-label">Status</div><div class="detail-field-value">${dn ? L('completed') : L('openSt')}</div></div>`;

    const skipped = Todos.isSkipped(todo, ds);
    const onlyToday = Todos.isOnlyOnDate(todo, ds);
    html += `<div class="detail-actions">
      <button class="btn btn-outline" onclick="Modal.close('detail');Todos.toggleDone('${Util.safeId(todo.id)}','${ds}')">${dn ? L('markOpen') : L('markDone')}</button>
      ${!onlyToday ? `<button class="btn btn-outline" onclick="Modal.close('detail');Todos.toggleSkip('${Util.safeId(todo.id)}','${ds}')">${skipped ? L('showAgain') : L('notToday')}</button>` : ''}
      <button class="btn btn-outline" onclick="Modal.close('detail');App.openAdd('${Util.safeId(todo.id)}')">${L('edit')}</button>
    </div>`;

    body.innerHTML = html;
    Modal.open('detail');
  }
};

const ListView = {
  filter: 'all',
  folderFilter: null,
  searchQuery: '',

  render() {
    const body = document.getElementById('listModalBody');

    let folderBase = Store.todos;
    if (this.folderFilter) folderBase = Store.todos.filter(t => t.folderId === this.folderFilter);
    else if (this.folderFilter === '') folderBase = Store.todos.filter(t => !t.folderId);
    if (this.folderFilter === null) folderBase = folderBase.filter(t => !t.folderId || !Store.hiddenFolders.includes(t.folderId));

    let filtered = this.filter === 'all' ? folderBase
      : folderBase.filter(t => t.type === this.filter);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q)
      );
    }
    const sorted = [...filtered].sort((a, b) => (b.created || 0) - (a.created || 0));

    let html = `<div class="list-search-row" style="margin-bottom:16px">
      <input class="form-input form-input-sm" type="search" id="listSearchInput"
        placeholder="${Store.settings.lang === 'de' ? 'Suchen…' : 'Search…'}"
        value="${Util.esc(this.searchQuery)}"
        oninput="ListView.searchQuery=this.value;ListView.render()">
    </div>`;

    if (Store.folders.length) {
      html += `<div class="chip-group chip-group-bordered">
        <button class="chip chip-sm ${this.folderFilter === null ? 'active' : ''}" onclick="ListView.folderFilter=null;ListView.render()">${L('allFolders')} (${Store.todos.length})</button>
        <button class="chip chip-sm ${this.folderFilter === '' ? 'active' : ''}" onclick="ListView.folderFilter='';ListView.render()">${L('noFolder')} (${Store.todos.filter(t => !t.folderId).length})</button>
        ${Store.folders.filter(f => !Folders.isHidden(f.id)).map(f => {
          const cnt = Store.todos.filter(t => t.folderId === f.id).length;
          return `<button class="chip chip-sm ${this.folderFilter === f.id ? 'active' : ''}" onclick="ListView.folderFilter='${f.id}';ListView.render()" style="${this.folderFilter === f.id ? '' : `border-color:${f.color}40;color:${f.color}`}"><span class="folder-dot" style="background:${f.color}"></span>${Util.esc(f.name)} (${cnt})</button>`;
        }).join('')}
      </div>`;
    }

    html += `<div class="chip-group chip-group-spaced">
      ${['all','single','range','recurring'].map(f => {
        const count = f === 'all' ? folderBase.length : folderBase.filter(t => t.type === f).length;
        const label = `${f === 'all' ? L('all') : L(f === 'recurring' ? 'recurring' : f)} (${count})`;
        return `<button class="chip chip-sm ${this.filter === f ? 'active' : ''}" onclick="ListView.filter='${f}';ListView.render()">${label}</button>`;
      }).join('')}
    </div>`;

    if (!sorted.length) {
      html += `<div class="empty-state"><p>${L('noYet')}</p></div>`;
    } else {
      sorted.forEach(todo => {
        const folderColor = todo.folderId ? Folders.getColor(todo.folderId) : null;
        const borderStyle = folderColor ? `border-left:3px solid ${folderColor}` : '';
        html += `<div class="list-item" style="${borderStyle}">
          <div class="list-item-body" onclick="Modal.close('list');App.openAdd('${Util.safeId(todo.id)}')">
            <div class="list-item-title">${Util.esc(todo.title)}</div>
            <div class="list-item-sub">${Todos.describe(todo)}${todo.time ? ' - ' + Util.formatTime(todo.time) : ''}</div>
          </div>
          <div class="list-item-actions">
            <button onclick="Modal.close('list');App.openAdd('${Util.safeId(todo.id)}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="del" onclick="AddForm.confirmDelete('${Util.safeId(todo.id)}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div>
        </div>`;
      });
    }
    body.innerHTML = html;
    if (this.searchQuery) {
      const si = document.getElementById('listSearchInput');
      if (si) { si.focus(); si.selectionStart = si.selectionEnd = si.value.length; }
    }
  }
};

const ACCENT_PRESETS = ['#76b852', '#4A9EFF', '#A78BFA', '#FB923C', '#EF4444'];

const Settings = {
  _editingFolderId: null,

  _renderFolderSyncSection(f) {
    const ch = Sync.folderChannels[f.id];
    const hasSync = ch?.enabled;
    const isNoSync = Folders.isNoSync(f.id);
    if (isNoSync) return '';

    if (hasSync) {
      const qrUrl = ch.getQrUrl();
      return `<div class="subsection-divider">
        <div class="subsection-label"><span class="setting-label">${L('folderSync')}</span></div>
        <div class="sync-active-box compact">
          <div class="sync-id-row">
            <div class="sync-id-value">${Util.esc(ch.fullSyncKey)}</div>
            <button class="btn btn-outline btn-sm" onclick="Sync.folderChannels['${f.id}'].copyUrl()">
              <svg class="sync-copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
          <div class="sync-note mb-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            ${L('folderSyncNote')}
            <button class="sync-privacy-link" onclick="Sync.showPrivacy()">${L('syncPrivacy')}</button>
          </div>
          <div class="sync-qr"><img src="${qrUrl}" alt="QR"></div>
          <div class="sync-actions">
            <button class="btn btn-outline" onclick="Sync.stopFolder('${f.id}');Settings.render()">${L('folderSyncStop')}</button>
            <button class="btn btn-danger" onclick="Settings.confirmDeleteFolderSync('${f.id}')">${L('folderSyncDelete')}</button>
          </div>
        </div>
      </div>`;
    }

    return `<div class="subsection-divider">
      <div class="subsection-label-sm"><span class="setting-label">${L('folderSyncSetup')}</span></div>
      <div class="sync-setup-desc">${L('folderSyncDesc')}
        <button class="sync-privacy-link" onclick="Sync.showPrivacy()">${L('syncPrivacy')}</button>
      </div>
      <div class="sync-setup-row">
        <input class="form-input form-input-sm" id="folderSyncInput_${f.id}" placeholder="${L('syncIdPH')}">
        <button class="btn btn-outline btn-sm" onclick="Sync.joinFolder('${f.id}',document.getElementById('folderSyncInput_${f.id}').value)">${L('syncJoin')}</button>
        <button class="btn btn-outline btn-sm" onclick="Sync.generateForFolder('${f.id}')">${L('syncGenerate')}</button>
      </div>
    </div>`;
  },

  render() {
    const body = document.getElementById('settingsModalBody');
    const isDark = Store.settings.theme === 'dark';
    const isDE = Store.settings.lang === 'de';

    let foldersHtml = Store.folders.map(f => {
      const count = Folders.todosInFolder(f.id);
      const isEditing = this._editingFolderId === f.id;
      const isHidden = Folders.isHidden(f.id);
      const isIsolated = Folders.isIsolated(f.id);
      const isNoSync = Folders.isNoSync(f.id);
      const hasFolderSync = Sync.isFolderShared(f.id);
      if (isEditing) {
        return `<div class="folder-list-item editing">
          <div class="folder-dot-lg" style="background:${f.color}"></div>
          <div class="folder-list-item-body">
            <input class="form-input form-input-sm" id="folderEditName" value="${Util.esc(f.name)}" onkeydown="if(event.key==='Enter')Settings.saveEditFolder()">
          </div>
          <div class="folder-list-item-actions">
            <button onclick="Settings.saveEditFolder()" title="Save"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg></button>
            <button onclick="Settings._editingFolderId=null;Settings.render()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div class="folder-color-dots full-width">
            ${FOLDER_COLORS.map(c => `<div class="folder-color-dot ${f.color === c ? 'active' : ''}" style="background:${c}" onclick="Settings.setFolderColor('${f.id}','${c}')"></div>`).join('')}
            <input type="color" class="color-native" value="${f.color}" onchange="Settings.setFolderColor('${f.id}',this.value)" title="${L('custom')}">
          </div>
          <div class="folder-edit-options">
            <div class="toggle-row">
              <div class="toggle-track ${isHidden ? 'on' : ''}" onclick="Folders.toggleHidden('${f.id}');Settings.render();App.render()"><div class="toggle-thumb"></div></div>
              <div><span class="toggle-label">${L('hide')}</span><div class="toggle-desc">${L('hideDesc')}</div></div>
            </div>
            <div class="toggle-row">
              <div class="toggle-track ${isIsolated ? 'on' : ''}" onclick="Folders.toggleIsolated('${f.id}');Settings.render();App.render()"><div class="toggle-thumb"></div></div>
              <div><span class="toggle-label">${L('isolated')}</span><div class="toggle-desc">${L('isolatedDesc')}</div></div>
            </div>
            ${Sync.enabled ? `<div class="toggle-row">
              <div class="toggle-track ${isNoSync ? 'on' : ''} ${hasFolderSync ? 'disabled' : ''}" ${hasFolderSync ? '' : 'onclick="Settings.toggleNoSync(\'' + f.id + '\')"'}><div class="toggle-thumb"></div></div>
              <div><span class="toggle-label">${L('noSyncFolder')}</span><div class="toggle-desc">${L('noSyncDesc')}</div></div>
            </div>` : ''}
            ${this._renderFolderSyncSection(f)}
            <button class="btn btn-danger btn-folder-delete" onclick="Settings.confirmDeleteFolder('${f.id}')">${L('deleteFolder')}</button>
          </div>
        </div>`;
      }
      const tags = [isHidden ? L('hide') : '', isIsolated ? L('isolated') : '', isNoSync ? L('noSyncFolder') : '', hasFolderSync ? L('folderSync') : ''].filter(Boolean).join(', ');
      return `<div class="folder-list-item ${isHidden ? 'dimmed' : ''}" data-folder-id="${f.id}">
        <div class="folder-dot-lg" style="background:${f.color}"></div>
        <div class="folder-list-item-body">
          <div class="folder-list-item-name">${Util.esc(f.name)}</div>
          <div class="folder-list-item-count">${count} todo${count !== 1 ? 's' : ''}${tags ? ' · ' + tags : ''}</div>
        </div>
        <div class="folder-list-item-actions">
          <button onclick="Settings._editingFolderId='${f.id}';Settings.render()" title="${L('edit')}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        </div>
      </div>`;
    }).join('');

    let syncHtml;
    if (Sync.enabled && Sync.fullSyncKey) {
      const qrUrl = Sync.getQrUrl();
      const isOffline = !navigator.onLine;
      syncHtml = `
        ${isOffline ? `<div class="offline-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>
          ${isDE ? 'Du bist Offline. Sync erfolgt bei Internetverbindung, solange die App geöffnet ist.' : 'You are offline. Sync resumes with internet while the app is open.'}
        </div>` : ''}
        <div class="sync-active-box">
          <div class="sync-id-row">
            <div class="sync-id-value">${Util.esc(Sync.fullSyncKey)}</div>
            <button class="btn btn-outline btn-sm" onclick="Sync.copyUrl()">
              <svg class="sync-copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
          <div class="sync-note">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            ${L('syncServerNote')}
            <button class="sync-privacy-link" onclick="Sync.showPrivacy()">${L('syncPrivacy')}</button>
          </div>
          <div class="sync-qr"><img src="${qrUrl}" alt="QR"></div>
          <div class="sync-actions">
            <button class="btn btn-outline" onclick="Sync.downloadServer()">${L('syncDownloadServer')}</button>
            <button class="btn btn-outline" onclick="Sync.stop()">${L('syncStop')}</button>
          </div>
          <div class="sync-actions"><button class="btn btn-danger" onclick="Sync.deleteServer()">${L('syncDeleteServer')}</button></div>
        </div>`;
    } else {
      syncHtml = `
        <div class="sync-join-row">
          <input class="form-input" id="syncIdInput" placeholder="${L('syncIdPH')}">
          <button class="btn btn-outline" onclick="Sync.join(document.getElementById('syncIdInput').value)">${L('syncJoin')}</button>
          <button class="btn btn-outline" onclick="Sync.generate()">${L('syncGenerate')}</button>
        </div>
        <div class="sync-setup-hint">
          <button class="sync-privacy-link" onclick="Sync.showPrivacy()">${L('syncPrivacy')}</button>
        </div>`;
    }

    body.innerHTML = `
      <div class="setting-row">
        <div class="setting-info"><div class="setting-label">${L('theme')}</div><div class="setting-desc">${L('themeSub')}</div></div>
        <div class="setting-action"><div class="toggle-track ${!isDark ? 'on' : ''}" onclick="Settings.toggleTheme()"><div class="toggle-thumb"></div></div></div>
      </div>

      <div class="setting-row">
        <div class="setting-info"><div class="setting-label">${L('language')}</div><div class="setting-desc">${L('langSub')}</div></div>
        <div class="setting-action">
          <div class="lang-toggle">
            <button class="lang-btn ${!isDE ? 'active' : ''}" onclick="Settings.setLang('en')">EN</button>
            <button class="lang-btn ${isDE ? 'active' : ''}" onclick="Settings.setLang('de')">DE</button>
          </div>
        </div>
      </div>

      <div class="setting-row wrap">
        <div class="setting-info"><div class="setting-label">${L('accentColor')}</div><div class="setting-desc">${L('accentSub')}</div></div>
        <div class="setting-action">
          <div class="color-picker">
            <div class="color-swatches">
              ${ACCENT_PRESETS.map(c => `<div class="color-swatch ${Store.settings.accent === c ? 'active' : ''}" style="background:${c}" onclick="Settings.setAccent('${c}')"></div>`).join('')}
            </div>
            <input type="color" class="color-native" value="${Store.settings.accent}" onchange="Settings.setAccent(this.value)" title="${L('custom')}">
          </div>
        </div>
      </div>

      ${isStandalone() ? '' : (canInstallPwa && deferredInstallPrompt) ? `<div class="setting-row">
        <div class="setting-info"><div class="setting-label">${L('installApp')}</div><div class="setting-desc">${L('installSub')}</div></div>
        <div class="setting-action"><button class="btn btn-outline" onclick="Settings.installPwa()">${L('install')}</button></div>
      </div>` : isIOS() ? `<div class="setting-row">
        <div class="setting-info"><div class="setting-label">${L('installApp')}</div><div class="setting-desc">${L('installIOSSub')}</div></div>
        <div class="setting-action"><button class="btn btn-outline" onclick="Modal.confirm(L('installApp'), L('installIOSHowMsg'), [{ label: L('ok'), cls: 'btn-outline', action() {} }])">${L('installHow')}</button></div>
      </div>` : (isFirefox() && isMobile()) ? `<div class="setting-row">
        <div class="setting-info"><div class="setting-label">${L('installApp')}</div><div class="setting-desc">${L('installFirefoxSub')}</div></div>
        <div class="setting-action"><button class="btn btn-outline" onclick="Modal.confirm(L('installApp'), L('installFirefoxHowMsg'), [{ label: L('ok'), cls: 'btn-outline', action() {} }])">${L('installHow')}</button></div>
      </div>` : '' }

      <!-- Folders Section -->
      <div class="section-divider">
        <div class="section-header">
          <div><div class="setting-label">${L('folders')}</div><div class="setting-desc">${L('foldersSub')}</div></div>
        </div>
        <div id="folderSortList">${foldersHtml}</div>
        <div class="folder-add-row">
          <input class="form-input form-input-sm" id="newFolderName" placeholder="${L('folderNamePH')}" onkeydown="if(event.key==='Enter')Settings.addFolder()">
          <button class="btn btn-outline" onclick="Settings.addFolder()">${L('addFolder')}</button>
        </div>
      </div>

      <div class="sync-section">
        <div class="sync-header">
          <div class="setting-label">${L('sync')}</div>
          <span class="sync-status ${Sync.enabled ? (navigator.onLine ? 'on' : 'off') : 'off'}"><span class="dot"></span>${Sync.enabled ? (navigator.onLine ? L('syncOn') : 'Offline') : L('syncOff')}</span>
        </div>
        ${syncHtml}
      </div>

      <div class="setting-row mt">
        <div class="setting-info"><div class="setting-label">${L('exportData')}</div><div class="setting-desc">${L('exportSub')}</div></div>
        <div class="setting-action"><button class="btn btn-outline" onclick="Settings.export()">${L('export')}</button></div>
      </div>

      <div class="setting-row">
        <div class="setting-info"><div class="setting-label">${L('importData')}</div><div class="setting-desc">${L('importSub')}</div></div>
        <div class="setting-action"><button class="btn btn-outline" onclick="document.getElementById('importFile').click()">${L('import')}</button></div>
      </div>

      <div class="section-divider">
      ${Sync.enabled ? `
          <div class="stat-row">
            <div><div class="setting-label">${L('syncDataSize')}</div><div class="setting-desc">${L('syncDataSub')}</div></div>
            <div class="stat-value" id="sync-data-size"></div>
          </div>
          <div class="stat-row">
            <div><div class="setting-label">${L('cacheSize')}</div><div class="setting-desc">${L('cacheSub')}</div></div>
            <div class="stat-value" id="cache-size"></div>
          </div>
        ` : `
          <div class="stat-row">
            <div><div class="setting-label">${L('storageUsed')}</div><div class="setting-desc">${L('storageSub')}</div></div>
            <div class="stat-value" id="storage-size"></div>
          </div>
        `}
        <div class="stat-row">
          <div><div class="setting-label">${L('cleanupData')}</div><div class="setting-desc">${L('cleanupSub')}</div></div>
          <div class="stat-value"><button class="btn btn-outline" onclick="Settings.confirmCleanup()">${L('cleanup')}</button></div>
        </div>
      </div>

      <div class="setting-row">
        <div class="setting-info"><div class="setting-label">${L('resetData')}</div><div class="setting-desc">${L('resetSub')}</div></div>
        <div class="setting-action"><button class="btn btn-danger" onclick="Settings.confirmReset()">${L('reset')}</button></div>
      </div>
      
      <div class="setting-row">
        <div class="setting-info"><div class="setting-label">${L('welcomeTour')}</div><div class="setting-desc">${L('welcomeTourSub')}</div></div>
        <div class="setting-action"><button class="btn btn-outline" onclick="Modal.close('settings');Welcome.show()">${L('welcomeTourBtn')}</button></div>
      </div>
      
      
      <div class="footer-support">
        <a href="https://ko-fi.com/nirastich" target="_blank" rel="noopener">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
          ${L('supportProject')}
        </a>
      </div>

      <div class="footer-credits">&copy; ${new Date().getFullYear()} <a href="https://www.leroch.net" target="_blank" rel="noopener">Christian Leroch</a>
        | ${L('sourceCode')} <a href="https://github.com/nirastich/todo" target="_blank" rel="noopener">Github</a>
      </div>`;
    Settings.updateStorageSize();
    FolderDrag.bind();
  },

  addFolder() {
    const input = document.getElementById('newFolderName');
    const name = input?.value?.trim();
    if (!name) { input?.focus(); return; }
    Folders.add(name);
    this.render();
    App._renderFolderDropdown();
  },

  saveEditFolder() {
    const input = document.getElementById('folderEditName');
    if (input && this._editingFolderId) {
      Folders.rename(this._editingFolderId, input.value);
    }
    this._editingFolderId = null;
    this.render();
    App._renderFolderDropdown();
  },

  setFolderColor(id, color) {
    Folders.setColor(id, color);
    this.render();
    App.render();
  },
  
  toggleNoSync(id) {
    const isNoSync = Folders.isNoSync(id);
    if (isNoSync) {
      Modal.confirm(L('noSyncDisableTitle'), L('noSyncDisableMsg'), [
        { label: L('cancel'), cls: 'btn-outline', action() {} },
        { label: L('ok'), cls: 'btn-outline', action() { Folders.setNoSync(id, false); Settings.render(); } }
      ]);
    } else {
      Modal.confirm(L('noSyncConfirmTitle'), L('noSyncConfirmMsg'), [
        { label: L('cancel'), cls: 'btn-outline', action() {} },
        { label: L('ok'), cls: 'btn-danger', action() { Folders.setNoSync(id, true); Settings.render(); } }
      ]);
    }
  },

  confirmDeleteFolder(id) {
    Modal.confirm(L('deleteFolderTitle'), L('deleteFolderMsg'), [
      { label: L('cancel'), cls: 'btn-outline', action() {} },
      { label: L('delete'), cls: 'btn-danger', action() {
        Folders.remove(id);
        Settings._editingFolderId = null;
        Settings.render();
        App.render();
      }}
    ]);
  },

  confirmDeleteFolderSync(folderId) {
    Modal.confirm(L('syncDeleteTitle'), L('syncDeleteMsg'), [
      { label: L('cancel'), cls: 'btn-outline', action() {} },
      { label: L('delete'), cls: 'btn-danger', action: async () => {
        await Sync.deleteFolderServer(folderId);
        Settings.render();
      }}
    ]);
  },

  toggleTheme() {
    Store.settings.theme = Store.settings.theme === 'dark' ? 'light' : 'dark';
    Store.saveSettings(); App.applyTheme(); this.render();
  },

  setLang(lang) { Store.settings.lang = lang; Store.saveSettings(); App.render(); this.render(); },
  setAccent(color) { Store.settings.accent = color; Store.saveSettings(); App.applyTheme(); this.render(); },

  export() {
    const data = { version: 1, exported: new Date().toISOString(), todos: Store.todos, folders: Store.folders, settings: Store.settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `todos-${Util.dateStr(new Date())}.json`; a.click();
  },

  handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.todos || !Array.isArray(data.todos)) throw new Error();
        Modal.confirm(L('importTodos'), LF('importMsg', data.todos.length), [
          { label: L('cancel'), cls: 'btn-outline', action() {} },
          { label: L('addExisting'), cls: 'btn-outline', action() {
            Store.todos = [...Store.todos, ...data.todos.map(t => ({ ...t, id: Util.uid() }))];
            if (data.folders) {
              const existingIds = new Set(Store.folders.map(f => f.id));
              Store.folders = [...Store.folders, ...data.folders.filter(f => !existingIds.has(f.id))];
              Store.saveFolders();
            }
            Store.saveTodos(); App.render(); Settings.render();
          }},
          { label: L('overwrite'), cls: 'btn-danger', action() {
            Store.todos = data.todos;
            if (data.folders) Store.folders = data.folders;
            if (data.settings) { Store.settings = { ...Store.settings, ...data.settings }; Store.saveSettings(); App.applyTheme(); }
            Store.saveFolders(); Store.saveTodos(); App.render(); Settings.render();
          }}
        ]);
      } catch {
        Modal.confirm(L('importErr'), L('importErrMsg'), [{ label: L('ok'), cls: 'btn-outline', action() {} }]);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  },

  confirmReset() {
    const sharedFolderIds = Object.keys(Sync.folderChannels).filter(fid => Sync.folderChannels[fid]?.enabled);
    const hasShared = sharedFolderIds.length > 0;

    if (hasShared) {
      const names = sharedFolderIds.map(fid => Folders.getName(fid)).filter(Boolean).join(', ');
      Modal.confirm(L('resetTitle'), LF('resetMsgShared', names), [
        { label: L('cancel'), cls: 'btn-outline', action() {} },
        { label: L('resetKeepShared'), cls: 'btn-danger', action() {
          if (Sync.main?.enabled) Sync.main.stop();
          Object.keys(Sync.folderChannels).forEach(fid => {
            if (Sync.folderChannels[fid]) { Sync.folderChannels[fid].stop(); delete Sync.folderChannels[fid]; }
          });
          Store.todos = []; Store.folders = [];
          Store.saveTodos(); Store.saveFolders();
          Store.settings.activeFolder = null; Store.saveSettings();
          Store.hiddenFolders = []; Store.saveHidden();
          Store.isolatedFolders = []; Store.saveIsolated();
          Store.noSyncFolders = []; Store.saveNoSync();
          App.render(); Settings.render();
        }},
        { label: L('resetDeleteShared'), cls: 'btn-danger', action: async () => {
          for (const fid of Object.keys(Sync.folderChannels)) {
            if (Sync.folderChannels[fid]?.enabled) await Sync.folderChannels[fid].deleteServer();
            delete Sync.folderChannels[fid];
          }
          if (Sync.main?.enabled) await Sync.main.deleteServer();
          Store.todos = []; Store.folders = [];
          Store.saveTodos(); Store.saveFolders();
          Store.settings.activeFolder = null; Store.saveSettings();
          Store.hiddenFolders = []; Store.saveHidden();
          Store.isolatedFolders = []; Store.saveIsolated();
          Store.noSyncFolders = []; Store.saveNoSync();
          App.render(); Settings.render();
        }}
      ]);
    } else {
      Modal.confirm(L('resetTitle'), L('resetMsg'), [
        { label: L('cancel'), cls: 'btn-outline', action() {} },
        { label: L('deleteAll'), cls: 'btn-danger', action() {
          if (Sync.main?.enabled) Sync.main.stop();
          Store.todos = []; Store.folders = [];
          Store.saveTodos(); Store.saveFolders();
          Store.settings.activeFolder = null; Store.saveSettings();
          Store.hiddenFolders = []; Store.saveHidden();
          Store.isolatedFolders = []; Store.saveIsolated();
          Store.noSyncFolders = []; Store.saveNoSync();
          App.render(); Settings.render();
        }}
      ]);
    }
  },

  installPwa() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(() => { deferredInstallPrompt = null; Settings.render(); });
    }
  },

  async updateStorageSize() {
    const formatSize = (bytes) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    let cacheBytes = 0;
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        for (const name of names) {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          for (const req of requests) {
            const res = await cache.match(req);
            if (res) cacheBytes += (await res.clone().blob()).size;
          }
        }
      }
    } catch (e) {}

    let localBytes = 0;
    try {
      for (const key of ['todo_data', 'todo_settings', 'todo_sync', 'todo_folders', 'todo_hidden_folders', 'todo_isolated_folders', 'todo_nosync_folders']) {
        const val = localStorage.getItem(key);
        if (val) localBytes += new Blob([val]).size;
      }
      Store.folders.forEach(f => {
        const val = localStorage.getItem(`todo_sync_folder_${f.id}`);
        if (val) localBytes += new Blob([val]).size;
      });
    } catch (e) {}

    if (Sync.enabled) {
      const syncEl = document.getElementById('sync-data-size');
      const cacheEl = document.getElementById('cache-size');
      if (!syncEl || !cacheEl) return;

      let syncBytes = 0;
      try {
        const payload = Sync._getMainPayload();
        const encrypted = await Crypto.encrypt(payload, Sync.fullSyncKey);
        if (encrypted) {
          const fixedOverhead = 200 + String(Sync.version).length;
          syncBytes = encrypted.length + fixedOverhead;
        }
      } catch (e) {}

      const limitBytes = 512 * 1024;
      if (syncBytes > limitBytes * 0.9) {
        syncEl.style.color = 'var(--danger)';
      } else if (syncBytes > limitBytes * 0.7) {
        syncEl.style.color = 'var(--accent)';
      } else {
        syncEl.style.color = 'var(--text)';
      }

      syncEl.textContent = formatSize(syncBytes) + ' / 512 KB';
      cacheEl.textContent = formatSize(localBytes + cacheBytes);
    } else {
      const el = document.getElementById('storage-size');
      if (!el) return;

      el.textContent = formatSize(localBytes + cacheBytes);
    }
  },

  confirmCleanup() {
    const today = Util.dateStr(new Date());
    const removable = Store.todos.filter(t => {
      if (t.type === 'single' && t.date < today) return true;
      if (t.type === 'range' && t.endDate && t.endDate < today) return true;
      if (t.type === 'range' && !t.endDate && (t.rangeCount || 0) > 0 && Todos.isRangeFullyDone(t) && !(t.completedDates || []).includes(today)) return true;
      if (t.type === 'recurring' && t.recurrence?.endDate && t.recurrence.endDate < today) return true;
      return false;
    });
    if (removable.length === 0) {
      Modal.confirm(L('cleanupTitle'), LF('cleanupMsg', 0), [{ label: L('ok'), cls: 'btn-outline', action() {} }]);
      return;
    }
    const previewMax = 12;

    const previewText = removable
      .slice()
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
      .slice(0, previewMax)
      .map(t => {
        const reason =
          (t.type === 'single' && t.date < today) ? LF('cleanupReasonSingle', t.date) :
          (t.type === 'range' && t.endDate && t.endDate < today) ? LF('cleanupReasonRange', t.startDate, t.endDate) :
          (t.type === 'range' && !t.endDate && (t.rangeCount || 0) > 0 && Todos.isRangeFullyDone(t)) ? LF('cleanupReasonUntilDone', Todos.rangeCompletionCount(t), Todos.rangeTarget(t)) :
          (t.type === 'recurring' && t.recurrence?.endDate && t.recurrence.endDate < today) ? LF('cleanupReasonRecurring', t.recurrence.endDate) :
          '-';
    
        return `• ${t.title} - ${reason}`;
      })
      .join('\n');
    
    const extra = removable.length > previewMax
      ? `\n\n${LF('cleanupMore', removable.length - previewMax)}`
      : '';
    
    const msg =
      `${LF('cleanupMsg', removable.length)}\n\n` +
      `${L('cleanupWillRemove')}\n` +
      `${previewText || '-'}` +
      extra;
    
    Modal.confirm(L('cleanupTitle'), msg, [
      { label: L('cancel'), cls: 'btn-outline', action() {} },
      { label: L('cleanup'), cls: 'btn-outline', action() { Settings._runCleanup(today); } }
    ]);
  },

  _runCleanup(today) {
    Store.todos = Store.todos.filter(t => {
      if (t.type === 'single' && t.date < today) return false;
      if (t.type === 'range' && t.endDate && t.endDate < today) return false;
      if (t.type === 'range' && !t.endDate && (t.rangeCount || 0) > 0 && Todos.isRangeFullyDone(t) && !(t.completedDates || []).includes(today)) return false;
      if (t.type === 'recurring' && t.recurrence?.endDate && t.recurrence.endDate < today) return false;
      return true;
    });
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 56);
    const cutoffStr = Util.dateStr(cutoff);
    Store.todos.forEach(t => {
      if (t.skippedDates?.length) {
        t.skippedDates = t.skippedDates.filter(d => d >= cutoffStr);
      }
      if (t.type !== 'recurring' || !t.completedDates?.length) return;
      t.completedDates = t.completedDates.filter(d => d >= cutoffStr);
    });
    Store.saveTodos(); App.render(); Settings.render();
  }
};

let deferredInstallPrompt = null;
let canInstallPwa = false;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isFirefox() {
  return /Firefox\//.test(navigator.userAgent);
}

function isMobile() {
  return matchMedia('(pointer: coarse)').matches || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  canInstallPwa = true;
  if (document.getElementById('settingsModal').classList.contains('open')) Settings.render();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  canInstallPwa = false;
  if (document.getElementById('settingsModal').classList.contains('open')) Settings.render();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then((reg) => reg.update())
    .catch(() => {});
}

const Welcome = {
  _page: 0,
  _totalPages: 5,

  init() {
    if (!localStorage.getItem('todo_welcome_seen')) {
      this.show();
    }
  },

  show(page) {
    this._page = page || 0;
    this._render();
    requestAnimationFrame(() => document.getElementById('welcomeModal').classList.add('open'));
  },

  close() {
    document.getElementById('welcomeModal').classList.remove('open');
    localStorage.setItem('todo_welcome_seen', '1');
  },

  nav(dir) {
    this._page = Math.max(0, Math.min(this._totalPages - 1, this._page + dir));
    this._render();
  },

  goTo(page) {
    this._page = page;
    this._render();
  },

  _render() {
    const p = this._page;
    const last = this._totalPages - 1;
    const body = document.getElementById('welcomeBody');
    const dots = document.getElementById('welcomeDots');
    const nav = document.getElementById('welcomeNav');

    const accent = Store.settings.accent || '#76b852';

    const pages = [
      // Page 1: Welcome
      () => `<div class="welcome-page">
        <div class="welcome-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </div>
        <h1 class="welcome-title">${L('w1Title')}</h1>
        <p class="welcome-sub">${L('w1Sub')}</p>
      </div>`,

      // Page 2: Scheduling (mock todo items)
      () => {
        const check = `<svg class="wm-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>`;
        return `<div class="welcome-page">
          <h2 class="welcome-title">${L('w2Title')}</h2>
          <div class="wm-todo-list">
            <div class="wm-todo">
              <div class="wm-todo-check done">${check}</div>
              <div class="wm-todo-body">
                <div class="wm-todo-title done">${L('w2Ex1')}</div>
                <div class="wm-todo-meta">${L('w2Single')}</div>
              </div>
            </div>
            <div class="wm-todo">
              <div class="wm-todo-check"></div>
              <div class="wm-todo-body">
                <div class="wm-todo-title">${L('w2Ex2')}</div>
                <div class="wm-todo-meta">${L('w2Range')} · 1/3</div>
              </div>
            </div>
            <div class="wm-todo">
              <div class="wm-todo-check"></div>
              <div class="wm-todo-body">
                <div class="wm-todo-title">${L('w2Ex3')}</div>
                <div class="wm-todo-meta">${L('w2Recurring')} · ${L('dayNames')[1]}, ${L('dayNames')[4]}</div>
              </div>
            </div>
            <div class="wm-todo">
              <div class="wm-todo-check"></div>
              <div class="wm-todo-body">
                <div class="wm-todo-title">${L('w2Ex4')}</div>
                <div class="wm-todo-meta">${L('w2Span')} · ${L('dayNames')[5]} ${L('to')} ${L('dayNames')[0]} · 2/3</div>
              </div>
            </div>
          </div>
        </div>`;
      },

      // Page 3: Folders (mock folder list)
      () => `<div class="welcome-page">
        <h2 class="welcome-title">${L('w3Title')}</h2>
        <div class="wm-folder-list">
          <div class="wm-folder">
            <span class="wm-folder-dot" style="background:#4A9EFF"></span>
            <span class="wm-folder-name">${L('w3Ex1')}</span>
            <span class="wm-folder-count">12</span>
          </div>
          <div class="wm-folder">
            <span class="wm-folder-dot" style="background:#10B981"></span>
            <span class="wm-folder-name">${L('w3Ex2')}</span>
            <span class="wm-folder-count">5</span>
          </div>
          <div class="wm-folder">
            <span class="wm-folder-dot" style="background:#FB923C"></span>
            <span class="wm-folder-name">${L('w3Ex3')}</span>
            <span class="wm-folder-count">3</span>
            <svg class="wm-folder-shared" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
        </div>
        <div class="wm-feat-list">
          <div class="wm-feat"><span class="wm-feat-dot"></span>${L('w3Feat1')}</div>
          <div class="wm-feat"><span class="wm-feat-dot"></span>${L('w3Feat2')}</div>
          <div class="wm-feat"><span class="wm-feat-dot"></span>${L('w3Feat3')}</div>
        </div>
      </div>`,

      // Page 4: Sync (flow diagram)
      () => `<div class="welcome-page">
        <h2 class="welcome-title">${L('w4Title')}</h2>
        <div class="wm-sync-flow">
          <div class="wm-sync-node">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="1.5" stroke-linecap="round">
              <rect x="5" y="2" width="14" height="20" rx="2"/>
              <line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
            <span>${L('w4Device')}</span>
          </div>
          <div class="wm-sync-arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="1.5" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            <span class="wm-sync-arrow-label">${L('w4Encrypted')}</span>
          </div>
          <div class="wm-sync-node">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="1.5" stroke-linecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>${L('w4Server')}</span>
          </div>
        </div>
        <div class="wm-feat-list">
          <div class="wm-feat"><span class="wm-feat-dot"></span>${L('w4Feat1')}</div>
          <div class="wm-feat"><span class="wm-feat-dot"></span>${L('w4Feat2')}</div>
          <div class="wm-feat"><span class="wm-feat-dot"></span>${L('w4Feat3')}</div>
        </div>
      </div>`,

      // Page 5: Quick Tips (icon + label pairs)
      () => `<div class="welcome-page">
        <h2 class="welcome-title">${L('w5Title')}</h2>
        <div class="wm-tips">
          <div class="wm-tip">
            <div class="wm-tip-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div class="wm-tip-text"><strong>${L('w5Tip1T')}</strong>${L('w5Tip1D')}</div>
          </div>
          <div class="wm-tip">
            <div class="wm-tip-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="22"/><polyline points="17 7 12 2 7 7"/><polyline points="17 17 12 22 7 17"/></svg>
            </div>
            <div class="wm-tip-text"><strong>${L('w5Tip2T')}</strong>${L('w5Tip2D')}</div>
          </div>
          <div class="wm-tip">
            <div class="wm-tip-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <div class="wm-tip-text"><strong>${L('w5Tip3T')}</strong>${L('w5Tip3D')}</div>
          </div>
          <div class="wm-tip">
            <div class="wm-tip-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div class="wm-tip-text"><strong>${L('w5Tip4T')}</strong>${L('w5Tip4D')}</div>
          </div>
        </div>
      </div>`
    ];

    body.innerHTML = pages[p]();

    // Dots
    dots.innerHTML = Array.from({ length: this._totalPages }, (_, i) =>
      `<button class="welcome-dot ${i === p ? 'active' : ''}" onclick="Welcome.goTo(${i})"></button>`
    ).join('');

    // Nav buttons
    let navHtml = '';
    if (p === 0) {
      navHtml = `
        <button class="btn btn-outline" onclick="Welcome.close()">${L('welcomeSkip')}</button>
        <button class="btn-primary" onclick="Welcome.nav(1)">${L('welcomeNext')}</button>`;
    } else if (p === last) {
      navHtml = `
        <button class="btn btn-outline" onclick="Welcome.nav(-1)">${L('welcomeBack')}</button>
        <button class="btn-primary" onclick="Welcome.close()">${L('welcomeDone')}</button>`;
    } else {
      navHtml = `
        <button class="btn btn-outline" onclick="Welcome.nav(-1)">${L('welcomeBack')}</button>
        <button class="btn-primary" onclick="Welcome.nav(1)">${L('welcomeNext')}</button>`;
    }
    nav.innerHTML = navHtml;
  }
};

const DragSort = {
  _holdTimer: null,
  _dragging: null,
  _indicator: null,
  _insertIndex: -1,

  init() {
    document.addEventListener('dragend', () => {
      document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
      this._hideIndicator();
      this._dragging = null;
    });
  },

  bindList() {
    const list = document.querySelector('.todo-list');
    if (!list) return;

    let ind = list.querySelector('.drop-indicator');
    if (!ind) {
      ind = document.createElement('div');
      ind.className = 'drop-indicator';
      list.appendChild(ind);
    }
    this._indicator = ind;

    list.querySelectorAll('.todo-item:not(.done)').forEach(el => {
      if (!('ontouchstart' in window)) el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', e => this._onDragStart(e));
      el.addEventListener('dragend', e => this._onDragEnd(e));
      el.addEventListener('touchstart', e => this._onTouchStart(e), { passive: false });
      el.addEventListener('touchmove', e => this._onTouchMove(e), { passive: false });
      el.addEventListener('touchend', e => this._onTouchEnd(e));
      el.addEventListener('touchcancel', e => this._onTouchEnd(e));
    });

    if (!list._dragBound) {
      list.addEventListener('dragover', e => this._onListDragOver(e));
      list.addEventListener('dragleave', e => {
        if (!list.contains(e.relatedTarget)) this._hideIndicator();
      });
      list.addEventListener('drop', e => this._onListDrop(e));
      list._dragBound = true;
    }
  },

  _getTodoId(el) { return el.dataset.id || null; },

  _getActiveItems() {
    const list = document.querySelector('.todo-list');
    return list ? [...list.querySelectorAll('.todo-item:not(.done)')] : [];
  },

  _calcInsertIndex(clientY) {
    const items = this._getActiveItems().filter(el => el !== this._dragging);
    if (!items.length) return 0;
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return items.length;
  },

  _showIndicator(insertIndex) {
    if (insertIndex === this._insertIndex) return;
    const items = this._getActiveItems().filter(el => el !== this._dragging);
    const list = document.querySelector('.todo-list');
    if (!list || !this._indicator) return;

    if (!items.length) {
      list.prepend(this._indicator);
    } else if (insertIndex <= 0) {
      items[0].before(this._indicator);
    } else if (insertIndex >= items.length) {
      items[items.length - 1].after(this._indicator);
    } else {
      items[insertIndex].before(this._indicator);
    }

    this._indicator.classList.add('visible');
    this._insertIndex = insertIndex;
  },

  _hideIndicator() {
    if (this._indicator) this._indicator.classList.remove('visible');
    this._insertIndex = -1;
  },

  _onDragStart(e) {
    this._dragging = e.currentTarget;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  },

  _onListDragOver(e) {
    if (!this._dragging) return;
    e.preventDefault();
    this._showIndicator(this._calcInsertIndex(e.clientY));
  },

  _onListDrop(e) {
    e.preventDefault();
    if (!this._dragging || this._insertIndex < 0) return;
    this._applyReorder();
    this._hideIndicator();
  },

  _onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    this._hideIndicator();
    this._dragging = null;
  },

  _onTouchStart(e) {
    const el = e.currentTarget;
    if (el.classList.contains('done')) return;
    this._holdTimer = setTimeout(() => {
      this._dragging = el;
      el.classList.add('drag-hold');
      navigator.vibrate?.(30);
      document.body.style.overflow = 'hidden';
    }, 400);
  },

  _onTouchMove(e) {
    if (!this._dragging) { clearTimeout(this._holdTimer); return; }
    e.preventDefault();
    this._showIndicator(this._calcInsertIndex(e.touches[0].clientY));
  },

  _onTouchEnd(e) {
    clearTimeout(this._holdTimer);
    if (!this._dragging) return;
    try {
      if (this._insertIndex >= 0) this._applyReorder();
    } finally {
      this._dragging.classList.remove('drag-hold');
      this._hideIndicator();
      document.body.style.overflow = '';
      this._dragging = null;
    }
  },

  _applyReorder() {
    const list = document.querySelector('.todo-list');
    if (!list || !this._dragging) return;
    const items = this._getActiveItems().filter(el => el !== this._dragging);

    if (this._insertIndex <= 0) {
      list.prepend(this._dragging);
    } else if (this._insertIndex >= items.length) {
      items[items.length - 1].after(this._dragging);
    } else {
      items[this._insertIndex].before(this._dragging);
    }
    this._saveOrder();
  },

  _saveOrder() {
    const list = document.querySelector('.todo-list');
    if (!list) return;
    const affectedFolders = new Set();
    [...list.querySelectorAll('.todo-item:not(.done)')].forEach((el, i) => {
      const id = this._getTodoId(el);
      if (!id) return;
      const todo = Store.todos.find(t => t.id === id);
      if (todo) {
        todo.sortOrder = i;
        todo._modified = Date.now();
        if (todo.folderId) affectedFolders.add(todo.folderId);
      }
    });
    Store.saveTodos(affectedFolders.size ? [...affectedFolders] : null);
  },
};

const FolderDrag = {
  _holdTimer: null,
  _dragging: null,
  _indicator: null,
  _insertIndex: -1,

  bind() {
    const list = document.getElementById('folderSortList');
    if (!list) return;

    let ind = list.querySelector('.folder-drop-indicator');
    if (!ind) {
      ind = document.createElement('div');
      ind.className = 'drop-indicator folder-drop-indicator';
      list.appendChild(ind);
    }
    this._indicator = ind;

    list.querySelectorAll('.folder-list-item[data-folder-id]:not(.editing)').forEach(el => {
      if (!('ontouchstart' in window)) el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', e => this._onDragStart(e));
      el.addEventListener('dragend', e => this._onDragEnd(e));
      el.addEventListener('touchstart', e => this._onTouchStart(e), { passive: false });
      el.addEventListener('touchmove', e => this._onTouchMove(e), { passive: false });
      el.addEventListener('touchend', e => this._onTouchEnd(e));
      el.addEventListener('touchcancel', e => this._onTouchEnd(e));
    });

    if (!list._fdBound) {
      list.addEventListener('dragover', e => this._onDragOver(e));
      list.addEventListener('dragleave', e => { if (!list.contains(e.relatedTarget)) this._hideIndicator(); });
      list.addEventListener('drop', e => this._onDrop(e));
      list._fdBound = true;
    }
  },

  _getItems() {
    const list = document.getElementById('folderSortList');
    return list ? [...list.querySelectorAll('.folder-list-item[data-folder-id]:not(.editing)')] : [];
  },

  _calcInsert(clientY) {
    const items = this._getItems().filter(el => el !== this._dragging);
    if (!items.length) return 0;
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return items.length;
  },

  _showIndicator(idx) {
    if (idx === this._insertIndex) return;
    const items = this._getItems().filter(el => el !== this._dragging);
    const list = document.getElementById('folderSortList');
    if (!list || !this._indicator) return;
    if (!items.length) list.prepend(this._indicator);
    else if (idx <= 0) items[0].before(this._indicator);
    else if (idx >= items.length) items[items.length - 1].after(this._indicator);
    else items[idx].before(this._indicator);
    this._indicator.classList.add('visible');
    this._insertIndex = idx;
  },

  _hideIndicator() {
    if (this._indicator) this._indicator.classList.remove('visible');
    this._insertIndex = -1;
  },

  _onDragStart(e) {
    this._dragging = e.currentTarget;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  },

  _onDragOver(e) {
    if (!this._dragging) return;
    e.preventDefault();
    this._showIndicator(this._calcInsert(e.clientY));
  },

  _onDrop(e) {
    e.preventDefault();
    if (!this._dragging || this._insertIndex < 0) return;
    this._applyReorder();
    this._hideIndicator();
  },

  _onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    this._hideIndicator();
    this._dragging = null;
  },

  _onTouchStart(e) {
    const el = e.currentTarget;
    this._holdTimer = setTimeout(() => {
      this._dragging = el;
      el.classList.add('drag-hold');
      navigator.vibrate?.(30);
      document.body.style.overflow = 'hidden';
    }, 400);
  },

  _onTouchMove(e) {
    if (!this._dragging) { clearTimeout(this._holdTimer); return; }
    e.preventDefault();
    this._showIndicator(this._calcInsert(e.touches[0].clientY));
  },

  _onTouchEnd() {
    clearTimeout(this._holdTimer);
    if (!this._dragging) return;
    try {
      if (this._insertIndex >= 0) this._applyReorder();
    } finally {
      this._dragging.classList.remove('drag-hold');
      this._hideIndicator();
      document.body.style.overflow = '';
      this._dragging = null;
    }
  },

  _applyReorder() {
    const list = document.getElementById('folderSortList');
    if (!list || !this._dragging) return;
    const items = this._getItems().filter(el => el !== this._dragging);

    if (this._insertIndex <= 0) list.prepend(this._dragging);
    else if (this._insertIndex >= items.length) items[items.length - 1].after(this._dragging);
    else items[this._insertIndex].before(this._dragging);

    const newOrder = [...list.querySelectorAll('.folder-list-item[data-folder-id]')]
      .map(el => el.dataset.folderId)
      .filter(Boolean);

    const folderMap = new Map(Store.folders.map(f => [f.id, f]));
    const reordered = newOrder.map(id => folderMap.get(id)).filter(Boolean);
    Store.folders.forEach(f => { if (!newOrder.includes(f.id)) reordered.push(f); });
    Store.folders = reordered;
    Store.saveFolders();
    App._renderFolderDropdown();
  }
};

window.FolderDrag = FolderDrag;
window.App = App;
window.Modal = Modal;
window.Todos = Todos;
window.Settings = Settings;
window.AddForm = AddForm;
window.ListView = ListView;
window.DetailView = DetailView;
window.Sync = Sync;
window.DragSort = DragSort;
window.Folders = Folders;
window.Store = Store;
window.Util = Util;
window.SyncChannel = SyncChannel;
window.Welcome = Welcome;
App.init();
