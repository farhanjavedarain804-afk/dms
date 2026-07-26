import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

// Read .env file manually to populate process.env
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.warn('Failed to parse .env file manually:', e);
}

const connectionConfig = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'u168718068_dms_user',
  password: process.env.DB_PASS ?? 'Furhan@4457&899aBc',
  database: process.env.DB_NAME ?? 'u168718068_dms',
  multipleStatements: true,
};

function cleanAndConvertPostgresToMysql(pgSql: string): string[] {
  // Split statements by semicolon
  const rawStatements = pgSql.split(';');
  const mysqlStatements: string[] = [];

  for (let stmt of rawStatements) {
    stmt = stmt.trim();
    if (!stmt) continue;

    // Ignore pg-specific commands and permissions
    if (
      /^\s*(grant|revoke|alter\s+table\s+\S+\s+enable|create\s+policy|alter\s+publication|select\s+cron|create\s+function|create\s+or\s+replace\s+function|create\s+trigger)/i.test(stmt)
    ) {
      continue;
    }

    // Skip trigger helper execution/definition statements
    if (
      /returns\s+trigger|language\s+plpgsql|execute\s+procedure/i.test(stmt)
    ) {
      continue;
    }

    // Basic PG schema to MySQL conversion rules
    let mysqlStmt = stmt
      .replace(/public\./g, '') // remove public. schema prefix
      .replace(/bigint\s+generated\s+always\s+as\s+identity\s+primary\s+key/gi, 'bigint AUTO_INCREMENT PRIMARY KEY')
      .replace(/bigint\s+generated\s+by\s+default\s+as\s+identity\s+primary\s+key/gi, 'bigint AUTO_INCREMENT PRIMARY KEY')
      .replace(/serial\s+primary\s+key/gi, 'int AUTO_INCREMENT PRIMARY KEY')
      .replace(/bigserial\s+primary\s+key/gi, 'bigint AUTO_INCREMENT PRIMARY KEY')
      .replace(/timestamptz/gi, 'datetime')
      .replace(/timestamp\s+with\s+time\s+zone/gi, 'datetime')
      .replace(/timestamp\s+without\s+time\s+zone/gi, 'datetime')
      .replace(/now\(\)/gi, 'CURRENT_TIMESTAMP')
      .replace(/uuid_generate_v4\(\)/gi, '(uuid())')
      .replace(/uuid/gi, 'varchar(36)')
      .replace(/jsonb/gi, 'json')
      .replace(/boolean/gi, 'tinyint(1)')
      .replace(/text\s*\[\s*\]/gi, 'json')
      .replace(/varchar\s*\[\s*\]/gi, 'json')
      .replace(/numeric/gi, 'decimal(15,2)')
      .replace(/without\s+time\s+zone/gi, '')
      .replace(/references\s+\S+\(id\)\s+on\s+delete\s+cascade/gi, (match) => {
        return match.replace(/public\./gi, '');
      });

    // Make sure we don't carry over any syntax that starts with PL/pgSQL dollar quotes
    if (mysqlStmt.includes('$$')) {
      continue;
    }

    // If it's a create table, make sure ID columns that are primary keys are signed properly if referenced,
    // or just let MySQL defaults handle them.
    if (/create\s+table/i.test(mysqlStmt)) {
      // Add InnoDB engine option
      mysqlStmt = `${mysqlStmt} ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
    }

    mysqlStatements.push(mysqlStmt);
  }

  return mysqlStatements;
}

async function run() {
  console.log('Parsing PostgreSQL migrations to generate MySQL schema dump...');

  const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found at', migrationsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} PostgreSQL migration files to parse.`);
  
  let combinedSqlDump = `-- Auto-generated MySQL Schema\n\n`;
  combinedSqlDump += `CREATE TABLE IF NOT EXISTS app_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  role VARCHAR(100) DEFAULT 'Member',
  password_hash VARCHAR(64) NOT NULL,
  salt VARCHAR(64) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  combinedSqlDump += `CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(96) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  const parsedStatements: string[] = [];

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const mysqlStatements = cleanAndConvertPostgresToMysql(content);
    for (const sql of mysqlStatements) {
      if (!sql.trim()) continue;
      combinedSqlDump += sql + ';\n\n';
      parsedStatements.push(sql);
    }
  }

  // Save the full schema to a file for easy manual import on Hostinger
  const dumpPath = path.join(process.cwd(), 'mysql_schema.sql');
  fs.writeFileSync(dumpPath, combinedSqlDump);
  console.log(`\n✅ Saved complete MySQL schema to: ${dumpPath}\n(You can import this file directly into phpMyAdmin on Hostinger!)\n`);

  console.log('Connecting to MySQL database to execute migrations locally...');
  let conn;
  try {
    conn = await mysql.createConnection(connectionConfig);
    console.log('Connected successfully!');
  } catch (err) {
    console.error('Failed to connect to local database, but schema file was created successfully.');
    console.error(err);
    return;
  }

  // Ensure app_users, user_sessions exist first
  console.log('Ensuring core auth tables...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255),
      role VARCHAR(100) DEFAULT 'Member',
      password_hash VARCHAR(64) NOT NULL,
      salt VARCHAR(64) NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(96) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  for (const file of files) {
    console.log(`Processing migration file: ${file}`);
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    const mysqlStatements = cleanAndConvertPostgresToMysql(content);
    for (const sql of mysqlStatements) {
      try {
        if (!sql.trim()) continue;
        console.log(`Executing SQL: ${sql.slice(0, 100)}...`);
        await conn.query(sql);
      } catch (err: any) {
        if (err.errno === 1050) {
          console.log(`Table already exists, skipping.`);
        } else if (err.errno === 1060) {
          console.log(`Column already exists, skipping.`);
        } else if (err.errno === 1061) {
          console.log(`Key/index name already exists, skipping.`);
        } else if (err.errno === 1091) {
          console.log(`Drop key/column failed because it does not exist, skipping.`);
        } else {
          console.warn(`Warning executing statement: ${err.message}`);
          console.warn(`Failed statement was: ${sql}`);
        }
      }
    }
  }

  // Seed Admin User if not present
  console.log('Seeding admin user if not exists...');
  const [users]: any = await conn.query('SELECT id FROM app_users WHERE email = ?', ['farhanjaved357@gmail.com']);
  if (users.length === 0) {
    const crypto = await import('crypto');
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update('Fur@8899' + salt).digest('hex');
    await conn.query(
      'INSERT INTO app_users (email, name, role, password_hash, salt) VALUES (?, ?, ?, ?, ?)',
      ['farhanjaved357@gmail.com', 'Ch. Farhan Javed', 'Super Admin', hash, salt]
    );
    console.log('Admin user successfully seeded!');
  } else {
    console.log('Admin user already exists.');
  }

  console.log('Database initialization completed successfully!');
  await conn.end();
}

run().catch(err => {
  console.error('Initialization failed:', err);
  process.exit(1);
});
