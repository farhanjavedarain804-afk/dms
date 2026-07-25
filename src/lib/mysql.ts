import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  database: process.env.DB_NAME ?? 'u168718068_dms',
  user: process.env.DB_USER ?? 'u168718068_dms_user',
  password: process.env.DB_PASS ?? 'Furhan@4457&899aBc',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+00:00',
  multipleStatements: false,
});

export async function query<T = any>(sql: string, values?: any[]): Promise<T[]> {
  const [rows] = await pool.execute<any>(sql, values);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, values?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, values);
  return (rows as any[])[0] ?? null;
}

export async function execute(sql: string, values?: any[]): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute<mysql.ResultSetHeader>(sql, values);
  return result;
}

export default pool;
