import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import { InsertUser, users, UserRole } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let pool: mysql.Pool | null = null;
let _migrationPromise: Promise<void> | null = null;

export async function ensureSchemaUpdated(p: mysql.Pool): Promise<void> {
  if (_migrationPromise) return _migrationPromise;
  _migrationPromise = (async () => {
    try {
      const promisePool = p.promise();
    const [cols] = await promisePool.query("SHOW COLUMNS FROM disbursement_orders") as any[];
    const colNames = Array.isArray(cols) ? cols.map((c: any) => c.Field) : [];
    if (!colNames.includes("executiveNotes")) {
      await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN executiveNotes TEXT");
    }
    if (!colNames.includes("executiveNotesReply")) {
      await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN executiveNotesReply TEXT");
    }
    if (!colNames.includes("executiveNotesRepliedBy")) {
      await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN executiveNotesRepliedBy INT");
    }
    if (!colNames.includes("executiveNotesRepliedAt")) {
      await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN executiveNotesRepliedAt DATETIME");
    }
    if (!colNames.includes("rejectedRole")) {
      await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN rejectedRole VARCHAR(50) DEFAULT NULL");
    }
    if (!colNames.includes("purchaseOrderNumber")) {
      await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN purchaseOrderNumber VARCHAR(100) DEFAULT NULL");
    }
    if (!colNames.includes("csrLetterNumber")) {
      await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN csrLetterNumber VARCHAR(100) DEFAULT NULL");
    }
    if (!colNames.includes("sourceType")) {
      await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN sourceType VARCHAR(50) DEFAULT NULL");
    }
    if (!colNames.includes("itemsJson")) {
      await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN itemsJson TEXT DEFAULT NULL");
    }
    if (!colNames.includes("itemsTotal")) {
      await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN itemsTotal DECIMAL(15,2) DEFAULT '0.00'");
    }
    if (!colNames.includes("adminFees")) {
      await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN adminFees DECIMAL(15,2) DEFAULT '0.00'");
    }
    if (!colNames.includes("requestId")) {
      await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN requestId INT DEFAULT NULL");
    }
    if (!colNames.includes("lastNoteSide")) {
      await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN lastNoteSide VARCHAR(20) DEFAULT NULL");
    }
    if (!colNames.includes("notesCount")) {
      await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN notesCount INT DEFAULT 0");
    }
    if (!colNames.includes("creatorSignatureName")) await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN creatorSignatureName TEXT DEFAULT NULL");
    if (!colNames.includes("creatorSignatureDepartment")) await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN creatorSignatureDepartment TEXT DEFAULT NULL");
    if (!colNames.includes("creatorSignatureUrl")) await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN creatorSignatureUrl TEXT DEFAULT NULL");
    if (!colNames.includes("executiveDirectorSignatureName")) await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN executiveDirectorSignatureName TEXT DEFAULT NULL");
    if (!colNames.includes("executiveDirectorSignatureDepartment")) await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN executiveDirectorSignatureDepartment TEXT DEFAULT NULL");
    if (!colNames.includes("executiveDirectorSignatureUrl")) await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN executiveDirectorSignatureUrl TEXT DEFAULT NULL");
    if (!colNames.includes("showCreatorSignature")) await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN showCreatorSignature TINYINT(1) NOT NULL DEFAULT 1");
    if (!colNames.includes("showExecutiveDirectorSignature")) await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN showExecutiveDirectorSignature TINYINT(1) NOT NULL DEFAULT 1");

    // إنشاء جدول الملاحظات والردود غير المحدودة إذا لم يكن موجوداً
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS disbursement_order_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orderId INT NOT NULL,
        userId INT NULL,
        userName VARCHAR(255) NULL,
        userRole VARCHAR(100) NULL,
        side VARCHAR(50) NOT NULL DEFAULT 'board',
        content TEXT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_don_order_id (orderId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Central fund: keep the original receipt intact and record each allocation.
    const [voucherCols] = await promisePool.query("SHOW COLUMNS FROM receipt_vouchers") as any[];
    const voucherFields = new Set((voucherCols as any[]).map((c: any) => c.Field));
    if (!voucherFields.has("category")) await promisePool.query("ALTER TABLE receipt_vouchers ADD COLUMN category ENUM('project_linked','restricted','unrestricted') NOT NULL DEFAULT 'project_linked'");
    if (!voucherFields.has("donationPurposeId")) await promisePool.query("ALTER TABLE receipt_vouchers ADD COLUMN donationPurposeId INT NULL");
    if (!voucherFields.has("donationPurposeName")) await promisePool.query("ALTER TABLE receipt_vouchers ADD COLUMN donationPurposeName VARCHAR(255) NULL");
    if (!voucherFields.has("signatureName")) await promisePool.query("ALTER TABLE receipt_vouchers ADD COLUMN signatureName VARCHAR(255) DEFAULT NULL");
    if (!voucherFields.has("signatureDepartment")) await promisePool.query("ALTER TABLE receipt_vouchers ADD COLUMN signatureDepartment VARCHAR(255) DEFAULT NULL");
    if (!voucherFields.has("signatureUrl")) await promisePool.query("ALTER TABLE receipt_vouchers ADD COLUMN signatureUrl TEXT DEFAULT NULL");
    if (!voucherFields.has("showSignatureInDocuments")) await promisePool.query("ALTER TABLE receipt_vouchers ADD COLUMN showSignatureInDocuments TINYINT(1) NOT NULL DEFAULT 1");

    const [requestCols] = await promisePool.query("SHOW COLUMNS FROM disbursement_requests") as any[];
    const requestFields = new Set((requestCols as any[]).map((c: any) => c.Field));
    if (!requestFields.has("fundRestrictionType")) await promisePool.query("ALTER TABLE disbursement_requests ADD COLUMN fundRestrictionType ENUM('general','purpose','project') NULL");
    if (!requestFields.has("fundPurposeId")) await promisePool.query("ALTER TABLE disbursement_requests ADD COLUMN fundPurposeId INT NULL");
    if (!requestFields.has("fundPurposeName")) await promisePool.query("ALTER TABLE disbursement_requests ADD COLUMN fundPurposeName VARCHAR(255) NULL");
    if (!requestFields.has("fundRestrictedProjectId")) await promisePool.query("ALTER TABLE disbursement_requests ADD COLUMN fundRestrictedProjectId INT NULL");
    if (!requestFields.has("creatorSignatureName")) await promisePool.query("ALTER TABLE disbursement_requests ADD COLUMN creatorSignatureName TEXT DEFAULT NULL");
    if (!requestFields.has("creatorSignatureDepartment")) await promisePool.query("ALTER TABLE disbursement_requests ADD COLUMN creatorSignatureDepartment TEXT DEFAULT NULL");
    if (!requestFields.has("creatorSignatureUrl")) await promisePool.query("ALTER TABLE disbursement_requests ADD COLUMN creatorSignatureUrl TEXT DEFAULT NULL");
    if (!requestFields.has("executiveDirectorSignatureName")) await promisePool.query("ALTER TABLE disbursement_requests ADD COLUMN executiveDirectorSignatureName TEXT DEFAULT NULL");
    if (!requestFields.has("executiveDirectorSignatureDepartment")) await promisePool.query("ALTER TABLE disbursement_requests ADD COLUMN executiveDirectorSignatureDepartment TEXT DEFAULT NULL");
    if (!requestFields.has("executiveDirectorSignatureUrl")) await promisePool.query("ALTER TABLE disbursement_requests ADD COLUMN executiveDirectorSignatureUrl TEXT DEFAULT NULL");
    if (!requestFields.has("showCreatorSignature")) await promisePool.query("ALTER TABLE disbursement_requests ADD COLUMN showCreatorSignature TINYINT(1) NOT NULL DEFAULT 1");
    if (!requestFields.has("showExecutiveDirectorSignature")) await promisePool.query("ALTER TABLE disbursement_requests ADD COLUMN showExecutiveDirectorSignature TINYINT(1) NOT NULL DEFAULT 1");

    await promisePool.query(`CREATE TABLE IF NOT EXISTS fund_movements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      eventKey VARCHAR(120) NOT NULL UNIQUE,
      movementType ENUM('receipt','receipt_reversal','surplus','administrative','operational','disbursement','disbursement_reversal') NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      restrictionType ENUM('general','purpose','project') NOT NULL DEFAULT 'general',
      donationPurposeId INT NULL,
      donationPurposeName VARCHAR(255) NULL,
      restrictedProjectId INT NULL,
      projectId INT NULL,
      voucherId INT NULL,
      requestId INT NULL,
      disbursementOrderId INT NULL,
      sourceDetailsJson TEXT NULL,
      notes TEXT NULL,
      createdById INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_fund_bucket (restrictionType, donationPurposeId, restrictedProjectId),
      INDEX idx_fund_project_type (projectId, movementType),
      INDEX idx_fund_voucher (voucherId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await promisePool.query("CREATE TABLE IF NOT EXISTS fund_lock (id INT PRIMARY KEY) ENGINE=InnoDB");
    await promisePool.query("INSERT IGNORE INTO fund_lock (id) VALUES (1)");
    // The former UI stored the restriction in notes. Preserve that historical label.
    await promisePool.query(`UPDATE receipt_vouchers
      SET category = IF(notes LIKE 'مصرف التبرع:%', 'restricted', 'unrestricted'),
          donationPurposeName = IF(notes LIKE 'مصرف التبرع:%', LEFT(TRIM(SUBSTRING_INDEX(SUBSTRING(notes, CHAR_LENGTH('مصرف التبرع:') + 1), '|', 1)), 255), NULL)
      WHERE projectId IS NULL AND category = 'project_linked'`);
    await promisePool.query(`INSERT INTO categories (name, nameAr, type, sortOrder, isActive)
      SELECT DISTINCT LEFT(rv.donationPurposeName, 100), LEFT(rv.donationPurposeName, 100), 'donation_purposes', 0, 1
      FROM receipt_vouchers rv LEFT JOIN categories c
        ON c.type = 'donation_purposes' AND c.nameAr = LEFT(rv.donationPurposeName, 100)
      WHERE rv.category = 'restricted' AND rv.donationPurposeName IS NOT NULL
        AND rv.donationPurposeName <> '' AND c.id IS NULL`);
    await promisePool.query(`UPDATE receipt_vouchers rv
      JOIN categories c ON c.type = 'donation_purposes' AND c.nameAr = LEFT(rv.donationPurposeName, 100)
      SET rv.donationPurposeId = c.id
      WHERE rv.category = 'restricted' AND rv.donationPurposeId IS NULL`);
    await promisePool.query(`INSERT IGNORE INTO fund_movements
      (eventKey, movementType, amount, restrictionType, donationPurposeId, donationPurposeName, voucherId, notes, createdById, createdAt)
      SELECT CONCAT('receipt:', id, ':deposit'), 'receipt', amount,
        IF(category = 'restricted', 'purpose', 'general'), donationPurposeId, donationPurposeName,
        id, CONCAT('إيداع تلقائي من سند القبض ', voucherNumber), createdById, COALESCE(approvedAt, receiptDate, createdAt)
      FROM receipt_vouchers WHERE projectId IS NULL AND status = 'approved' AND category IN ('restricted','unrestricted')`);

    // نقل الملاحظات السابقة إلى الجدول الجديد إذا لم تكن منقولة
    await promisePool.query(`
      INSERT INTO disbursement_order_notes (orderId, userId, userName, userRole, side, content, createdAt)
      SELECT 
        o.id, 
        NULL, 
        'صاحب الصلاحية', 
        'board_chairman', 
        'board', 
        o.executiveNotes, 
        COALESCE(o.updatedAt, o.createdAt)
      FROM disbursement_orders o
      WHERE o.executiveNotes IS NOT NULL 
        AND TRIM(o.executiveNotes) != ''
        AND NOT EXISTS (
          SELECT 1 FROM disbursement_order_notes n 
          WHERE n.orderId = o.id AND n.side = 'board'
        );
    `);

    await promisePool.query(`
      INSERT INTO disbursement_order_notes (orderId, userId, userName, userRole, side, content, createdAt)
      SELECT 
        o.id, 
        o.executiveNotesRepliedBy, 
        COALESCE(u.name, 'الإدارة المالية'), 
        COALESCE(u.role, 'financial'), 
        'finance', 
        o.executiveNotesReply, 
        COALESCE(o.executiveNotesRepliedAt, o.updatedAt, o.createdAt)
      FROM disbursement_orders o
      LEFT JOIN users u ON o.executiveNotesRepliedBy = u.id
      WHERE o.executiveNotesReply IS NOT NULL 
        AND TRIM(o.executiveNotesReply) != ''
        AND NOT EXISTS (
          SELECT 1 FROM disbursement_order_notes n 
          WHERE n.orderId = o.id AND n.side = 'finance'
        );
    `);

    // تحديث إجمالي عدد الملاحظات والجهة الأخيرة لكل أمر
    await promisePool.query(`
      UPDATE disbursement_orders o
      JOIN (
        SELECT orderId, COUNT(*) as cnt
        FROM disbursement_order_notes
        GROUP BY orderId
      ) don ON o.id = don.orderId
      SET o.notesCount = don.cnt;
    `);

    await promisePool.query(`
      UPDATE disbursement_orders o
      SET o.lastNoteSide = CASE
        WHEN o.executiveNotesReply IS NOT NULL AND TRIM(o.executiveNotesReply) != '' THEN 'finance'
        WHEN o.executiveNotes IS NOT NULL AND TRIM(o.executiveNotes) != '' THEN 'board'
        ELSE NULL
      END
      WHERE o.lastNoteSide IS NULL AND (o.executiveNotes IS NOT NULL OR o.executiveNotesReply IS NOT NULL);
    `);

    const [projCols] = await promisePool.query("SHOW COLUMNS FROM projects") as any[];
    const projColNames = Array.isArray(projCols) ? projCols.map((c: any) => c.Field) : [];
    if (!projColNames.includes("programType")) {
      await promisePool.query("ALTER TABLE projects ADD COLUMN programType VARCHAR(50) DEFAULT NULL");
    }

    // أعمدة إغلاق الطلب (حصر الإغلاق بمدير النظام وتأكيد المدير التنفيذي)
    const [reqCols] = await promisePool.query("SHOW COLUMNS FROM mosque_requests") as any[];
    const reqColNames = Array.isArray(reqCols) ? reqCols.map((c: any) => c.Field) : [];
    if (!reqColNames.includes("closureStatus")) {
      await promisePool.query("ALTER TABLE mosque_requests ADD COLUMN closureStatus VARCHAR(50) DEFAULT NULL");
    }
    if (!reqColNames.includes("closureRequestedBy")) {
      await promisePool.query("ALTER TABLE mosque_requests ADD COLUMN closureRequestedBy INT DEFAULT NULL");
    }
    if (!reqColNames.includes("closureRequestedAt")) {
      await promisePool.query("ALTER TABLE mosque_requests ADD COLUMN closureRequestedAt DATETIME DEFAULT NULL");
    }
    if (!reqColNames.includes("closureReason")) {
      await promisePool.query("ALTER TABLE mosque_requests ADD COLUMN closureReason TEXT DEFAULT NULL");
    }
    if (!reqColNames.includes("closureConfirmedBy")) {
      await promisePool.query("ALTER TABLE mosque_requests ADD COLUMN closureConfirmedBy INT DEFAULT NULL");
    }
    if (!reqColNames.includes("closureConfirmedAt")) {
      await promisePool.query("ALTER TABLE mosque_requests ADD COLUMN closureConfirmedAt DATETIME DEFAULT NULL");
    }
    if (!reqColNames.includes("closureRejectionReason")) {
      await promisePool.query("ALTER TABLE mosque_requests ADD COLUMN closureRejectionReason TEXT DEFAULT NULL");
    }

    // أعمدة لقطة التوقيع الرقمي في جدول mosque_requests
    if (!reqColNames.includes("signatureName")) {
      await promisePool.query("ALTER TABLE mosque_requests ADD COLUMN signatureName VARCHAR(255) DEFAULT NULL");
    }
    if (!reqColNames.includes("signatureDepartment")) {
      await promisePool.query("ALTER TABLE mosque_requests ADD COLUMN signatureDepartment VARCHAR(255) DEFAULT NULL");
    }
    if (!reqColNames.includes("signatureUrl")) {
      await promisePool.query("ALTER TABLE mosque_requests ADD COLUMN signatureUrl TEXT DEFAULT NULL");
    }
    if (!reqColNames.includes("showSignatureInDocuments")) {
      await promisePool.query("ALTER TABLE mosque_requests ADD COLUMN showSignatureInDocuments TINYINT(1) NOT NULL DEFAULT 1");
    }

    // تحديث enum role في جدول users ليشمل مسؤول المشتريات (procurement_officer)
    try {
      await promisePool.query(`
        ALTER TABLE users MODIFY COLUMN role ENUM(
          'super_admin',
          'system_admin',
          'board_chairman',
          'board_member',
          'general_manager',
          'executive_director',
          'projects_office',
          'field_team',
          'quick_response',
          'financial',
          'project_manager',
          'corporate_comm',
          'service_requester',
          'procurement_officer',
          'dashboard_viewer'
        ) NOT NULL DEFAULT 'service_requester';
      `);
    } catch (roleEnumErr) {
      console.warn("[Database] Could not update users.role enum (might already be up to date):", roleEnumErr);
    }

    // أعمدة البيانات المصرفية للموظفين في جدول users
    const [userCols] = await promisePool.query("SHOW COLUMNS FROM users") as any[];
    const userColNames = Array.isArray(userCols) ? userCols.map((c: any) => c.Field) : [];
    if (!userColNames.includes("bankName")) {
      await promisePool.query("ALTER TABLE users ADD COLUMN bankName VARCHAR(255) DEFAULT NULL");
    }
    if (!userColNames.includes("bankAccountName")) {
      await promisePool.query("ALTER TABLE users ADD COLUMN bankAccountName VARCHAR(255) DEFAULT NULL");
    }

    // أعمدة توثيق قناة الإرسال والمصدر في جدول notifications
    const [notifCols] = await promisePool.query("SHOW COLUMNS FROM notifications") as any[];
    const notifColNames = Array.isArray(notifCols) ? notifCols.map((c: any) => c.Field) : [];
    if (!notifColNames.includes("channel")) {
      await promisePool.query("ALTER TABLE notifications ADD COLUMN channel VARCHAR(50) DEFAULT 'in_app'");
    }
    if (!notifColNames.includes("senderId")) {
      await promisePool.query("ALTER TABLE notifications ADD COLUMN senderId INT DEFAULT NULL");
    }
    if (!notifColNames.includes("deliveryStatus")) {
      await promisePool.query("ALTER TABLE notifications ADD COLUMN deliveryStatus VARCHAR(50) DEFAULT 'sent'");
    }
    if (!notifColNames.includes("recipientPhone")) {
      await promisePool.query("ALTER TABLE notifications ADD COLUMN recipientPhone VARCHAR(50) DEFAULT NULL");
    }
    if (!notifColNames.includes("recipientEmail")) {
      await promisePool.query("ALTER TABLE notifications ADD COLUMN recipientEmail VARCHAR(255) DEFAULT NULL");
    }
    if (!userColNames.includes("bankIban")) {
      await promisePool.query("ALTER TABLE users ADD COLUMN bankIban VARCHAR(50) DEFAULT NULL");
    }

    // جدول طلبات صرف العهد المالية
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS custody_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requestNumber VARCHAR(50) NOT NULL UNIQUE,
        userId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        description TEXT NOT NULL,
        isCustomBank TINYINT(1) NOT NULL DEFAULT 0,
        bankName VARCHAR(255) NOT NULL,
        bankAccountName VARCHAR(255) NOT NULL,
        bankIban VARCHAR(50) NOT NULL,
        applicantSignatureName VARCHAR(255) NULL,
        applicantSignatureDepartment VARCHAR(255) NULL,
        applicantSignatureUrl TEXT NULL,
        status ENUM('pending_executive', 'approved', 'rejected', 'converted_to_order') NOT NULL DEFAULT 'pending_executive',
        executiveApprovedBy INT NULL,
        executiveApprovedAt DATETIME NULL,
        executiveSignatureName VARCHAR(255) NULL,
        executiveSignatureDepartment VARCHAR(255) NULL,
        executiveSignatureUrl TEXT NULL,
        executiveNotes TEXT NULL,
        rejectedBy INT NULL,
        rejectedAt DATETIME NULL,
        rejectionReason TEXT NULL,
        disbursementOrderId INT NULL,
        disbursementOrderNumber VARCHAR(50) NULL,
        attachmentsJson TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cr_user_id (userId),
        INDEX idx_cr_status (status),
        INDEX idx_cr_order_id (disbursementOrderId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // عمود ربط أمر الصرف بطلب العهدة
    if (!colNames.includes("custodyRequestId")) {
      await promisePool.query("ALTER TABLE disbursement_orders ADD COLUMN custodyRequestId INT DEFAULT NULL");
    }

    // أعمدة تصفية العهد والاستثناءات في جدول custody_requests
    try {
      const [crCols] = await promisePool.query("SHOW COLUMNS FROM custody_requests");
      const crColNames = (crCols as any[]).map((c: any) => c.Field);
      if (!crColNames.includes("isSettled")) {
        await promisePool.query("ALTER TABLE custody_requests ADD COLUMN isSettled TINYINT(1) NOT NULL DEFAULT 0");
      }
      if (!crColNames.includes("settledBy")) {
        await promisePool.query("ALTER TABLE custody_requests ADD COLUMN settledBy INT DEFAULT NULL");
      }
      if (!crColNames.includes("settledAt")) {
        await promisePool.query("ALTER TABLE custody_requests ADD COLUMN settledAt DATETIME DEFAULT NULL");
      }
      if (!crColNames.includes("settlementNotes")) {
        await promisePool.query("ALTER TABLE custody_requests ADD COLUMN settlementNotes TEXT DEFAULT NULL");
      }
      if (!crColNames.includes("hasException")) {
        await promisePool.query("ALTER TABLE custody_requests ADD COLUMN hasException TINYINT(1) NOT NULL DEFAULT 0");
      }
      if (!crColNames.includes("exceptionId")) {
        await promisePool.query("ALTER TABLE custody_requests ADD COLUMN exceptionId INT DEFAULT NULL");
      }
      if (!crColNames.includes("attachmentsJson")) {
        await promisePool.query("ALTER TABLE custody_requests ADD COLUMN attachmentsJson TEXT DEFAULT NULL");
      }
    } catch (e) {
      console.warn("[Database] custody_requests column check warning:", e);
    }

    // جدول استثناءات العهد المالية
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS custody_exceptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        activeCustodyId INT NOT NULL,
        reason TEXT NOT NULL,
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        reviewedBy INT NULL,
        reviewedAt DATETIME NULL,
        reviewNotes TEXT NULL,
        isUsed TINYINT(1) NOT NULL DEFAULT 0,
        usedInRequestId INT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ce_user_id (userId),
        INDEX idx_ce_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // أعمدة توثيق التوقيع في جدول contracts_enhanced
    try {
      const [contractCols] = await promisePool.query("SHOW COLUMNS FROM contracts_enhanced") as any[];
      const contractColNames = Array.isArray(contractCols) ? contractCols.map((c: any) => c.Field) : [];
      if (!contractColNames.includes("firstPartySignatoryName")) {
        await promisePool.query("ALTER TABLE contracts_enhanced ADD COLUMN firstPartySignatoryName VARCHAR(255) DEFAULT NULL");
      }
      if (!contractColNames.includes("firstPartySignatoryTitle")) {
        await promisePool.query("ALTER TABLE contracts_enhanced ADD COLUMN firstPartySignatoryTitle VARCHAR(255) DEFAULT NULL");
      }
      if (!contractColNames.includes("firstPartySignatureUrl")) {
        await promisePool.query("ALTER TABLE contracts_enhanced ADD COLUMN firstPartySignatureUrl TEXT DEFAULT NULL");
      }
    } catch (contractErr) {
      console.warn("[Database] contracts_enhanced column check warning:", contractErr);
    }

    // ملاحظة: طلبات سدانة تُدار بشكل مستقل ولا يتم إنشاء مشاريع لها في جدول projects
  } catch (err) {
    console.warn("[Database] ensureSchemaUpdated warning:", err);
  }
  })();
  return _migrationPromise;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        timezone: "Z",
      });
      pool.on("connection", (connection) => {
        connection.query("SET time_zone = '+00:00'");
      });
      _db = drizzle(pool);
      await ensureSchemaUpdated(pool).catch(() => {});
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

interface OAuthUserData {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
  role?: UserRole;
}

export async function upsertUser(user: OAuthUserData): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // للمستخدمين القادمين من OAuth، نستخدم openId كمعرف فريد
    const existingUser = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    
    if (existingUser.length > 0) {
      // تحديث المستخدم الموجود
      const updateSet: Record<string, unknown> = {
        lastSignedIn: user.lastSignedIn || new Date(),
      };
      
      if (user.name) updateSet.name = user.name;
      if (user.email) updateSet.email = user.email;
      if (user.loginMethod) updateSet.loginMethod = user.loginMethod;
      
      // تحديث الدور للمالك
      if (user.openId === ENV.ownerOpenId) {
        updateSet.role = 'super_admin' as UserRole;
      }
      
      await db.update(users).set(updateSet).where(eq(users.openId, user.openId));
    } else {
      // إنشاء مستخدم جديد
      const role: UserRole = user.openId === ENV.ownerOpenId ? 'super_admin' : 'service_requester';
      
      await db.insert(users).values({
        openId: user.openId,
        email: user.email || `${user.openId}@oauth.local`,
        name: user.name || 'مستخدم جديد',
        loginMethod: user.loginMethod || 'oauth',
        role: role,
        status: 'active',
        lastSignedIn: user.lastSignedIn || new Date(),
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== دوال إدارة المستخدمين ====================

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(userData: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(users).values(userData);
  return result;
}

export async function updateUser(id: number, userData: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set(userData).where(eq(users.id, id));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users);
}
