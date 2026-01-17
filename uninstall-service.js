// uninstall-service.js
// Ejecutar con: node uninstall-service.js

import { Service } from 'node-windows';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Crear el servicio
const svc = new Service({
  name: 'Alarmas Suragra',
  script: join(__dirname, 'src', 'index.js')
});

// Escuchar evento de desinstalación
svc.on('uninstall', function() {
  console.log('✅ Servicio desinstalado correctamente');
});

// Desinstalar el servicio
console.log('Desinstalando servicio de Windows...');
svc.uninstall();
