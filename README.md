# 🚨 Alarmas Suragra

Sistema de alertas automatizadas para la compañía **Suragra**, desarrollado en **Node.js** con conexión a **SQL Server (MSSQL)** y **SAP HANA**.  
Su propósito principal es generar notificaciones automáticas (por correo) sobre indicadores financieros y operativos —por ejemplo, **facturas con neto pendiente**— mediante plantillas HTML dinámicas.

---

## 🧱 Arquitectura General

```
+-------------------------+
| SAP HANA / SQL Server   |
| (Datos origen)          |
+-----------+-------------+
            |
            v
+-------------------------+
| Node.js (Alarmas Suragra)
|  ├─ src/
|  │  ├─ modules/
|  │  │  ├─ neto/
|  │  │  └─ iva/
|  │  ├─ adapters/
|  │  │  └─ ses.adapter.js   ← Envío de correos AWS SES
|  │  ├─ config/
|  │  │  └─ index.js         ← Variables de entorno y conexión
|  │  └─ logging/
|  └─ utils/
+-------------------------+
            |
            v
+-------------------------+
| AWS Simple Email Service |
| (notificaciones automáticas)
+-------------------------+
```

---

## ⚙️ Stack Tecnológico

| Componente | Tecnología |
|-------------|-------------|
| Backend principal | Node.js 20.x |
| Base de datos | SQL Server 2019 / SAP HANA |
| Correo transaccional | AWS SES (SDK v3) |
| Entorno | AWS EC2 / Docker |
| Logging | Winston / Console |
| Configuración | Variables `.env` manejadas desde `src/config/index.js` |

---

## 📂 Estructura de Carpetas

```
src/
├── adapters/
│   └── ses.adapter.js           # Integración con AWS SES
├── config/
│   └── index.js                 # Configuración y lectura de entorno
├── logging/
│   └── logger.js                # Logger centralizado
├── modules/
│   ├── neto/
│   │   ├── neto.service.js      # Lógica principal de envío de alertas NETO
│   │   ├── neto.repository.mssql.js
│   │   ├── neto.repository.js
│   │   └── neto.template.js
│   └── iva/                     # Futuro módulo de alertas IVA
├── tools/
│   └── export-templates.js
└── utils/
    └── index.js
```

---

## 🔐 Variables de Entorno (.env)

Ejemplo de configuración local:

```bash
# Base de datos MSSQL
MSSQL_HOST=34.227.19.226
MSSQL_DB=bd_sgra
MSSQL_USER=usr_cna2
MSSQL_PASS=usr_cna2

# SAP HANA (para futuras integraciones)
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

# Configuración general
DB_SOURCE=MSSQL
TZ=America/Santiago
TEST_RECIPIENTS=jxxxx@mail.com
DRY_RUN=false
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
© 2025 Suragra. Todos los derechos reservados.  
Este repositorio es de uso interno y no se distribuye públicamente.
