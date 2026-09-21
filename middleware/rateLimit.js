/** 登录失败计数 + 临时锁定（内存实现） */

const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15分钟

// key: username, value: { count, lockedUntil }
const attempts = new Map();

function checkLocked(username) {
  const record = attempts.get(username);
  if (!record) return null;
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    const remaining = Math.ceil((record.lockedUntil - Date.now()) / 1000 / 60);
    return `账号已被临时锁定，请在 ${remaining} 分钟后重试`;
  }
  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    attempts.delete(username);
  }
  return null;
}

function recordFailure(username) {
  const record = attempts.get(username) || { count: 0, lockedUntil: null };
  record.count++;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCK_DURATION;
  }
  attempts.set(username, record);
  return record;
}

function clearFailures(username) {
  attempts.delete(username);
}

function getRemainingAttempts(username) {
  const record = attempts.get(username);
  if (!record || (record.lockedUntil && Date.now() >= record.lockedUntil)) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - record.count);
}

module.exports = { checkLocked, recordFailure, clearFailures, getRemainingAttempts, MAX_ATTEMPTS };
