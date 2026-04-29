import fs from 'fs';

const filePath = 'drizzle/schema.ts';
let content = fs.readFileSync(filePath, 'utf8');

// We need to import foreignKey from drizzle-orm/mysql-core
if (!content.includes('foreignKey')) {
    content = content.replace('mysqlTable,', 'mysqlTable, foreignKey,');
}

// Fix contract_modification_requests foreign keys
// contractId -> contracts_enhanced.id
content = content.replace(
    'contractId: int("contractId").notNull().references(() => contractsEnhanced.id),',
    'contractId: int("contractId").notNull(),'
);
// requestedBy -> users.id
content = content.replace(
    'requestedBy: int("requestedBy").notNull().references(() => users.id),',
    'requestedBy: int("requestedBy").notNull(),'
);
// reviewedBy -> users.id
content = content.replace(
    'reviewedBy: int("reviewedBy").references(() => users.id),',
    'reviewedBy: int("reviewedBy"),'
);

// Add foreign keys for contract_modification_requests
content = content.replace(
    'updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),\n});',
    'updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),\n}, (table) => ({\n  contractFk: foreignKey({ columns: [table.contractId], foreignColumns: [contractsEnhanced.id], name: "cmr_contract_fk" }),\n  requestedByFk: foreignKey({ columns: [table.requestedBy], foreignColumns: [users.id], name: "cmr_requested_fk" }),\n  reviewedByFk: foreignKey({ columns: [table.reviewedBy], foreignColumns: [users.id], name: "cmr_reviewed_fk" }),\n}));'
);

// Fix contract_modification_logs foreign keys
content = content.replace(
    'contractId: int("contractId").notNull().references(() => contractsEnhanced.id),',
    'contractId: int("contractId").notNull(),'
);
content = content.replace(
    'modificationRequestId: int("modificationRequestId").references(() => contractModificationRequests.id),',
    'modificationRequestId: int("modificationRequestId"),'
);
content = content.replace(
    'modifiedBy: int("modifiedBy").notNull().references(() => users.id),',
    'modifiedBy: int("modifiedBy").notNull(),'
);

// Add foreign keys for contract_modification_logs
content = content.replace(
    'modifiedAt: timestamp("modifiedAt").defaultNow().notNull(),\n});',
    'modifiedAt: timestamp("modifiedAt").defaultNow().notNull(),\n}, (table) => ({\n  contractFk: foreignKey({ columns: [table.contractId], foreignColumns: [contractsEnhanced.id], name: "cml_contract_fk" }),\n  modReqFk: foreignKey({ columns: [table.modificationRequestId], foreignColumns: [contractModificationRequests.id], name: "cml_modreq_fk" }),\n  modifiedByFk: foreignKey({ columns: [table.modifiedBy], foreignColumns: [users.id], name: "cml_user_fk" }),\n}));'
);

fs.writeFileSync(filePath, content);
console.log('✅ Schema file: Shortened long foreign key names');
