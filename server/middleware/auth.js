'use strict';
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { jwtSecret, isProd } = require('../config/env');

const COOKIE_NAME = 'token';
const getUserById = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?');

/** Creates a signed JWT. "Remember me" keeps the login for 30 days, otherwise 1 day (cookie ends with the browser session). */
function signToken(userId, remember) {
  return jwt.sign({ sub: String(userId) }, jwtSecret, {
    algorithm: 'HS256',
    expiresIn: remember ? '30d' : '1d',
  });
}

function setAuthCookie(res, userId, remember) {
  const options = {
    httpOnly: true, // JavaScript in the browser can never read this cookie
    sameSite: 'lax',
    secure: isProd,
    path: '/',
  };
  if (remember) options.maxAge = 30 * 24 * 60 * 60 * 1000;
  res.cookie(COOKIE_NAME, signToken(userId, remember), options);
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/' });
}

/** Returns the logged-in user (from a valid cookie) or null. The user must still exist in the database. */
function userFromRequest(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    return getUserById.get(Number(payload.sub)) || null;
  } catch (err) {
    return null;
  }
}

/** Protects API routes: responds 401 JSON when not logged in. */
function requireAuth(req, res, next) {
  const user = userFromRequest(req);
  if (!user) return res.status(401).json({ message: 'Please log in to continue.' });
  req.user = user;
  next();
}

/** Protects HTML pages: redirects to the login page when not logged in. */
function requirePageAuth(req, res, next) {
  const user = userFromRequest(req);
  if (!user) return res.redirect('/login.html');
  req.user = user;
  next();
}

/** Login/Register pages: send already-logged-in users straight to the dashboard. */
function redirectIfAuthed(req, res, next) {
  if (userFromRequest(req)) return res.redirect('/dashboard.html');
  next();
}

module.exports = {
  requireAuth,
  requirePageAuth,
  redirectIfAuthed,
  userFromRequest,
  setAuthCookie,
  clearAuthCookie,
};
