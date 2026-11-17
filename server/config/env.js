'use strict';
/**
 * Loads environment variables from .env and makes sure a JWT secret exists.
 * Must be required before anything else that reads process.env.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..', '..');
const envPath = path.join(root, '.env');

require('dotenv').config({ path: envPath });

const PLACEHOLDER = 'change_this_to_a_long_random_string';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === PLACEHOLDER) {
  // Beginner-friendly: generate a strong secret and store it in .env so tokens stay valid across restarts.
  const secret = crypto.randomBytes(48).toString('hex');
  try {
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    if (/^JWT_SECRET=.*$/m.test(content)) {
      content = content.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
    } else {
      if (content && !content.endsWith('\n')) content += '\n';
      content += `JWT_SECRET=${secret}\n`;
    }
    fs.writeFileSync(envPath, content);
    console.log('A new JWT_SECRET was generated and saved to .env');
  } catch (err) {
    console.warn('Could not write .env (' + err.message + '). Using a temporary secret; logins will reset on restart.');
  }
  process.env.JWT_SECRET = secret;
}

module.exports = {
  root,
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET,
  isProd: process.env.NODE_ENV === 'production',
  dbPath: path.resolve(root, process.env.DB_PATH || 'database/spendwise.db'),
};
