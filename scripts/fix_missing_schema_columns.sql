-- ==============================================================================
-- استعلامات إصلاح الأعمدة الناقصة في قاعدة البيانات (MariaDB / MySQL)
-- باستخدام IF NOT EXISTS لتجنب خطأ التكرار 1060 Duplicate column
-- ==============================================================================

-- 1. جدول طلبات المساجد (mosque_requests) - حل خطأ 500 في واجهات إدارة المخزون
ALTER TABLE `mosque_requests`
  ADD COLUMN IF NOT EXISTS `signatureName` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `signatureDepartment` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `signatureUrl` TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `showSignatureInDocuments` TINYINT(1) NOT NULL DEFAULT 1;

-- 2. جدول العقود المطورة (contracts_enhanced) - حل خطأ 500 في الصندوق وتحويل الفوائض
ALTER TABLE `contracts_enhanced`
  ADD COLUMN IF NOT EXISTS `firstPartySignatoryName` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `firstPartySignatoryTitle` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `firstPartySignatureUrl` TEXT DEFAULT NULL;

-- 3. جدول أوامر الصرف (disbursement_orders)
ALTER TABLE `disbursement_orders`
  ADD COLUMN IF NOT EXISTS `executiveDirectorSignatureName` TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `executiveDirectorSignatureDepartment` TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `executiveDirectorSignatureUrl` TEXT DEFAULT NULL;

-- 4. جدول طلبات الصرف (disbursement_requests)
ALTER TABLE `disbursement_requests`
  ADD COLUMN IF NOT EXISTS `executiveDirectorSignatureName` TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `executiveDirectorSignatureDepartment` TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `executiveDirectorSignatureUrl` TEXT DEFAULT NULL;

-- 5. جدول سندات القبض (receipt_vouchers)
ALTER TABLE `receipt_vouchers`
  ADD COLUMN IF NOT EXISTS `signatureName` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `signatureDepartment` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `signatureUrl` TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `showSignatureInDocuments` TINYINT(1) NOT NULL DEFAULT 1;
