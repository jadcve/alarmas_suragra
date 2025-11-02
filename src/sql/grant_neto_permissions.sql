/*
  grant_neto_permissions.sql
  --------------------------
  Script para otorgar permisos mínimos al login 'usr_cna2' sobre la base de datos
  Suragra para que los jobs NETO puedan ejecutar los stored procedures necesarios.

  Recomendado: ejecutar con un usuario con privilegios (sa o similar) desde SSMS
  o desde sqlcmd.

  Acciones que realiza:
   - Crea el usuario de base de datos si no existe (asocia al LOGIN existente).
   - Otorga permiso EXECUTE sobre el esquema dbo (cubre todos los stored procs)
   - Opcional: agrega a roles db_datareader/db_datawriter si necesitas SELECT/INSERT/UPDATE

  Ajusta 'usr_cna2' y el nombre de la base [Suragra] si tu entorno difiere.
*/

USE [Suragra];
GO

-- 1) Crear usuario de base de datos si no existe (asume que el LOGIN 'usr_cna2' ya existe)
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'usr_cna2')
BEGIN
  PRINT 'Creando usuario de base de datos [usr_cna2]...';
  CREATE USER [usr_cna2] FOR LOGIN [usr_cna2];
END
ELSE
BEGIN
  PRINT 'Usuario [usr_cna2] ya existe en la base.';
END
GO

-- 2) Conceder permisos EXECUTE sobre el esquema dbo (ásí cubre todos los SPs existentes)
PRINT 'Concediendo permiso EXECUTE sobre SCHEMA::dbo a [usr_cna2]...';
GRANT EXECUTE ON SCHEMA::dbo TO [usr_cna2];
GO

-- 3) (Opcional) Dar roles de lectura/escritura si tus jobs necesitan SELECT/INSERT/UPDATE
-- Descomenta si deseas otorgar estos permisos
-- PRINT 'Agregando roles db_datareader y db_datawriter a [usr_cna2]...';
-- EXEC sp_addrolemember 'db_datareader', 'usr_cna2';
-- EXEC sp_addrolemember 'db_datawriter', 'usr_cna2';
-- GO

PRINT 'Script finalizado. Verifica que el login exista y que el usuario tenga los permisos necesarios.';
