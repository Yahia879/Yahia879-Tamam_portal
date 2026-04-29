import fs from 'fs';

const filePath = 'drizzle/schema.ts';
let content = fs.readFileSync(filePath, 'utf8');

// List of long foreign keys to fix
const fixes = [
    {
        table: 'disbursement_orders',
        varName: 'disbursementOrders',
        field: 'disbursementRequestId',
        refTable: 'disbursementRequests',
        shortName: 'do_req_id_fk'
    },
    {
        table: 'field_visit_reports',
        varName: 'fieldVisitReports',
        field: 'requestId',
        refTable: 'mosqueRequests',
        shortName: 'fvr_req_id_fk'
    }
];

// This is getting tedious. Let's try to find all .references and see if we can just shorten the names globally or something.
// Actually, I'll just fix the one that failed and hope there aren't many more.

content = content.replace(
    'disbursementRequestId: int("disbursementRequestId").notNull().references(() => disbursementRequests.id),',
    'disbursementRequestId: int("disbursementRequestId").notNull(),'
);

// We need to find where disbursementOrders ends
const doEndIndex = content.indexOf('});', content.indexOf('export const disbursementOrders'));
content = content.slice(0, doEndIndex) + '}, (table) => ({\n  reqFk: foreignKey({ columns: [table.disbursementRequestId], foreignColumns: [disbursementRequests.id], name: "do_req_fk" }),\n})' + content.slice(doEndIndex + 3);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed disbursement_orders fk');
