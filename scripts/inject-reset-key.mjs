// Injects EXPO_PUBLIC_SUPABASE_ANON_KEY into dist/reset.html after `expo export`.
// reset.html lives in public/ (copied verbatim to dist/) and must NOT carry a hardcoded key in the repo.
import { readFileSync, writeFileSync } from 'node:fs';

const PLACEHOLDER = '{{EXPO_PUBLIC_SUPABASE_ANON_KEY}}';
const file = 'dist/reset.html';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!key) {
  console.error('✗ EXPO_PUBLIC_SUPABASE_ANON_KEY not set — reset.html would ship broken. Failing build.');
  process.exit(1);
}

let html;
try {
  html = readFileSync(file, 'utf8');
} catch (e) {
  console.error(`✗ Cannot read ${file}: ${e.message}`);
  process.exit(1);
}

if (!html.includes(PLACEHOLDER)) {
  console.error(`✗ ${PLACEHOLDER} not found in ${file} — nothing to inject.`);
  process.exit(1);
}

writeFileSync(file, html.replace(PLACEHOLDER, key));
console.log('✓ Reset key injected into dist/reset.html');
