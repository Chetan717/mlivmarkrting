// Secure session manager — token-based with expiry.
// Uses sessionStorage (tab-scoped) as primary + localStorage as cross-tab fallback.
// Sessions expire after SESSION_TTL_MS to reduce risk of stale session abuse.

const SESSION_KEY   = "mteamUser";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// Sanitize a string value — strips any HTML tags
export function sanitizeStr(val) {
  if (typeof val !== "string") return val;
  return val.replace(/<[^>]*>/g, "").trim();
}

// Rate-limit tracker (in-memory, resets on refresh)
const _failMap = {};
const MAX_FAILS    = 5;
const LOCKOUT_MS   = 15 * 60 * 1000; // 15 minutes

export function recordLoginFail(mobile) {
  const now = Date.now();
  if (!_failMap[mobile]) _failMap[mobile] = { count: 0, since: now };
  _failMap[mobile].count += 1;
  _failMap[mobile].lastAt = now;
}

export function clearLoginFails(mobile) {
  delete _failMap[mobile];
}

export function isLockedOut(mobile) {
  const entry = _failMap[mobile];
  if (!entry) return false;
  if (entry.count < MAX_FAILS) return false;
  const elapsed = Date.now() - entry.lastAt;
  if (elapsed > LOCKOUT_MS) {
    delete _failMap[mobile];
    return false;
  }
  return true;
}

export function lockoutRemainingSeconds(mobile) {
  const entry = _failMap[mobile];
  if (!entry) return 0;
  const elapsed = Date.now() - entry.lastAt;
  const remaining = LOCKOUT_MS - elapsed;
  return Math.max(0, Math.ceil(remaining / 1000));
}

// Save session (no passwords/secrets stored)
export function saveSession(data) {
  // Never store password in session
  const { password: _pw, ...safe } = data;
  const session = {
    ...safe,
    _issuedAt:  Date.now(),
    _expiresAt: Date.now() + SESSION_TTL_MS,
  };
  try {
    const serialized = JSON.stringify(session);
    sessionStorage.setItem(SESSION_KEY, serialized);
    localStorage.setItem(SESSION_KEY, serialized);
  } catch (_) {}
  return session;
}

// Get session — returns null if missing or expired
export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || typeof session !== "object") return null;
    if (session._expiresAt && Date.now() > session._expiresAt) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// Clear session on logout
export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch (_) {}
}

// Extend expiry on activity
export function refreshSession() {
  try {
    const session = getSession();
    if (!session) return null;
    session._expiresAt = Date.now() + SESSION_TTL_MS;
    const serialized = JSON.stringify(session);
    sessionStorage.setItem(SESSION_KEY, serialized);
    localStorage.setItem(SESSION_KEY, serialized);
    return session;
  } catch {
    return null;
  }
}
