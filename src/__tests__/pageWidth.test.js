import fs from 'fs';
import path from 'path';

/**
 * Admin pages fill the width the dashboard gives them (`.form-fill-width`, i.e. -webkit-fill-available)
 * instead of sitting in a centred, width-capped column. A page wrapper written as
 * `max-w-7xl mx-auto` (or 8xl / 6xl / 5xl / 4xl) would quietly bring the cap back.
 *
 * The exceptions are documents that must keep a paper width for printing, and the login / OTP cards.
 */
const SRC = path.join(__dirname, '..');
const ALLOWED = new Set([
  'pages/roll-numbers/RollNumberPublicSlip.jsx', // printed slip
  'pages/roll-numbers/RollSlipView.jsx',         // printed slip
  'pages/settings/Subject/SubjectsSyllabus.jsx', // printed syllabus sheet
]);

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(full);
  return /\.jsx$/.test(entry.name) && !/ copy\./.test(entry.name) ? [full] : [];
});

const CAPPED_WRAPPER = /className=(?:"|\{`)[^"`]*\b(?:max-w-(?:8xl|7xl|6xl|5xl|4xl)|max-w-\[1[0-9]{3}px\])\b[^"`]*\bmx-auto\b|className=(?:"|\{`)[^"`]*\bmx-auto\b[^"`]*\b(?:max-w-(?:8xl|7xl|6xl|5xl|4xl)|max-w-\[1[0-9]{3}px\])\b/;

describe('admin page width', () => {
  it('has no width-capped, centred page wrapper (use form-fill-width)', () => {
    const offenders = [];
    for (const dir of ['pages', 'components/layouts']) {
      for (const file of walk(path.join(SRC, dir))) {
        const rel = path.relative(SRC, file).split(path.sep).join('/');
        if (ALLOWED.has(rel)) continue;
        fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
          if (CAPPED_WRAPPER.test(line)) offenders.push(`${rel}:${i + 1}`);
        });
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the fill-available rule that the pages rely on', () => {
    const css = fs.readFileSync(path.join(SRC, 'index.css'), 'utf8');
    expect(css).toMatch(/\.form-fill-width\s*\{[^}]*width:\s*-webkit-fill-available/);
    expect(css).toMatch(/\.form-fill-width\s*\{[^}]*max-width:\s*none/);
  });
});
