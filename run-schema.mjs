import fs from 'fs';
import mysql from 'mysql2/promise';


async function run() {
  const sql = fs.readFileSync('src/lib/schema.sql', 'utf8');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
  });
  
  console.log('Connected to MySQL. Executing schema.sql...');
  await connection.query(sql);
  console.log('Schema imported successfully.');
  
  await connection.end();
}

run().catch(err => {
  console.error("Failed to run schema:", err);
  process.exit(1);
});
