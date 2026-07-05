const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  dbQuery:          (sql, params) => ipcRenderer.invoke('db-query', sql, params),
  dbRun:            (sql, params) => ipcRenderer.invoke('db-run', sql, params),
  getMachineId:     ()            => ipcRenderer.invoke('get-machine-id'),
  activarLicencia:  (clave)       => ipcRenderer.invoke('activar-licencia', clave),
  verificarLicencia:()            => ipcRenderer.invoke('verificar-licencia'),
  login:            (user, pass)  => ipcRenderer.invoke('login', user, pass),
  register:         (user, pass, nombre, email) => ipcRenderer.invoke('register', user, pass, nombre, email),
  resetPassword:    (email)       => ipcRenderer.invoke('reset-password', email),
  confirmReset:     (email, token, newPass) => ipcRenderer.invoke('confirm-reset', email, token, newPass),
  isPackaged:       () => ipcRenderer.invoke('is-packaged'),
  licenciaInfo:     () => ipcRenderer.invoke('licencia-info'),
  getPrinters:      () => ipcRenderer.invoke('get-printers'),
  printSilent:      (p) => ipcRenderer.invoke('print-silent', p),
  printEscPos:      (data, printerName) => ipcRenderer.invoke('print-escpos', data, printerName),
  sendResetEmail:   (email, token) => ipcRenderer.invoke('send-reset-email', email, token)
});