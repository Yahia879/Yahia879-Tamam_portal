import fs from 'fs';

const filePath = 'drizzle/schema.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Ensure datetime is in imports
if (!content.includes('datetime')) {
    content = content.replace('timestamp,', 'timestamp, datetime,');
}

// Replace all timestamp("...") with datetime("...")
// We keep .defaultNow() etc. as they work with datetime too
content = content.replace(/timestamp\("([^"]+)"\)/g, 'datetime("$1")');

fs.writeFileSync(filePath, content);
console.log('✅ Schema file: All timestamps converted to datetime');
