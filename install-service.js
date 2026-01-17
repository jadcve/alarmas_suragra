// install-service.js
// Ejecutar con: node install-service.js

import { Service } from 'node-windows';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Crear el servicio
const svc = new Service({
  name: 'Alarmas Suragra',
  description: 'Sistema de alarmas automáticas para cobranza Suragra',
  script: join(__dirname, 'src', 'index.js'),
  nodeOptions: [],
  env: [
    {
      name: "NODE_ENV",
      value: process.env.NODE_ENV || "production"
    }
  ]
});

// Escuchar evento de instalación
svc.on('install', function() {
  console.log('✅ Servicio instalado correctamente');
  console.log('Iniciando servicio...');
  svc.start();
});

svc.on('alreadyinstalled', function() {
  console.log('⚠️  El servicio ya está instalado');
});

svc.on('start', function() {
  console.log('✅ Servicio iniciado');
  console.log('El sistema de alarmas ahora funcionará incluso sin sesión activa');
});

// Instalar el servicio
console.log('Instalando servicio de Windows...');
svc.install();
