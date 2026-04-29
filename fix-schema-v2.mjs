import fs from 'fs';

const filePath = 'drizzle/schema.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Ensure datetime is in imports
if (!content.includes('datetime')) {
    content = content.replace('timestamp,', 'timestamp, datetime,');
}

// Replace timestamp(...) with datetime(...) if NOT followed by .notNull() or .defaultNow()
// Using a function to handle the replacement logic
content = content.replace(/timestamp\("([^"]+)"\)(?!\.defaultNow\(\)| \.defaultNow\(\)|\.notNull\(\)| \.notNull\(\))/g, 'datetime("$1")');

fs.writeFileSync(filePath, content);
console.log('✅ Schema file processed systematically');
