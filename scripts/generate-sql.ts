import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
const outputFile = path.join(process.cwd(), 'mysql-schema.sql');

function cleanAndConvertPostgresToMysql(pgSql: string): string[] {
  // ── Step 1: Strip dollar-quoted blocks ($$ ... $$) and everything around them ──
  // These are PL/pgSQL function bodies — not needed in MySQL
  pgSql = pgSql.replace(/\$\$[\s\S]*?\$\$/g, '');

  // ── Step 2: Strip CREATE OR REPLACE FUNCTION / CREATE FUNCTION blocks ──
  // Even after stripping $$, function signatures remain
  pgSql = pgSql.replace(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION[\s\S]*?(?=CREATE|ALTER|DROP|GRANT|REVOKE|INSERT|UPDATE|DELETE|$)/gi, '');

  // ── Step 3: Strip CREATE TRIGGER / DROP TRIGGER statements ──
  pgSql = pgSql.replace(/CREATE\s+(OR\s+REPLACE\s+)?TRIGGER[\s\S]*?(?=;)/gi, '');
  pgSql = pgSql.replace(/DROP\s+TRIGGER[\s\S]*?(?=;)/gi, '');

  // ── Step 4: Strip any remaining BEGIN...END blocks (PL/pgSQL artifacts) ──
  pgSql = pgSql.replace(/BEGIN[\s\S]*?END;/gi, '');

  // ── Step 5: Remove orphan PG keywords that might have survived ──
  pgSql = pgSql.replace(/^\s*RETURN\s+\w+\s*;?/gmi, '');
  pgSql = pgSql.replace(/^\s*END\s*;?/gmi, '');
  pgSql = pgSql.replace(/^\s*BEGIN\s*;?/gmi, '');
  pgSql = pgSql.replace(/^\s*DO\s*;?/gmi, '');

  // ── Step 6: Split and clean individual statements ──
  const rawStatements = pgSql.split(';');
  const mysqlStatements: string[] = [];

  for (let stmt of rawStatements) {
    stmt = stmt.trim();
    if (!stmt) continue;

    // Skip PG-specific DDL/DML that has no MySQL equivalent
    if (
      /^\s*(grant|revoke|alter\s+table\s+\S+\s+enable\s+row|create\s+policy|alter\s+publication|select\s+cron|create\s+function|create\s+or\s+replace\s+function|create\s+trigger|drop\s+trigger|comment\s+on)/i.test(stmt)
    ) {
      continue;
    }

    // Skip any leftover PG keywords as standalone statements
    if (/^\s*(return\s+new|return\s+old|return\s+null|end|begin|do)\s*$/i.test(stmt)) {
      continue;
    }

    // Skip if it still contains $$ (should be gone by now)
    if (stmt.includes('$$')) continue;

    // Skip if it references plpgsql or trigger internals
    if (/returns\s+trigger|language\s+plpgsql|execute\s+procedure|execute\s+function/i.test(stmt)) {
      continue;
    }

    // ── Convert PostgreSQL types/functions to MySQL equivalents ──
    let mysqlStmt = stmt
      .replace(/public\./g, '')
      .replace(/auth\.users\(id\)/gi, 'app_users(id)')
      .replace(/auth_user_id\s+varchar\(36\)/gi, 'auth_user_id BIGINT')
      .replace(/user_id\s+varchar\(36\)\s+NOT\s+NULL\s+REFERENCES\s+app_users/gi, 'user_id BIGINT NOT NULL REFERENCES app_users')
      .replace(/app_role/gi, 'VARCHAR(50)')
      .replace(/gen_random_uuid\(\)/gi, '(uuid())')
      .replace(/::[a-zA-Z0-9_]+/g, '')
      .replace(/DEFAULT\s+'\{\}'\[\]/gi, "DEFAULT '[]'")
      .replace(/DEFAULT\s+'\{\}'/gi, "DEFAULT '[]'")
      .replace(/varchar\(\d+\)\[\]/gi, 'json')
      .replace(/bigint\s+generated\s+always\s+as\s+identity\s+primary\s+key/gi, 'bigint AUTO_INCREMENT PRIMARY KEY')
      .replace(/bigint\s+generated\s+by\s+default\s+as\s+identity\s+primary\s+key/gi, 'bigint AUTO_INCREMENT PRIMARY KEY')
      .replace(/int\s+generated\s+always\s+as\s+identity\s+primary\s+key/gi, 'int AUTO_INCREMENT PRIMARY KEY')
      .replace(/serial\s+primary\s+key/gi, 'int AUTO_INCREMENT PRIMARY KEY')
      .replace(/bigserial\s+primary\s+key/gi, 'bigint AUTO_INCREMENT PRIMARY KEY')
      .replace(/timestamptz/gi, 'datetime')
      .replace(/timestamp\s+with\s+time\s+zone/gi, 'datetime')
      .replace(/timestamp\s+without\s+time\s+zone/gi, 'datetime')
      .replace(/\bnow\(\)/gi, 'CURRENT_TIMESTAMP')
      .replace(/uuid_generate_v4\(\)/gi, '(uuid())')
      .replace(/\(uuid\(\)\)/gi, '___TMP_UUID___')
      .replace(/\buuid\b/gi, 'varchar(36)')
      .replace(/___TMP_UUID___/gi, '(uuid())')
      .replace(/\bjsonb\b/gi, 'json')
      .replace(/\bboolean\b/gi, 'tinyint(1)')
      .replace(/\btrue\b/gi, '1')
      .replace(/\bfalse\b/gi, '0')
      .replace(/text\s*\[\s*\]/gi, 'json')
      .replace(/varchar\s*\[\s*\]/gi, 'json')
      .replace(/integer\s*\[\s*\]/gi, 'json')
      .replace(/\bnumeric\b/gi, 'decimal(15,2)')
      .replace(/without\s+time\s+zone/gi, '')
      .replace(/current_date/gi, 'CURDATE()')
      .replace(/ON\s+CONFLICT\s+DO\s+NOTHING/gi, '')
      .replace(/ON\s+CONFLICT\s+\([^)]+\)\s+DO\s+UPDATE[\s\S]*?(?=;|$)/gi, '')
      .replace(/REFERENCES\s+public\./gi, 'REFERENCES ');

    // Drop policies left over
    if (/^\s*DROP\s+POLICY/i.test(mysqlStmt)) continue;

    // Skip empty result after conversion
    if (!mysqlStmt.trim()) continue;

    // Add MySQL engine options to CREATE TABLE statements
    if (/^\s*create\s+table/i.test(mysqlStmt)) {
      mysqlStmt = `${mysqlStmt} ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
    }

    mysqlStatements.push(mysqlStmt);
  }

  return mysqlStatements;
}

function run() {
  let combinedSql = '';

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

  // Add custom authentication columns to app_users
  combinedSql += `-- Add custom authentication columns to app_users
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(128),
ADD COLUMN IF NOT EXISTS salt VARCHAR(64),
ADD COLUMN IF NOT EXISTS is_locked TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_at DATETIME,
ADD COLUMN IF NOT EXISTS lock_reason TEXT,
ADD COLUMN IF NOT EXISTS known_ips JSON,
ADD COLUMN IF NOT EXISTS pending_otp_hash VARCHAR(128),
ADD COLUMN IF NOT EXISTS pending_otp_ip VARCHAR(50),
ADD COLUMN IF NOT EXISTS pending_otp_expires_at DATETIME,
ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1;

-- Add user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token VARCHAR(96) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

  // Seed default admin
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update('Fur@8899' + salt).digest('hex');
  combinedSql += `\n-- Seed admin user
INSERT INTO app_users (email, full_name, username, role, password_hash, salt) 
VALUES ('farhanjaved357@gmail.com', 'Ch. Farhan Javed', 'farhan', 'Super Admin', '${hash}', '${salt}')
ON DUPLICATE KEY UPDATE email=email;
`;

  fs.writeFileSync(outputFile, combinedSql, 'utf8');
  console.log(`Successfully generated MySQL SQL schema file at: ${outputFile}`);
}

run();
