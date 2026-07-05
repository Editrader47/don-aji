/* ═══════════════════════════════════════════════════════
   DON AJÍ POS — main.js  v5 (con ESC/POS)
   ═══════════════════════════════════════════════════════ */
'use strict';

const electron   = require('electron');
const app        = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain    = electron.ipcMain;

const path = require('path');
const http = require('http');
const fs   = require('fs');
const os   = require('os');
const crypto = require('crypto');

// ── Nueva librería para impresión ESC/POS ──
const { PosPrinter } = require('electron-pos-printer');

// ── Otros módulos opcionales ──
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch(_) {}

let bcrypt = null;
try { bcrypt = require('bcryptjs'); } catch(_) {}

let dbMod = null;
try { dbMod = require('./database'); } catch(_) {}

let lic = null;
try { lic = require('./license'); } catch(_) {}

// ── Configuración de correo ──
const MAIL_CONFIG = {
  user: 'adahiasfpro@gmail.com',
  pass: 'kqebnnmxoduflcok'
};

function crearTransporter(){
  if(!nodemailer) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: MAIL_CONFIG.user, pass: MAIL_CONFIG.pass }
  });
}

// ── Ventana principal ──
let win = null;
function createWindow() {
  win = new BrowserWindow({
    title: 'Don Ají PRO',
    width : 1300,
    height: 820,
    webPreferences: {
      nodeIntegration : false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.loadFile('index.html');
  win.maximize();
}

// ── Servidor HTTP para móviles ──
function startLocalServer() {
  const idx = path.join(__dirname, 'index.html');
  const srv = http.createServer((req, res) => {
    try {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(idx, 'utf8'));
    } catch(e) { res.writeHead(500); res.end('Error: ' + e.message); }
  });
  srv.listen(8080, '0.0.0.0', () => {
    const ips = [];
    for (const iface of Object.values(os.networkInterfaces()))
      for (const a of iface)
        if (a.family === 'IPv4' && !a.internal) ips.push(a.address);
    console.log('\n╔═══════════════════════════════════╗');
    console.log('║  Don Ají — Acceso móvil activo    ║');
    ips.forEach(ip => console.log('║  ➜  http://'+ip+':8080'));
    console.log('╚═══════════════════════════════════╝\n');
  });
  srv.on('error', e => {
    if (e.code === 'EADDRINUSE') console.log('[warn] Puerto 8080 ocupado.');
  });
}

// ── ID de máquina ──
function getMachineId() {
  try {
    const cpus = os.cpus();
    const raw  = [os.hostname(), cpus[0]?.model || '', os.platform(), os.arch()].join('|');
    const h    = crypto.createHash('sha256').update(raw).digest('hex');
    return 'DA-' + h.slice(0, 8).toUpperCase();
  } catch(e) { return 'DA-UNKNOWN'; }
}

// ── Arranque ──
app.whenReady().then(async () => {
  if (dbMod) {
    try { dbMod.initDatabase(); } catch(e) { console.error('DB init:', e.message); }
    setTimeout(() => {
      try { dbMod.db.prepare("ALTER TABLE usuarios ADD COLUMN email TEXT").run(); } catch(_) {}
      try { dbMod.db.prepare("ALTER TABLE usuarios ADD COLUMN resetToken TEXT").run(); } catch(_) {}
      try { dbMod.db.prepare("ALTER TABLE usuarios ADD COLUMN resetExpire INTEGER").run(); } catch(_) {}
      ['gramos','pres','familia','unidadStock'].forEach(function(col){
        var def = col==='unidadStock' ? "'ud'" : col==='gramos' ? '0' : "''";
        try { dbMod.db.prepare('ALTER TABLE productos ADD COLUMN '+col+' TEXT DEFAULT '+def).run(); } catch(_) {}
      });
      try {
        dbMod.db.prepare(
          "UPDATE productos SET unidadStock='gr', minStock=125 " +
          "WHERE (id GLOB 'A*' OR id GLOB 'B*' OR id GLOB 'M*' OR id GLOB 'P*' " +
          "OR barcode GLOB 'A*' OR barcode GLOB 'B*' OR barcode GLOB 'M*' OR barcode GLOB 'P*') " +
          "AND (unidadStock IS NULL OR unidadStock='ud')"
        ).run();
      } catch(_) {}
      try {
        dbMod.db.prepare(
          "UPDATE productos SET unidadStock='gr', minStock=125 " +
          "WHERE (unidadStock IS NULL OR unidadStock='ud') " +
          "AND (id GLOB '[0-9]*' OR barcode GLOB '[0-9]*') " +
          "AND EXISTS (" +
          "  SELECT 1 FROM productos p2 " +
          "  WHERE (p2.id GLOB 'A*' OR p2.id GLOB 'B*' OR p2.id GLOB 'M*' OR p2.id GLOB 'P*') " +
          "  AND (SUBSTR(p2.id,2)=productos.id OR SUBSTR(p2.barcode,2)=productos.barcode)" +
          ")"
        ).run();
      } catch(_) {}
      ['printerName','nequiNum','nequiNom','daviplataNum','cuentaBcoNom','cuentaBco','tipoCuenta','otraCuentaNom','otraCuenta'].forEach(function(col){
        try { dbMod.db.prepare('ALTER TABLE configuracion ADD COLUMN '+col+' TEXT DEFAULT \'\'').run(); } catch(_) {}
      });
      try { dbMod.db.prepare(`CREATE TABLE IF NOT EXISTS contabilidad (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        categoria TEXT NOT NULL,
        concepto TEXT NOT NULL,
        valor REAL NOT NULL,
        fecha TEXT NOT NULL,
        estado TEXT DEFAULT 'pagado',
        responsable TEXT,
        obs TEXT,
        createdAt TEXT
      )`).run(); } catch(_) {}
      try { dbMod.db.prepare(`CREATE TABLE IF NOT EXISTS cuentas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        tercero TEXT NOT NULL,
        concepto TEXT NOT NULL,
        valor REAL NOT NULL,
        valorPagado REAL DEFAULT 0,
        fecha TEXT NOT NULL,
        fechaVence TEXT,
        estado TEXT DEFAULT 'pendiente',
        obs TEXT,
        createdAt TEXT
      )`).run(); } catch(_) {}
    }, 500);
  }
  createWindow();
  startLocalServer();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

/* ══════════════════════════════════════════════════════
   IPC HANDLERS
   ══════════════════════════════════════════════════════ */

ipcMain.handle('db-query', (_, sql, params) => {
  if (!dbMod) return [];
  try { return dbMod.db.prepare(sql).all(params || []); }
  catch(e) {
    if (!e.message.includes('duplicate column')) console.error('db-query:', e.message);
    return [];
  }
});

ipcMain.handle('db-run', (_, sql, params) => {
  if (!dbMod) return { lastID: null, changes: 0 };
  try {
    const r = dbMod.db.prepare(sql).run(params || []);
    return { lastID: r.lastInsertRowid, changes: r.changes };
  } catch(e) {
    if (!e.message.includes('duplicate column')) console.error('db-run:', e.message);
    return { lastID: null, changes: 0, error: e.message };
  }
});

ipcMain.handle('login', (_, username, password) => {
  if (!dbMod) return { success: false, error: 'DB no disponible' };
  try {
    const user = dbMod.db.prepare('SELECT * FROM usuarios WHERE username=?').get(username);
    if (!user) return { success: false, error: 'Usuario no existe' };
    let ok = false;
    if (bcrypt) { try { ok = bcrypt.compareSync(password, user.password); } catch(_) { ok = password === user.password; } }
    else { ok = password === user.password; }
    if (!ok) return { success: false, error: 'Contraseña incorrecta' };
    return { success: true, role: user.role, nombre: user.nombre, email: user.email || '' };
  } catch(e) { return { success: false, error: e.message }; }
});

ipcMain.handle('register', (_, username, password, nombre, email) => {
  if (!dbMod) return { success: false, error: 'DB no disponible' };
  try {
    const ex = dbMod.db.prepare('SELECT id FROM usuarios WHERE username=? OR email=?').get(username, email);
    if (ex) return { success: false, error: 'Usuario o correo ya existe' };
    const hash = bcrypt ? bcrypt.hashSync(password, 10) : password;
    dbMod.db.prepare('INSERT INTO usuarios (username,password,nombre,email,role) VALUES (?,?,?,?,?)').run(username, hash, nombre, email, 'admin');
    return { success: true };
  } catch(e) { return { success: false, error: e.message }; }
});

ipcMain.handle('reset-password', (_, email) => {
  if (!dbMod) return { success: false };
  try {
    const user = dbMod.db.prepare('SELECT * FROM usuarios WHERE email=?').get(email);
    if (!user) return { success: false, error: 'Correo no registrado' };
    const token = crypto.randomBytes(4).toString('hex').toUpperCase();
    dbMod.db.prepare('UPDATE usuarios SET resetToken=?,resetExpire=? WHERE email=?')
      .run(token, Date.now() + 3600000, email);
    return { success: true, token, nombre: user.nombre };
  } catch(e) { return { success: false, error: e.message }; }
});

ipcMain.handle('confirm-reset', (_, email, token, newPass) => {
  if (!dbMod) return { success: false };
  try {
    const user = dbMod.db.prepare('SELECT * FROM usuarios WHERE email=? AND resetToken=?').get(email, token);
    if (!user) return { success: false, error: 'Token inválido' };
    if (Date.now() > parseInt(user.resetExpire || 0)) return { success: false, error: 'Token vencido' };
    const hash = bcrypt ? bcrypt.hashSync(newPass, 10) : newPass;
    dbMod.db.prepare('UPDATE usuarios SET password=?,resetToken=NULL,resetExpire=NULL WHERE email=?').run(hash, email);
    return { success: true };
  } catch(e) { return { success: false, error: e.message }; }
});

ipcMain.handle('is-packaged', () => {
  if (app.isPackaged) return true;
  const exePath = process.execPath.toLowerCase();
  return exePath.includes('program files') || 
         exePath.includes('appdata\\local\\programs') ||
         exePath.includes('appdata/local/programs') ||
         !exePath.includes('node_modules');
});

ipcMain.handle('get-machine-id', () => {
  const exePath = process.execPath.toLowerCase();
  const isInstalled = app.isPackaged ||
                      exePath.includes('program files') ||
                      exePath.includes('appdata\\local\\programs') ||
                      !exePath.includes('node_modules');
  if (!isInstalled) return 'DEV-MODE';
  if (lic) return lic.obtenerIdMaquina();
  return 'NO-LIC-MODULE';
});

ipcMain.handle('verificar-licencia', async () => {
  const exePath = process.execPath.toLowerCase();
  const isInstalled = app.isPackaged ||
                      exePath.includes('program files') ||
                      exePath.includes('appdata\\local\\programs') ||
                      !exePath.includes('node_modules');
  if (!isInstalled) return true;
  if (!lic) return false;
  const ok = await lic.verificarLicencia();
  return ok;
});

ipcMain.handle('licencia-info', () => {
  if (!lic || !lic.obtenerInfoLicencia) return { activa: true, diasRestantes: 999 };
  return lic.obtenerInfoLicencia();
});

ipcMain.handle('activar-licencia', async (_, clave) => {
  if (!lic) return { success: false, error: 'Módulo de licencia no disponible' };
  const resultado = lic.validarClave(clave);
  if (!resultado) return { success: false, error: 'Clave inválida o malformada' };
  const idActual = lic.obtenerIdMaquina();
  if (resultado.machineId !== idActual) return { success: false, error: 'Clave no corresponde a esta máquina' };
  if (new Date(resultado.expira) < new Date()) return { success: false, error: 'Clave vencida' };
  await lic.guardarLicencia(clave, new Date(resultado.expira));
  return { success: true, expira: resultado.expira };
});

ipcMain.handle('get-printers', async () => {
  try {
    const printers = await win.webContents.getPrintersAsync();
    return printers.map(p => ({ name: p.name, isDefault: p.isDefault }));
  } catch(e) { return []; }
});

// ── Impresión silenciosa (fallback) ──
ipcMain.handle('print-silent', async (_, printerName) => {
  return new Promise((resolve) => {
    try {
      const opts = {
        silent: true,
        printBackground: false,
        deviceName: printerName || '',
        margins: { marginType: 'none' },
        pageSize: { width: 80000, height: 200000 }
      };
      win.webContents.print(opts, (success, reason) => {
        if (success) {
          resolve({ success: true, reason: '' });
        } else {
          console.error('Print failed:', reason);
          resolve({ success: false, reason: reason || 'Error desconocido' });
        }
      });
    } catch (e) {
      resolve({ success: false, reason: e.message });
    }
  });
});

// ── NUEVO: Impresión ESC/POS ──
ipcMain.handle('print-escpos', async (_, data, printerName) => {
  try {
    const options = {
      printerName: printerName || '',
    };
    const result = await PosPrinter.print(data, options);
    return { success: true };
  } catch (error) {
    console.error('Error en print-escpos:', error);
    return { success: false, reason: error.message || 'Error desconocido' };
  }
});

ipcMain.handle('send-reset-email', async (_, email, token) => {
  try {
    const transporter = crearTransporter();
    if(!transporter) return { success: false, error: 'Nodemailer no disponible' };
    await transporter.sendMail({
      from: '"Don Ají POS - Soporte" <adahiasfpro@gmail.com>',
      to: email,
      subject: 'Recuperación de contraseña — Don Ají POS',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:8px;">
          <h2 style="color:#00b09b;">🌶️ Don Ají POS</h2>
          <p>Recibiste este correo porque solicitaste recuperar tu contraseña.</p>
          <div style="background:#f5f5f5;border-radius:6px;padding:16px;text-align:center;margin:20px 0;">
            <p style="margin:0;font-size:13px;color:#888;">Tu código de recuperación es:</p>
            <h1 style="letter-spacing:8px;color:#333;margin:8px 0;">${token}</h1>
            <p style="margin:0;font-size:11px;color:#aaa;">Válido por 1 hora</p>
          </div>
          <p style="font-size:12px;color:#aaa;">Si no solicitaste esto, ignora este correo.</p>
          <p style="font-size:11px;color:#ccc;">Adaiah Software Pro — adahiasfpro@gmail.com</p>
        </div>
      `
    });
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
});