// PHP can prepend upload startup notices before the application emits JSON.
// Remove only recognizable nonfatal PHP diagnostics, never an HTML page.
export const stripPhpDiagnostics = (text) => text.replace(
  /^(?:\s*<br\s*\/?>\s*<b>(?:Notice|Warning|Deprecated)<\/b>:\s*PHP\b[^\r\n]*?<br\s*\/?>\s*)+/i,
  '',
);

export const parseApiJsonText = (text) => JSON.parse(stripPhpDiagnostics(text));
