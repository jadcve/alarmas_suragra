-- Ejecutar con cuenta sysadmin en SQL Server
-- Objetivo: reparar linked server HANA_SGR_LINK para consultas a SURAGRA/NORAGRA.OINV

DECLARE @server sysname = N'HANA_SGR_LINK';

SELECT name, product, provider, data_source
FROM sys.servers
WHERE name = @server;

EXEC master.dbo.sp_serveroption @server=@server, @optname='data access', @optvalue='true';
EXEC master.dbo.sp_serveroption @server=@server, @optname='rpc', @optvalue='true';
EXEC master.dbo.sp_serveroption @server=@server, @optname='rpc out', @optvalue='true';
EXEC master.dbo.sp_serveroption @server=@server, @optname='use remote collation', @optvalue='true';
EXEC master.dbo.sp_serveroption @server=@server, @optname='collation compatible', @optvalue='false';
EXEC master.dbo.sp_serveroption @server=@server, @optname='connect timeout', @optvalue='30';
EXEC master.dbo.sp_serveroption @server=@server, @optname='query timeout', @optvalue='600';

-- Validar login remoto (reemplazar credenciales)
-- EXEC master.dbo.sp_addlinkedsrvlogin
--   @rmtsrvname = @server,
--   @useself = 'false',
--   @locallogin = NULL,
--   @rmtuser = 'HANA_USER',
--   @rmtpassword = 'HANA_PASSWORD';

-- Probar linked server
EXEC master.dbo.sp_testlinkedserver @servername=@server;

-- Pruebas de lectura mínimas
SELECT TOP 1 *
FROM OPENQUERY([HANA_SGR_LINK], 'SELECT "DocEntry" FROM "SURAGRA"."OINV" LIMIT 1');

SELECT TOP 1 *
FROM OPENQUERY([HANA_SGR_LINK], 'SELECT "DocEntry" FROM "NORAGRA"."OINV" LIMIT 1');
