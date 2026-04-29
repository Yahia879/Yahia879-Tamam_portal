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
  'contract_modification_logs_modificationRequestId_contract_modification_requests_id_fk': 'cml_mod_req_id_fk',
  'contract_modification_requests_contractId_contracts_enhanced_id_fk': 'cmr_cont_enh_id_fk',
  'contract_modification_logs_contractId_contracts_enhanced_id_fk': 'cml_cont_enh_id_fk',
};

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

console.log('Finished shortening long identifiers.');
