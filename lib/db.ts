import mysql from "mysql2/promise";

const rawHost = process.env.DB_HOST || "localhost";
const [parsedHost, hostPort] = rawHost.split(":");

export const db = mysql.createPool({
  host: parsedHost,
  port: Number(process.env.DB_PORT || hostPort || process.env.PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});