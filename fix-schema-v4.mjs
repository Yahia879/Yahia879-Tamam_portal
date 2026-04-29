import fs from 'fs';

const filePath = 'drizzle/schema.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Revert all datetime to timestamp
content = content.replace(/datetime\("([^"]+)"\)/g, 'timestamp("$1")');

// Now systematically replace only those WITHOUT .defaultNow()
content = content.replace(/timestamp\("([^"]+)"\)(?!\.defaultNow\(\)| \.defaultNow\(\))/g, 'datetime("$1")');

// Ensure datetime is in imports
if (!content.includes('datetime')) {
    content = content.replace('timestamp,', 'timestamp, datetime,');
}

fs.writeFileSync(filePath, content);
console.log('✅ Schema file: Reverted and applied conditional datetime conversion');
