import 'dotenv/config';
console.log({
  DB_SOURCE: process.env.DB_SOURCE,
  MSSQL_SERVER: process.env.MSSQL_SERVER,
  MSSQL_HOST: process.env.MSSQL_HOST,
  MSSQL_DATABASE: process.env.MSSQL_DATABASE,
  MSSQL_USER: process.env.MSSQL_USER,
  MSSQL_PORT: process.env.MSSQL_PORT
});
