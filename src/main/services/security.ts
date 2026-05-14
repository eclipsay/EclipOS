const dangerousPatterns = [
  /\brm\s+-rf\b/i,
  /\bdel\s+\/[sq]\b/i,
  /\brmdir\s+\/s\b/i,
  /\bformat\b/i,
  /\bdiskpart\b/i,
  /\bRemove-Item\b.*\b-Recurse\b/i,
  /\bshutdown\b/i,
  /\brestart-computer\b/i,
  />\s*[A-Za-z]:\\/i
];

const sensitivePatterns = [
  /password\s*[:=]/i,
  /api[_-]?key\s*[:=]/i,
  /secret\s*[:=]/i,
  /token\s*[:=]/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:\d[ -]*?){13,19}\b/
];

export function isDangerousCommand(command: string): boolean {
  return dangerousPatterns.some((pattern) => pattern.test(command));
}

export function isSensitiveClipboard(text: string): boolean {
  if (text.length > 12000) return true;
  return sensitivePatterns.some((pattern) => pattern.test(text));
}
