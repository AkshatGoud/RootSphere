import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import translate from 'google-translate-api-x';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, '..', 'src', 'i18n', 'locales');

const NAMESPACES = ['common'];

const TARGET_LANGS = [
  { code: 'hi', google: 'hi', name: 'Hindi' },
  { code: 'te', google: 'te', name: 'Telugu' },
  { code: 'ta', google: 'ta', name: 'Tamil' },
];

async function translateText(text, targetLang) {
  try {
    const result = await translate(text, { from: 'en', to: targetLang });
    return result.text;
  } catch (err) {
    console.warn(`  Failed to translate "${text}" to ${targetLang}: ${err.message}`);
    return text;
  }
}

async function main() {
  let totalAdded = 0;

  for (const ns of NAMESPACES) {
    const enPath = join(LOCALES_DIR, 'en', `${ns}.json`);
    const enKeys = JSON.parse(readFileSync(enPath, 'utf-8'));
    const enKeyList = Object.keys(enKeys);
    console.log(`[${ns}] Found ${enKeyList.length} English keys.`);

    for (const { code, google, name } of TARGET_LANGS) {
      const langPath = join(LOCALES_DIR, code, `${ns}.json`);
      let langKeys = {};
      try {
        langKeys = JSON.parse(readFileSync(langPath, 'utf-8'));
      } catch {
        // File doesn't exist yet
      }

      const missing = enKeyList.filter(key => !(key in langKeys));

      if (missing.length === 0) {
        console.log(`  ${name} (${code}): All keys present.`);
        continue;
      }

      console.log(`  ${name} (${code}): ${missing.length} missing keys. Translating...`);

      for (const key of missing) {
        const translated = await translateText(enKeys[key], google);
        langKeys[key] = translated;
        console.log(`    "${key}" => "${translated}"`);
        await new Promise(r => setTimeout(r, 200));
      }

      // Reorder keys to match English order
      const ordered = {};
      for (const key of enKeyList) {
        if (key in langKeys) ordered[key] = langKeys[key];
      }

      writeFileSync(langPath, JSON.stringify(ordered, null, 2) + '\n', 'utf-8');
      totalAdded += missing.length;
      console.log(`  Done: added ${missing.length} translations for ${name}.\n`);
    }
  }

  if (totalAdded === 0) {
    console.log('\nNo missing translations found. Everything is up to date!');
  } else {
    console.log(`\nTotal: ${totalAdded} new translations added.`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
