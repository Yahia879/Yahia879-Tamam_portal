import fs from 'fs';
import path from 'path';

const drizzleDir = './drizzle';
const files = fs.readdirSync(drizzleDir);

for (const file of files) {
  if (file.endsWith('.sql')) {
    const filePath = path.join(drizzleDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace timestamp with datetime, but keep (now()) and ON UPDATE if they exist
    // MySQL 5.7+ and 8.0+ support DEFAULT NOW() for DATETIME
    const updatedContent = content.replace(/\btimestamp\b/g, 'datetime');
    
    if (content !== updatedContent) {
      console.log(`Updated ${file}`);
      fs.writeFileSync(filePath, updatedContent);
    }
  }
}
console.log('Finished updating migration files.');
