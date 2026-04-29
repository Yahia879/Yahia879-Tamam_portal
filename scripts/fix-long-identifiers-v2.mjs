import fs from 'fs';
import path from 'path';

const drizzleDir = './drizzle';

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      walk(filePath, callback);
    } else {
      callback(filePath);
    }
  }
}

const longIdents = new Set();

walk(drizzleDir, (filePath) => {
  if (filePath.endsWith('.sql') || filePath.endsWith('.json')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(/`[^`]{65,}`/g);
    if (matches) {
      matches.forEach(m => longIdents.add(m.slice(1, -1)));
    }
    // Also check for quoted names in JSON
    const jsonMatches = content.match(/"[^"]{65,}"/g);
    if (jsonMatches) {
        jsonMatches.forEach(m => longIdents.add(m.slice(1, -1)));
    }
  }
});

console.log('Found long identifiers:', Array.from(longIdents));

const replacements = {};
longIdents.forEach(id => {
  // Simple shortening logic: take first 30, last 30, and join with _
  if (id.length > 64) {
      const shortened = id.slice(0, 30) + '_' + id.slice(-30);
      replacements[id] = shortened.slice(0, 64);
  }
});

walk(drizzleDir, (filePath) => {
  if (filePath.endsWith('.sql') || filePath.endsWith('.json')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const [oldName, newName] of Object.entries(replacements)) {
      if (content.includes(oldName)) {
        content = content.split(oldName).join(newName);
        changed = true;
      }
    }
    if (changed) {
      console.log(`Updated ${filePath}`);
      fs.writeFileSync(filePath, content);
    }
  }
});

console.log('Finished shortening all long identifiers.');
