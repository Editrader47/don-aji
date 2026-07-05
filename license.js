const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const licenciaPath = path.join(app.getPath('userData'), 'license.json');
const machineIdPath = path.join(app.getPath('userData'), 'machine.id');
const SECRET_KEY = 'D0nAj1-S3cr3t-K3y-2025';

// Genera un ID único para esta máquina (se guarda en un archivo, persistente)
function obtenerIdMaquina() {
  try {
    if (fs.existsSync(machineIdPath)) {
      return fs.readFileSync(machineIdPath, 'utf8');
    }
    // Generar un ID único basado en el nombre del equipo + UUID aleatorio
    const hostname = require('os').hostname();
    const random = crypto.randomBytes(16).toString('hex');
    const machineId = crypto.createHash('sha256').update(hostname + random).digest('hex');
    fs.writeFileSync(machineIdPath, machineId);
    return machineId;
  } catch (error) {
    // Fallback: generar un ID temporal
    return crypto.randomBytes(32).toString('hex');
  }
}

async function verificarLicencia() {
  try {
    if (!fs.existsSync(licenciaPath)) return false;
    const data = fs.readFileSync(licenciaPath, 'utf8');
    const licencia = JSON.parse(data);
    const fechaExpiracion = new Date(licencia.expira);
    const ahora = new Date();
    if (fechaExpiracion < ahora) return false;
    const idActual = obtenerIdMaquina();
    if (licencia.machineId !== idActual) return false;
    return true;
  } catch (error) {
    return false;
  }
}

async function guardarLicencia(clave, expiracion) {
  const idMaquina = obtenerIdMaquina();
  const licencia = {
    clave,
    machineId: idMaquina,
    expira: expiracion.toISOString(),
    activada: new Date().toISOString()
  };
  fs.writeFileSync(licenciaPath, JSON.stringify(licencia, null, 2));
}

function generarClave(machineId, diasValidez) {
  const expira = new Date();
  expira.setDate(expira.getDate() + diasValidez);
  const data = `${machineId}|${expira.toISOString()}`;
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');
  return Buffer.from(`${data}|${signature}`).toString('base64');
}

function validarClave(clave) {
  try {
    const decoded = Buffer.from(clave, 'base64').toString();
    const parts = decoded.split('|');
    if (parts.length !== 3) return null;
    const [machineId, expiraStr, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(`${machineId}|${expiraStr}`).digest('hex');
    if (signature !== expectedSig) return null;
    const expira = new Date(expiraStr);
    if (isNaN(expira.getTime())) return null;
    return { machineId, expira };
  } catch (e) {
    return null;
  }
}



// NUEVA: obtener info de expiración sin afectar verificarLicencia()
function obtenerInfoLicencia() {
  try {
    if (!fs.existsSync(licenciaPath)) return { activa: false };
    const data = fs.readFileSync(licenciaPath, 'utf8');
    const licencia = JSON.parse(data);
    const fechaExpiracion = new Date(licencia.expira);
    const ahora = new Date();
    const msRestantes = fechaExpiracion - ahora;
    const diasRestantes = Math.ceil(msRestantes / (1000*60*60*24));
    return {
      activa: msRestantes > 0,
      expira: licencia.expira,
      diasRestantes: diasRestantes
    };
  } catch (e) {
    return { activa: false };
  }
}

module.exports = { verificarLicencia, guardarLicencia, obtenerIdMaquina, generarClave, validarClave, obtenerInfoLicencia };