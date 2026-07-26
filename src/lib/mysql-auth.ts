/**
 * mysql-auth.ts
 * Custom JWT-based authentication backed by MySQL.
 * Replaces db.auth.signInWithPassword / db.auth.getSession / db.auth.signOut
 */

import { query, queryOne, execute } from './mysql';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

// ── Password helpers ─────────────────────────────────────────────────────────

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function hashPassword(password: string, salt: string): string {
  return sha256(password + salt);
}

// ── Token helpers ────────────────────────────────────────────────────────────

function generateToken(): string {
  return randomBytes(48).toString('hex');
}

const SESSION_TTL_HOURS = 24 * 7; // 7 days

// ── DB Schema Bootstrap ───────────────────────────────────────────────────────

export async function ensureAuthTables(): Promise<void> {
  await execute(`
    CREATE TABLE IF NOT EXISTS app_users (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      email        VARCHAR(255) NOT NULL UNIQUE,
      name         VARCHAR(255),
      role         VARCHAR(100) DEFAULT 'Member',
      password_hash VARCHAR(64)  NOT NULL,
      salt          VARCHAR(64)  NOT NULL,
      is_active     TINYINT(1)   DEFAULT 1,
      last_login    DATETIME,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      token      VARCHAR(96) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS user_login_logs (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT,
      email      VARCHAR(255),
      action     VARCHAR(50),
      ip         VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

// ── Auth operations ──────────────────────────────────────────────────────────

export interface DbUser {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: number;
}

export interface SessionData {
  user: DbUser;
  token: string;
  expires_at: string;
}

export async function signIn(email: string, password: string): Promise<SessionData> {
  const user = await queryOne<any>(
    'SELECT * FROM app_users WHERE email = ? AND is_active = 1',
    [email]
  );

  if (!user) throw new Error('Invalid email or password');

  const expectedHash = hashPassword(password, user.salt);
  const actualBuf = Buffer.from(user.password_hash, 'utf8');
  const expectedBuf = Buffer.from(expectedHash, 'utf8');

  const match =
    actualBuf.length === expectedBuf.length &&
    timingSafeEqual(actualBuf, expectedBuf);

  if (!match) throw new Error('Invalid email or password');

  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000);
  const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

  await execute(
    'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
    [user.id, token, expiresAtStr]
  );

  // Update last_login
  await execute('UPDATE app_users SET last_login = NOW() WHERE id = ?', [user.id]);

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role, is_active: user.is_active },
    token,
    expires_at: expiresAtStr,
  };
}

export async function getSession(token: string): Promise<SessionData | null> {
  if (!token) return null;

  const row = await queryOne<any>(
    `SELECT s.*, u.id as uid, u.email, u.name, u.role, u.is_active
     FROM user_sessions s
     JOIN app_users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > NOW()`,
    [token]
  );

  if (!row) return null;

  return {
    user: { id: row.uid, email: row.email, name: row.name, role: row.role, is_active: row.is_active },
    token: row.token,
    expires_at: row.expires_at,
  };
}

export async function signOut(token: string): Promise<void> {
  if (!token) return;
  await execute('DELETE FROM user_sessions WHERE token = ?', [token]);
}

export async function createUser(email: string, password: string, name: string, role = 'Member'): Promise<DbUser> {
  const existing = await queryOne<any>('SELECT id FROM app_users WHERE email = ?', [email]);
  if (existing) throw new Error('User with this email already exists');

  const salt = randomBytes(32).toString('hex');
  const passwordHash = hashPassword(password, salt);

  const result = await execute(
    'INSERT INTO app_users (email, name, role, password_hash, salt) VALUES (?, ?, ?, ?, ?)',
    [email, name, role, passwordHash, salt]
  );

  return { id: result.insertId, email, name, role, is_active: 1 };
}

export async function changePassword(userId: number, newPassword: string): Promise<void> {
  const salt = randomBytes(32).toString('hex');
  const passwordHash = hashPassword(newPassword, salt);
  await execute('UPDATE app_users SET password_hash = ?, salt = ? WHERE id = ?', [passwordHash, salt, userId]);
}

export async function getUserById(id: number): Promise<DbUser | null> {
  return queryOne<DbUser>('SELECT id, email, name, role, is_active FROM app_users WHERE id = ?', [id]);
}

export async function listUsers(): Promise<DbUser[]> {
  return query<DbUser>('SELECT id, email, name, role, is_active, last_login, created_at FROM app_users ORDER BY id DESC');
}
