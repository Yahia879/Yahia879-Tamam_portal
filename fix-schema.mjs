import fs from 'fs';

const filePath = 'drizzle/schema.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Adding datetime to imports if not already there
if (!content.includes(', datetime }')) {
    content = content.replace('} from "drizzle-orm/mysql-core"', ', datetime } from "drizzle-orm/mysql-core"');
}

// Regex to find timestamp columns that don't have .notNull() or .defaultNow()
// This is a bit tricky with regex, but we can try to find timestamp("...") 
// and check what follows it.
// Alternatively, let's just target the ones that caused issues or look like they will.

const tablesWithIssues = [
    'dueDate',
    'paidAt',
    'reviewedAt',
    'approvedAt',
    'completedAt',
    'rejectedAt',
    'closedAt',
    'lastSignedIn',
    'deletedAt'
];

for (const field of tablesWithIssues) {
    const regex = new RegExp(`timestamp\\("${field}"\\)`, 'g');
    content = content.replace(regex, `datetime("${field}")`);
}

fs.writeFileSync(filePath, content);
console.log('✅ Schema file updated with datetime for problematic fields');
