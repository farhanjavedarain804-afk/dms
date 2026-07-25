import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
const outputFile = path.join(process.cwd(), 'mysql-schema.sql');

function cleanAndConvertPostgresToMysql(pgSql: string): string[] {
  const rawStatements = pgSql.split(';');
  const mysqlStatements: string[] = [];

  for (let stmt of rawStatements) {
    stmt = stmt.trim();
    if (!stmt) continue;

    if (
      /^\s*(grant|revoke|alter\s+table\s+\S+\s+enable|create\s+policy|alter\s+publication|select\s+cron|create\s+function|create\s+or\s+replace\s+function|create\s+trigger)/i.test(stmt)
    ) {
      continue;
    }

    if (
      /returns\s+trigger|language\s+plpgsql|execute\s+procedure/i.test(stmt)
    ) {
      continue;
    }

    let mysqlStmt = stmt
      .replace(/public\./g, '')
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
      .replace(/without\s+time\s+zone/gi, '');

    if (mysqlStmt.includes('$$')) {
      continue;
    }

    if (/create\s+table/i.test(mysqlStmt)) {
      mysqlStmt = `${mysqlStmt} ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
    }

    mysqlStatements.push(mysqlStmt);
  }

  return mysqlStatements;
}

function run() {
  let combinedSql = '';

  // 1. Add core auth tables
  combinedSql += `-- Core auth tables
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

CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(96) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_login_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  email VARCHAR(255),
  action VARCHAR(50),
  ip VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

`;

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    combinedSql += `-- Migration: ${file}\n`;
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const statements = cleanAndConvertPostgresToMysql(content);
    for (const sql of statements) {
      if (sql.trim()) {
        combinedSql += sql + ';\n';
      }
    }
    combinedSql += '\n';
  }

  // Seed default admin
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update('Fur@8899' + salt).digest('hex');
  combinedSql += `-- Seed admin user
INSERT INTO app_users (email, name, role, password_hash, salt) 
VALUES ('farhanjaved357@gmail.com', 'Ch. Farhan Javed', 'Super Admin', '${hash}', '${salt}')
ON DUPLICATE KEY UPDATE email=email;
`;

  fs.writeFileSync(outputFile, combinedSql, 'utf8');
  console.log(`Successfully generated MySQL SQL schema file at: ${outputFile}`);
}

run();
