# 🚨 Alarmas Suragra

Sistema de alertas automatizadas para la compañía **Suragra**, desarrollado en **Node.js** con conexión a **SQL Server (MSSQL)** y **SAP HANA**.  
Su propósito principal es generar notificaciones automáticas (por correo) sobre indicadores financieros y operativos —por ejemplo, **facturas con neto pendiente**— mediante plantillas HTML dinámicas.

---

## 🧱 Arquitectura General

```
+-----------------------------+
| SAP HANA / SQL Server |
| (Datos de negocio y SPs) |
+-------------+---------------+
|
v
+-----------------------------+
| Node.js (Alarmas Suragra) |
| ├─ Lógica modular (NETO/IVA)|
| ├─ Render HTML + placeholders|
| ├─ Conexión MSSQL/HANA |
| ├─ Envío de correo SES |
| └─ Logging estructurado |
+-------------+---------------+
|
v
+-----------------------------+
| AWS Simple Email Service |
| (Correos transaccionales) |
+-----------------------------+
```

---

## ⚙️ Stack Tecnológico

| Componente | Tecnología |
|-------------|-------------|
| Backend | Node.js 20.x (ES Modules) |
| Base de datos | SQL Server 2019 / SAP HANA |
| Envío de correos | AWS SES (SDK v3) |
| Logging | Pino / Console JSON |
| Configuración | `.env` + `src/config/index.js` |
| Templates | HTML dinámicos con placeholders (`<<CLIENTE>>`, `<<TOTAL>>`, `<<FACTURAS>>`) |
| Entorno | AWS EC2 / Docker |

---

## 📂 Estructura de Carpetas

```
src/
├── assets/
│ └── logo-suragra.png # Logo embebido en correos
├── common/
│ └── mailer.js # Cliente AWS SES + lógica inline CID
├── config/
│ └── index.js # Config global (.env, rutas, logoPath, etc.)
├── db/
│ ├── factory.js # Selección MSSQL/HANA
│ ├── mssql.js # Conexión SQL Server
│ └── hana.js # Conexión SAP HANA
├── logging/
│ └── logger.js # Logger Pino estructurado
├── modules/
│ └── neto/
│ ├── neto.service.js # Orquestación de envío NETO
│ ├── neto.repository.mssql.js
│ ├── neto.job.js # Ejecutable del job
│ └── templates/
│ ├── NMOR.html
│ ├── IMOR.html
│ └── RFAC.html
└── scripts/
└── send-test.js # Prueba rápida de correo SES
```

---


---

## 🔐 Variables de Entorno (.env)

Ejemplo:

```bash
# Base de datos MSSQL
MSSQL_HOST=localhost
MSSQL_DB=bd_sgra
MSSQL_USER=usr_cna2
MSSQL_PASS=usr_cna2
MSSQL_PORT=1433

# SAP HANA (solo si DB_SOURCE=HANA)
HANA_HOST=hana.cluster.company.com
HANA_PORT=39015
HANA_USER=HDB_USER
HANA_PASS=supersecret
HANA_SSL=true

# AWS SES
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SES_FROM="Cobranza Suragra <cobranza@suragra.com>"
SES_CC=aracelli@suragra.com,marcoantonio@suragra.com,cinthia@suragra.com,priscilla@suragra.com
SES_TEST_RECIPIENTS=jadcve@gmail.com
FALLBACK_RECIPIENT=jadcve@gmail.com

# Configuración general
DB_SOURCE=MSSQL
TZ=America/Santiago
ALT_TEST=0           # 0 = Modo test (solo correos de prueba)
DRY_RUN=false        # true = No envía correos reales
HEALTH_REPORT_RECIPIENT=tu@correo.com  # destinatario exclusivo del reporte diario de salud
LOGO_PATH=src/assets/logo-suragra.png

```

---

## 🧪 Pruebas de Envío de Correo (Local)

Ejecuta el script de prueba:

```bash
node send-test.js
```

Resultado esperado:

```
✅ Correo enviado correctamente
SES MessageId: 01010192bcd1234a-5f66a2d5-aed2-4ff9-a0a1-abc123456789
```

---

## 📨 Flujo del Módulo NETO

1. **Obtiene plantilla y asunto** desde `TA_SGRA_ALRTA_FLUJO_CNTBL`.
2. **Ejecuta SP** `SP_SGR_CNA_ALT_CTB_AMZ` para determinar campañas activas.
3. **Recupera clientes** con neto pendiente (`SP_SGR_CNA_CLT_ALT_AMZ_NETP`).
4. **Consulta contactos** (`SP_SGR_CNA_CTC_CLT_SAP`).
5. **Genera HTML dinámico** con `neto.template.js`.
6. **Envía correo** vía `AWS SES`.
7. **Registra log** en `SP_SGR_INS_TRZ_ALT`.

---

## 🐳 Docker

Ejemplo de build y ejecución local:

```bash
docker build -t alarmas-suragra .
docker run --env-file .env alarmas-suragra
```

---

## 🛠️ Ejecutarlo sin sesión abierta en Windows

Este proyecto ya incluye un servicio de Windows para dejar el scheduler corriendo en segundo plano.

```bash
npm run service:install
```

Para quitarlo:

```bash
npm run service:uninstall
```

El servicio ejecuta `src/index.js`, que deja activos los cron jobs de IVA, RESUMEN, NETO y HEARTBEAT aunque cierres tu sesión.

---

## 🧰 Scripts útiles

| Comando | Descripción |
|----------|--------------|
| `npm run dev` | Ejecuta la aplicación en modo desarrollo |
| `node send-test.js` | Envía correo de prueba SES |
| `npm run lint` | Linter y formateo del código |
| `npm run build` | Compila para despliegue (si aplica) |

---

## 👨‍💻 Autor

**José Alain Díaz Carrero**  
Líder Técnico & Fullstack Engineer  
📍 Santiago, Chile  
💼 [LinkedIn](https://www.linkedin.com/in/jadcve/)  
📧 jadcve@gmail.com  

---

## 🛡️ Licencia
© 2025 Meritech Solutions. Todos los derechos reservados.  
Este repositorio es de uso interno y no se distribuye públicamente.
