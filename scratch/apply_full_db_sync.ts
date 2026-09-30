import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

const NEW_MODULES = [
  {
    id: "purchase_orders",
    nameAr: "أوامر الشراء",
    nameEn: "Purchase Orders",
    icon: "ShoppingCart",
    displayOrder: 9,
    isActive: 1,
  },
  {
    id: "csr_letters",
    nameAr: "المسؤولية المجتمعية",
    nameEn: "CSR Letters",
    icon: "HeartHandshake",
    displayOrder: 10,
    isActive: 1,
  },
  {
    id: "sedana_warehouse",
    nameAr: "المستودع الافتراضي",
    nameEn: "Virtual Warehouse",
    icon: "Boxes",
    displayOrder: 11,
    isActive: 1,
  },
  {
    id: "signing",
    nameAr: "صلاحيات التوقيع",
    nameEn: "Signing Permissions",
    icon: "PenLine",
    displayOrder: 15,
    isActive: 1,
  },
  {
    id: "boq",
    nameAr: "إعداد جداول الكميات",
    nameEn: "BOQ Preparation",
    icon: "FileSpreadsheet",
    displayOrder: 10,
    isActive: 1,
  },
  {
    id: "pending_reports",
    nameAr: "تقارير الطلبات",
    nameEn: "Request Reports",
    icon: "FileText",
    displayOrder: 11,
    isActive: 1,
  },
  {
    id: "technical_support",
    nameAr: "الدعم الفني",
    nameEn: "Technical Support",
    icon: "LifeBuoy",
    displayOrder: 12,
    isActive: 1,
  },
  {
    id: "beneficiary_evaluations",
    nameAr: "رضا المستفيدين",
    nameEn: "Beneficiary Satisfaction",
    icon: "HeartHandshake",
    displayOrder: 4,
    isActive: 1,
  },
  {
    id: "analytics_hub",
    nameAr: "مركز الإحصائيات والتحليلات",
    nameEn: "Analytics Hub",
    icon: "BarChart3",
    displayOrder: 8,
    isActive: 1,
  },
  {
    id: "escalation",
    nameAr: "التصعيد الإداري",
    nameEn: "Administrative Escalation",
    icon: "AlertTriangle",
    displayOrder: 3,
    isActive: 1,
  },
  {
    id: "requesters",
    nameAr: "إدارة المستفيدين",
    nameEn: "Beneficiary Management",
    icon: "Users",
    displayOrder: 14,
    isActive: 1,
  },
];

const NEW_PERMISSIONS = [
  // אוامر الشراء
  { id: "purchase_orders.view", moduleId: "purchase_orders", action: "view", nameAr: "عرض أوامر الشراء", nameEn: "View Purchase Orders" },
  { id: "purchase_orders.add", moduleId: "purchase_orders", action: "add", nameAr: "إنشاء أمر شراء جديد", nameEn: "Create Purchase Order" },
  { id: "purchase_orders.approve", moduleId: "purchase_orders", action: "approve", nameAr: "اعتماد أوامر الشراء", nameEn: "Approve Purchase Orders" },
  { id: "purchase_orders.create_disbursement", moduleId: "purchase_orders", action: "create_disbursement", nameAr: "إنشاء أمر صرف لأمر الشراء", nameEn: "Create Disbursement Order" },
  { id: "purchase_orders.export", moduleId: "purchase_orders", action: "export", nameAr: "تصدير أوامر الشراء إكسيل", nameEn: "Export Purchase Orders" },

  // المسؤولية المجتمعية
  { id: "csr_letters.view", moduleId: "csr_letters", action: "view", nameAr: "عرض خطابات المسؤولية المجتمعية", nameEn: "View CSR Letters" },
  { id: "csr_letters.add", moduleId: "csr_letters", action: "add", nameAr: "إنشاء خطاب مسؤولية مجتمعية جديد", nameEn: "Create CSR Letter" },
  { id: "csr_letters.approve", moduleId: "csr_letters", action: "approve", nameAr: "اعتماد خطابات المسؤولية المجتمعية", nameEn: "Approve CSR Letters" },
  { id: "csr_letters.create_disbursement", moduleId: "csr_letters", action: "create_disbursement", nameAr: "إنشاء أمر صرف للخطاب", nameEn: "Create Disbursement for CSR Letter" },
  { id: "csr_letters.export", moduleId: "csr_letters", action: "export", nameAr: "تصدير الخطابات إكسيل", nameEn: "Export CSR Letters" },

  // المستودع الافتراضي
  { id: "sedana_warehouse.view", moduleId: "sedana_warehouse", action: "view", nameAr: "عرض المستودع الافتراضي", nameEn: "View Virtual Warehouse" },
  { id: "sedana_warehouse.inward", moduleId: "sedana_warehouse", action: "inward", nameAr: "تسجيل أمر إدخال بالمستودع", nameEn: "Record Inward Warehouse Order" },
  { id: "sedana_warehouse.outbound", moduleId: "sedana_warehouse", action: "outbound", nameAr: "إنشاء أمر إخراج ومسوغ صرف", nameEn: "Create Outbound & Disbursement Voucher" },
  { id: "sedana_warehouse.confirm_receipt", moduleId: "sedana_warehouse", action: "confirm_receipt", nameAr: "اعتماد وتأكيد الاستلام", nameEn: "Approve & Confirm Receipt" },
  { id: "sedana_warehouse.print", moduleId: "sedana_warehouse", action: "print", nameAr: "معاينة وطباعة محاضر وأوامر التسليم", nameEn: "Print Delivery Orders" },
  { id: "sedana_warehouse.export", moduleId: "sedana_warehouse", action: "export", nameAr: "تصدير بيانات المستودع إكسيل", nameEn: "Export Warehouse Data" },

  // التذكير
  { id: "disbursement_orders.remind", moduleId: "disbursements", action: "remind", nameAr: "إرسال تذكير بالاعتماد", nameEn: "Send Approval Reminder" },
  { id: "board_leadership.remind", moduleId: "board", action: "remind", nameAr: "إرسال تذكير بالاعتماد", nameEn: "Send Approval Reminder" },
];

const PO_DEFAULT_ROLE_PERMS: Record<string, string[]> = {
  super_admin: ["purchase_orders.view", "purchase_orders.add", "purchase_orders.approve", "purchase_orders.create_disbursement", "purchase_orders.export"],
  system_admin: ["purchase_orders.view", "purchase_orders.add", "purchase_orders.approve", "purchase_orders.create_disbursement", "purchase_orders.export"],
  general_manager: ["purchase_orders.view", "purchase_orders.add", "purchase_orders.approve", "purchase_orders.create_disbursement", "purchase_orders.export"],
  executive_director: ["purchase_orders.view", "purchase_orders.add", "purchase_orders.approve", "purchase_orders.create_disbursement", "purchase_orders.export"],
  financial_manager: ["purchase_orders.view", "purchase_orders.add", "purchase_orders.approve", "purchase_orders.create_disbursement", "purchase_orders.export"],
  financial: ["purchase_orders.view", "purchase_orders.approve", "purchase_orders.create_disbursement", "purchase_orders.export"],
  projects_office: ["purchase_orders.view", "purchase_orders.add", "purchase_orders.approve", "purchase_orders.create_disbursement", "purchase_orders.export"],
  project_manager: ["purchase_orders.view", "purchase_orders.add", "purchase_orders.export"],
};

const CSR_DEFAULT_ROLE_PERMS: Record<string, string[]> = {
  super_admin: ["csr_letters.view", "csr_letters.add", "csr_letters.approve", "csr_letters.create_disbursement", "csr_letters.export"],
  system_admin: ["csr_letters.view", "csr_letters.add", "csr_letters.approve", "csr_letters.create_disbursement", "csr_letters.export"],
  general_manager: ["csr_letters.view", "csr_letters.add", "csr_letters.approve", "csr_letters.create_disbursement", "csr_letters.export"],
  executive_director: ["csr_letters.view", "csr_letters.add", "csr_letters.approve", "csr_letters.create_disbursement", "csr_letters.export"],
  financial_manager: ["csr_letters.view", "csr_letters.add", "csr_letters.approve", "csr_letters.create_disbursement", "csr_letters.export"],
  financial: ["csr_letters.view", "csr_letters.approve", "csr_letters.create_disbursement", "csr_letters.export"],
  projects_office: ["csr_letters.view", "csr_letters.add", "csr_letters.approve", "csr_letters.create_disbursement", "csr_letters.export"],
  project_manager: ["csr_letters.view", "csr_letters.add", "csr_letters.export"],
};

const WAREHOUSE_DEFAULT_ROLE_PERMS: Record<string, string[]> = {
  super_admin: ["sedana_warehouse.view", "sedana_warehouse.inward", "sedana_warehouse.outbound", "sedana_warehouse.confirm_receipt", "sedana_warehouse.print", "sedana_warehouse.export"],
  system_admin: ["sedana_warehouse.view", "sedana_warehouse.inward", "sedana_warehouse.outbound", "sedana_warehouse.confirm_receipt", "sedana_warehouse.print", "sedana_warehouse.export"],
  general_manager: ["sedana_warehouse.view", "sedana_warehouse.inward", "sedana_warehouse.outbound", "sedana_warehouse.confirm_receipt", "sedana_warehouse.print", "sedana_warehouse.export"],
  executive_director: ["sedana_warehouse.view", "sedana_warehouse.inward", "sedana_warehouse.outbound", "sedana_warehouse.confirm_receipt", "sedana_warehouse.print", "sedana_warehouse.export"],
  financial_manager: ["sedana_warehouse.view", "sedana_warehouse.inward", "sedana_warehouse.outbound", "sedana_warehouse.confirm_receipt", "sedana_warehouse.print", "sedana_warehouse.export"],
  financial: ["sedana_warehouse.view", "sedana_warehouse.export"],
  projects_office: ["sedana_warehouse.view", "sedana_warehouse.inward", "sedana_warehouse.outbound", "sedana_warehouse.confirm_receipt", "sedana_warehouse.print", "sedana_warehouse.export"],
  project_manager: ["sedana_warehouse.view", "sedana_warehouse.inward", "sedana_warehouse.outbound", "sedana_warehouse.confirm_receipt", "sedana_warehouse.print", "sedana_warehouse.export"],
};

const REMIND_DEFAULT_ROLE_PERMS: Record<string, string[]> = {
  super_admin: ["disbursement_orders.remind", "board_leadership.remind"],
  system_admin: ["disbursement_orders.remind"],
  financial_manager: ["disbursement_orders.remind"],
  financial: ["disbursement_orders.remind"],
  board_chairman: ["board_leadership.remind"],
};

async function syncDatabase(dbName: string) {
  console.log(`\n======================================================`);
  console.log(`🔄 Syncing Database: [${dbName}]`);
  console.log(`======================================================`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      port: 3306,
      database: dbName,
    });
  } catch (err: any) {
    console.warn(`Could not connect to database [${dbName}]: ${err.message}`);
    return;
  }

  try {
    // 1. Check and add columns on disbursement_orders if missing
    const [cols]: any = await connection.query("SHOW COLUMNS FROM `disbursement_orders`");
    const colNames = cols.map((c: any) => c.Field);
    
    const requiredDisbCols: Record<string, string> = {
      executiveNotes: "TEXT DEFAULT NULL",
      executiveNotesReply: "TEXT DEFAULT NULL",
      executiveNotesRepliedBy: "INT DEFAULT NULL",
      executiveNotesRepliedAt: "DATETIME DEFAULT NULL",
      rejectedRole: "VARCHAR(50) DEFAULT NULL",
      purchaseOrderNumber: "VARCHAR(100) DEFAULT NULL",
      csrLetterNumber: "VARCHAR(100) DEFAULT NULL",
      sourceType: "VARCHAR(50) DEFAULT NULL",
      itemsJson: "TEXT DEFAULT NULL",
      itemsTotal: "DECIMAL(15,2) DEFAULT '0.00'",
      adminFees: "DECIMAL(15,2) DEFAULT '0.00'",
      requestId: "INT DEFAULT NULL",
    };

    for (const [col, colDef] of Object.entries(requiredDisbCols)) {
      if (!colNames.includes(col)) {
        console.log(`➕ Adding column [${col}] to disbursement_orders...`);
        await connection.query(`ALTER TABLE \`disbursement_orders\` ADD COLUMN \`${col}\` ${colDef}`);
      }
    }

    // 2. Check and add columns on projects if missing
    const [projCols]: any = await connection.query("SHOW COLUMNS FROM `projects`");
    const projColNames = projCols.map((c: any) => c.Field);
    if (!projColNames.includes("programType")) {
      console.log(`➕ Adding column [programType] to projects...`);
      await connection.query("ALTER TABLE `projects` ADD COLUMN `programType` VARCHAR(50) DEFAULT NULL");
    }

    // 3. Ensure Modules
    console.log(`\n📦 Checking and adding Modules...`);
    for (const m of NEW_MODULES) {
      const [existing]: any = await connection.query(`SELECT id FROM \`modules\` WHERE \`id\` = ?`, [m.id]);
      if (existing.length === 0) {
        console.log(`   ➕ Inserted module: ${m.id} (${m.nameAr})`);
        await connection.query(
          `INSERT INTO \`modules\` (\`id\`, \`name_ar\`, \`name_en\`, \`icon\`, \`display_order\`, \`is_active\`) VALUES (?, ?, ?, ?, ?, ?)`,
          [m.id, m.nameAr, m.nameEn, m.icon, m.displayOrder, m.isActive]
        );
      } else {
        await connection.query(
          `UPDATE \`modules\` SET \`name_ar\` = ?, \`name_en\` = ?, \`icon\` = ?, \`display_order\` = ?, \`is_active\` = ? WHERE \`id\` = ?`,
          [m.nameAr, m.nameEn, m.icon, m.displayOrder, m.isActive, m.id]
        );
      }
    }

    // 4. Ensure Permissions
    console.log(`\n🔑 Checking and adding Permissions...`);
    let insertedPerms = 0;
    for (const p of NEW_PERMISSIONS) {
      const [existing]: any = await connection.query(`SELECT id FROM \`permissions\` WHERE \`id\` = ?`, [p.id]);
      if (existing.length === 0) {
        console.log(`   ➕ Inserted permission: ${p.id} (${p.nameAr})`);
        await connection.query(
          `INSERT INTO \`permissions\` (\`id\`, \`module_id\`, \`action\`, \`name_ar\`, \`name_en\`) VALUES (?, ?, ?, ?, ?)`,
          [p.id, p.moduleId, p.action, p.nameAr, p.nameEn]
        );
        insertedPerms++;
      } else {
        await connection.query(
          `UPDATE \`permissions\` SET \`module_id\` = ?, \`action\` = ?, \`name_ar\` = ?, \`name_en\` = ? WHERE \`id\` = ?`,
          [p.moduleId, p.action, p.nameAr, p.nameEn, p.id]
        );
      }
    }

    // 5. Ensure Role Permissions
    console.log(`\n👥 Ensuring Role Permissions...`);
    const allRolePermsMaps = [
      PO_DEFAULT_ROLE_PERMS,
      CSR_DEFAULT_ROLE_PERMS,
      WAREHOUSE_DEFAULT_ROLE_PERMS,
      REMIND_DEFAULT_ROLE_PERMS
    ];

    let insertedRolePerms = 0;
    for (const rolePermsMap of allRolePermsMaps) {
      for (const [roleId, permIds] of Object.entries(rolePermsMap)) {
        // verify role exists
        const [roleExists]: any = await connection.query(`SELECT id FROM \`roles\` WHERE \`id\` = ?`, [roleId]);
        if (roleExists.length === 0) continue;

        for (const permId of permIds) {
          const [existing]: any = await connection.query(
            `SELECT id FROM \`role_permissions\` WHERE \`role_id\` = ? AND \`permission_id\` = ?`,
            [roleId, permId]
          );
          if (existing.length === 0) {
            await connection.query(
              `INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`) VALUES (?, ?)`,
              [roleId, permId]
            );
            insertedRolePerms++;
          }
        }
      }
    }

    console.log(`✅ [${dbName}] Sync Completed: Added ${insertedPerms} permissions and ${insertedRolePerms} role permission links.`);
  } finally {
    await connection.end();
  }
}

async function main() {
  await syncDatabase("test_temam");
  await syncDatabase("tamamgatemanarah_portal");
  console.log("\n🚀 All databases have been completely synchronized!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
