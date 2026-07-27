const { createHash, randomBytes } = require('crypto');
const password = 'Fur@8899';
const salt = randomBytes(32).toString('hex');
const hash = createHash('sha256').update(password + salt).digest('hex');
console.log('SALT:', salt);
console.log('HASH:', hash);
console.log('\n--- Run this SQL on your MySQL database ---\n');
const sql = `INSERT INTO app_users (email, name, role, password_hash, salt, is_active)
VALUES ('farhanjaved357@gmail.com', 'Farhan Javed', 'Super Admin', '${hash}', '${salt}', 1)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  salt = VALUES(salt),
  role = 'Super Admin',
  is_active = 1;`;
console.log(sql);
