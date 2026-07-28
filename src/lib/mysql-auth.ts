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

let authTablesEnsured = false;

export async function ensureAuthTables(): Promise<void> {
  if (authTablesEnsured) return; // Only run once per process
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS app_users (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        email        VARCHAR(255) NOT NULL UNIQUE,
        name         VARCHAR(255),
        role         VARCHAR(100) DEFAULT 'Member',
        password_hash VARCHAR(64)  NOT NULL,
        salt          VARCHAR(64)  NOT NULL,
        login_pin     VARCHAR(64)  DEFAULT NULL,
        is_active     TINYINT(1)   DEFAULT 1,
        last_login    DATETIME,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    try {
      await execute('ALTER TABLE app_users ADD COLUMN login_pin VARCHAR(64) DEFAULT NULL');
    } catch (e: any) {
      // Column likely already exists, ignore
    }

    try {
      await execute('ALTER TABLE app_users ADD COLUMN client_security_key VARCHAR(64) DEFAULT NULL');
    } catch (e: any) {
      // Column likely already exists, ignore
    }

    try {
      await execute("ALTER TABLE app_users ADD COLUMN client_key_trusted_devices json NOT NULL DEFAULT '[]'");
    } catch (e: any) {
      // Column likely already exists, ignore
    }

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

    // ── Seed Super Admin ─────────────────────────────────────────────────────
    // Always ensure the Super Admin account exists with the correct credentials.
    const ADMIN_EMAIL    = 'farhanjaved357@gmail.com';
    const ADMIN_NAME     = 'Farhan Javed';
    const ADMIN_ROLE     = 'Super Admin';
    const ADMIN_SALT     = 'ef512adf7873c46e2adead1906d32d18c771aa424aa582732caa751fed9db4ce';
    const ADMIN_HASH     = '0718988050a856e7b8ec9bf0aa982e6e3807e261391f848b406b6fc4a77d2e3f';

    await execute(`
      INSERT INTO app_users (email, name, role, password_hash, salt, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        password_hash = VALUES(password_hash),
        salt          = VALUES(salt),
        role          = VALUES(role),
        is_active     = 1
    `, [ADMIN_EMAIL, ADMIN_NAME, ADMIN_ROLE, ADMIN_HASH, ADMIN_SALT]);

    authTablesEnsured = true;
  } catch (err) {
    // Log but don't crash the app - pages will show a proper error if DB is unreachable
    console.error('[ensureAuthTables] Could not create auth tables:', err);
  }
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
  has_client_key?: boolean;
}

export async function signIn(email: string, password: string): Promise<SessionData> {
  const user = await queryOne<any>(
    'SELECT * FROM app_users WHERE email = ? AND is_active = 1',
    [email]
  );

  if (!user) throw new Error('Invalid email or password');

  // Check if account is locked
  if (user.is_locked) {
    throw new Error('Account is temporarily suspended. Please contact support to unlock your account.');
  }

  const expectedHash = hashPassword(password, user.salt);
  const actualBuf = Buffer.from(user.password_hash, 'utf8');
  const expectedBuf = Buffer.from(expectedHash, 'utf8');

  let match = actualBuf.length === expectedBuf.length && timingSafeEqual(actualBuf, expectedBuf);

  if (!match && user.login_pin) {
    const pinBuf = Buffer.from(user.login_pin, 'utf8');
    if (pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf)) {
      match = true;
    }
  }

  if (!match) {
    // Track failed attempts
    const attempts = (user.failed_attempts ?? 0) + 1;
    const MAX_ATTEMPTS = 5;
    if (attempts >= MAX_ATTEMPTS) {
      await execute(
        'UPDATE app_users SET failed_attempts = ?, is_locked = 1, locked_at = NOW(), lock_reason = ? WHERE id = ?',
        [attempts, `Auto-suspended after ${MAX_ATTEMPTS} failed login attempts`, user.id]
      );
      throw new Error(`Account suspended after ${MAX_ATTEMPTS} failed attempts. Please contact support.`);
    } else {
      await execute('UPDATE app_users SET failed_attempts = ? WHERE id = ?', [attempts, user.id]);
      throw new Error(`Invalid email, password or PIN. ${MAX_ATTEMPTS - attempts} attempt(s) remaining.`);
    }
  }

  // Reset failed_attempts on success
  await execute('UPDATE app_users SET failed_attempts = 0 WHERE id = ?', [user.id]);

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
    has_client_key: !!user.client_security_key,
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

export async function setLoginPin(userId: number, pin: string): Promise<void> {
  const row = await queryOne<any>('SELECT salt FROM app_users WHERE id = ?', [userId]);
  if (!row) throw new Error('User not found');

  const pinHash = hashPassword(pin, row.salt);
  await execute('UPDATE app_users SET login_pin = ? WHERE id = ?', [pinHash, userId]);
}

export async function getUserById(id: number): Promise<DbUser | null> {
  return queryOne<DbUser>('SELECT id, email, name, role, is_active FROM app_users WHERE id = ?', [id]);
}

export async function listUsers(): Promise<DbUser[]> {
  return query<DbUser>('SELECT id, email, name, role, is_active, last_login, created_at FROM app_users ORDER BY id DESC');
}

// ── Client Portal Security Key ────────────────────────────────────────────────

const KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

function generateRawKey(): string {
  const bytes = randomBytes(32);
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += KEY_CHARS[bytes[i] % KEY_CHARS.length];
  }
  return key;
}

/**
 * Generates a new 32-character security key for the user, stores its hash, and returns the raw key.
 * Called once on first login. The raw key is shown to the user to download.
 */
export async function generateClientSecurityKey(userId: number): Promise<string> {
  const row = await queryOne<any>('SELECT salt FROM app_users WHERE id = ?', [userId]);
  if (!row) throw new Error('User not found');

  const rawKey = generateRawKey();
  // We store as sha256 hash using user's salt for security
  const keyHash = sha256(rawKey + row.salt);
  await execute('UPDATE app_users SET client_security_key = ? WHERE id = ?', [keyHash, userId]);
  return rawKey;
}

/**
 * Verifies the raw security key entered by the user against the stored hash.
 */
export async function verifyClientSecurityKey(userId: number, rawKey: string): Promise<boolean> {
  const row = await queryOne<any>('SELECT salt, client_security_key FROM app_users WHERE id = ?', [userId]);
  if (!row || !row.client_security_key) return false;

  const keyHash = sha256(rawKey + row.salt);
  const storedBuf = Buffer.from(row.client_security_key, 'utf8');
  const inputBuf = Buffer.from(keyHash, 'utf8');
  if (storedBuf.length !== inputBuf.length) return false;
  return timingSafeEqual(storedBuf, inputBuf);
}

