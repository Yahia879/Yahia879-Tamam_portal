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

const replacements = {
  // Long identifiers
  'contract_modification_logs_modificationRequestId_contract_modification_requests_id_fk': 'cml_mod_req_id_fk',
  'contract_modification_requests_contractId_contracts_enhanced_id_fk': 'cmr_cont_enh_id_fk',
  'contract_modification_logs_contractId_contracts_enhanced_id_fk': 'cml_cont_enh_id_fk',
  'disbursement_orders_disbursementRequestId_disbursement_requests_id_fk': 'do_disb_req_id_fk',
};

walk(drizzleDir, (filePath) => {
  if (filePath.endsWith('.sql') || filePath.endsWith('.json')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Fix timestamps (only in .sql files)
    if (filePath.endsWith('.sql')) {
        // Replace 'timestamp' but NOT if it's part of CURRENT_TIMESTAMP
        // Using a negative lookbehind if possible, but JS regex support varies.
        // Safer: replace all occurrences and then fix CURRENT_DATETIME back to CURRENT_TIMESTAMP if needed?
        // Actually, CURRENT_TIMESTAMP is fine with DATETIME in MySQL 5.6.5+
        // The issue is the word 'timestamp' as a type.
        const newContent = content.replace(/\btimestamp\b/g, 'datetime');
        if (newContent !== content) {
            content = newContent;
            changed = true;
        }
    }

    // Fix long identifiers
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

console.log('Finished fixing migrations.');
