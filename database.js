const Database  = require('better-sqlite3');
const { app }   = require('electron');
const path      = require('path');
const bcrypt    = require('bcryptjs');

const dbPath = path.join(app.getPath('userData'), 'donaji.db');
const db     = new Database(dbPath);

function initDatabase() {
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS productos (
      id TEXT PRIMARY KEY,
      name TEXT,
      category TEXT,
      price REAL,
      cost REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      minStock INTEGER DEFAULT 5,
      description TEXT,
      barcode TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      nit TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS ventas (
      invoiceNumber TEXT PRIMARY KEY,
      date TEXT,
      time TEXT,
      client TEXT,
      document TEXT,
      subtotal REAL,
      discount REAL DEFAULT 0,
      total REAL,
      paymentMethod TEXT,
      cashAmount REAL,
      change REAL,
      items TEXT
    );

    CREATE TABLE IF NOT EXISTS caja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT,
      cashierName TEXT,
      openingBalance REAL,
      currentBalance REAL,
      openingTime TEXT,
      salesTotal REAL DEFAULT 0,
      movements TEXT
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT,
      nombre TEXT
    );

    CREATE TABLE IF NOT EXISTS configuracion (
      id INTEGER PRIMARY KEY,
      companyName TEXT,
      companyNit TEXT,
      companyAddress TEXT,
      companyPhone TEXT,
      companyEmail TEXT,
      ivaPercentage INTEGER DEFAULT 0,
      invoicePrefix TEXT DEFAULT 'FV',
      defaultMinStock INTEGER DEFAULT 5,
      receiptMessage TEXT DEFAULT '¡Gracias por su compra!',
      categorias TEXT,
      facturaNum INTEGER DEFAULT 11586
    );
  `);


  // Migraciones seguras
  const safeAdd = (t, c, tp) => {
    try {
      db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${tp}`);
    } catch(_) {}
  };

  safeAdd('configuracion', 'receiptMessage',
    "TEXT DEFAULT '¡Gracias por su compra!'");

  safeAdd('configuracion', 'invoicePrefix',
    "TEXT DEFAULT 'FV'");

  safeAdd('configuracion', 'defaultMinStock',
    "INTEGER DEFAULT 5");

  safeAdd('configuracion', 'categorias',
    'TEXT');

  safeAdd('configuracion', 'facturaNum',
    'INTEGER DEFAULT 11586');


  // CREAR CONFIGURACIÓN INICIAL SI NO EXISTE
  const cfg = db.prepare(
    'SELECT * FROM configuracion LIMIT 1'
  ).get();

  if (!cfg) {
    db.prepare(`
      INSERT INTO configuracion (facturaNum)
      VALUES (11586)
    `).run();
  }


  // Usuario administrador por defecto
  const existe = db.prepare(
    'SELECT id FROM usuarios WHERE username=?'
  ).get('admin');


  if (!existe) {
    db.prepare(
      'INSERT INTO usuarios (username,password,role,nombre) VALUES (?,?,?,?)'
    )
    .run(
      'admin',
      bcrypt.hashSync('admin123', 10),
      'admin',
      'Administrador'
    );
  }
}


module.exports = {
  initDatabase,
  db
};