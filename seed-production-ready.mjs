import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

// دالة تشفير كلمة المرور (PBKDF2)
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function seed() {
  console.log("🚀 بدء حقن البيانات الإنتاجية...");

  try {
    // 1. الأدوار (10 أدوار)
    console.log("👥 حقن الأدوار (10 أدوار)...");
    const rolesData = [
      { id: "super_admin", nameAr: "المدير العام", nameEn: "Super Admin", isSystem: true },
      { id: "system_admin", nameAr: "مدير نظام", nameEn: "System Admin", isSystem: true },
      { id: "financial_manager", nameAr: "المدير المالي", nameEn: "Financial Manager", isSystem: true },
      { id: "projects_office", nameAr: "مكتب المشاريع", nameEn: "Projects Office", isSystem: true },
      { id: "field_team", nameAr: "الفريق الميداني", nameEn: "Field Team", isSystem: true },
      { id: "quick_response", nameAr: "فريق الاستجابة السريعة", nameEn: "Quick Response Team", isSystem: true },
      { id: "financial", nameAr: "الإدارة المالية", nameEn: "Financial Management", isSystem: true },
      { id: "project_manager", nameAr: "مدير المشروع", nameEn: "Project Manager", isSystem: true },
      { id: "corporate_comm", nameAr: "الاتصال المؤسسي", nameEn: "Corporate Communications", isSystem: true },
      { id: "service_requester", nameAr: "طالب الخدمة", nameEn: "Service Requester", isSystem: true },
    ];

    for (const r of rolesData) {
      await db.insert(schema.roles).values(r).onDuplicateKeyUpdate({
        set: { nameAr: r.nameAr, nameEn: r.nameEn, isSystem: true }
      });
    }

    // 2. الوحدات (Modules)
    console.log("📦 حقن الوحدات...");
    const modulesData = [
      { id: "requests", nameAr: "الطلبات", nameEn: "Requests", icon: "FileText", displayOrder: 1 },
      { id: "mosques", nameAr: "المساجد", nameEn: "Mosques", icon: "Building2", displayOrder: 2 },
      { id: "projects", nameAr: "المشاريع", nameEn: "Projects", icon: "FolderKanban", displayOrder: 3 },
      { id: "users", nameAr: "المستخدمين", nameEn: "Users", icon: "Users", displayOrder: 4 },
      { id: "permissions", nameAr: "الصلاحيات", nameEn: "Permissions", icon: "Shield", displayOrder: 5 },
      { id: "financial", nameAr: "التقييم والاعتماد المالي", nameEn: "Financial Eval", icon: "DollarSign", displayOrder: 6 },
      { id: "contracts", nameAr: "العقود", nameEn: "Contracts", icon: "FileSignature", displayOrder: 7 },
      { id: "disbursements", nameAr: "الصرف المالي", nameEn: "Disbursements", icon: "Wallet", displayOrder: 8 },
      { id: "suppliers", nameAr: "الموردين", nameEn: "Suppliers", icon: "Truck", displayOrder: 9 },
      { id: "reports", nameAr: "التقارير", nameEn: "Reports", icon: "BarChart", displayOrder: 10 },
      { id: "handovers", nameAr: "الاستلامات", nameEn: "Handovers", icon: "ClipboardCheck", displayOrder: 11 },
      { id: "settings", nameAr: "الإعدادات", nameEn: "Settings", icon: "Settings", displayOrder: 12 },
      { id: "field_visits", nameAr: "الزيارات الميدانية", nameEn: "Field Visits", icon: "MapPin", displayOrder: 13 },
      { id: "quotations", nameAr: "عروض الأسعار", nameEn: "Quotations", icon: "FileSpreadsheet", displayOrder: 14 },
      { id: "analytics", nameAr: "التحليلات", nameEn: "Analytics", icon: "PieChart", displayOrder: 15 },
    ];

    for (const m of modulesData) {
      await db.insert(schema.modules).values(m).onDuplicateKeyUpdate({
        set: { nameAr: m.nameAr, nameEn: m.nameEn, icon: m.icon, displayOrder: m.displayOrder }
      });
    }

    // 3. الصلاحيات (Permissions)
    console.log("🔐 حقن الصلاحيات...");
    const perms = [];
    modulesData.forEach(m => {
      ['view', 'create', 'edit', 'delete', 'approve'].forEach(action => {
        perms.push({
          id: `${m.id}.${action}`,
          moduleId: m.id,
          action,
          nameAr: `${action === 'view' ? 'عرض' : action === 'create' ? 'إضافة' : action === 'edit' ? 'تعديل' : action === 'delete' ? 'حذف' : 'اعتماد'} ${m.nameAr}`,
          nameEn: `${action} ${m.nameEn}`
        });
      });
    });

    for (const p of perms) {
      await db.insert(schema.permissions).values(p).onDuplicateKeyUpdate({
        set: { nameAr: p.nameAr, nameEn: p.nameEn, moduleId: p.moduleId, action: p.action }
      });
    }

    // 4. حقن صلاحيات الأدوار (Role Permissions)
    console.log("🔗 ربط الصلاحيات بالأدوار...");
    const rolePermissionsMapping = {
      super_admin: "*", // كل الصلاحيات
      system_admin: "*", // كل الصلاحيات
      projects_office: ["requests", "mosques", "projects", "reports", "suppliers", "quotations", "contracts", "disbursements", "field_visits"],
      field_team: ["mosques.view", "requests.view", "field_visits"],
      quick_response: ["requests.view", "field_visits.view", "reports.create"],
      financial: ["financial", "quotations", "disbursements", "suppliers.view"],
      financial_manager: ["financial", "quotations", "disbursements", "suppliers", "reports.view"],
      project_manager: ["projects.view", "projects.edit", "reports", "disbursements.view", "handovers"],
      corporate_comm: ["requests.view", "reports.view", "settings.view", "analytics.view"],
      service_requester: ["requests.view", "requests.create", "mosques.view"]
    };

    // جلب كل الصلاحيات المتاحة
    const allPermissions = await db.select().from(schema.permissions);
    const allPermIds = allPermissions.map(p => p.id);

    const rolePermsToInsert = [];

    for (const [roleId, permList] of Object.entries(rolePermissionsMapping)) {
      if (permList === "*") {
        allPermIds.forEach(pId => {
          rolePermsToInsert.push({ roleId, permissionId: pId });
        });
      } else {
        // البحث عن الصلاحيات الدقيقة التي تبدأ بالمفاتيح المذكورة
        allPermIds.forEach(pId => {
          const match = permList.some(key => pId === key || pId.startsWith(key + "."));
          if (match) {
            rolePermsToInsert.push({ roleId, permissionId: pId });
          }
        });
      }
    }

    // تقسيم البيانات لمجموعات لتجنب حدود الاستعلام الكبيرة
    const chunkSize = 100;
    for (let i = 0; i < rolePermsToInsert.length; i += chunkSize) {
      const chunk = rolePermsToInsert.slice(i, i + chunkSize);
      await db.insert(schema.rolePermissions).values(chunk).onDuplicateKeyUpdate({
        set: { roleId: sql`role_id` } // تحديث وهمي للحفاظ على الصلاحية
      });
    }

    // 5. إعدادات الجمعية الافتراضية
    console.log("🏢 حقن إعدادات الجمعية...");
    const orgSettings = {
      organizationName: "جمعية تمام للعناية بالمساجد",
      organizationNameShort: "تمام",
      licenseNumber: "1234",
      administrativeSupervisor: "وزارة الموارد البشرية والتنمية الاجتماعية",
      technicalSupervisor: "وزارة الشؤون الإسلامية والدعوة والإرشاد",
      boardChairmanName: "فهد بن محمد",
      executiveDirectorName: "أحمد بن علي",
      city: "أبها",
      phone: "920000000",
      email: "info@tamam.sa",
      website: "https://tamam.sa",
      colorPrimary1: "#09707e",
      colorPrimary2: "#0891b2",
    };

    await db.insert(schema.organizationSettings).values(orgSettings).onDuplicateKeyUpdate({
      set: orgSettings
    });

    // 5. مفوض التوقيع
    console.log("✍️ حقن مفوض التوقيع...");
    const signatory = {
      name: "أحمد بن علي",
      title: "المدير التنفيذي",
      isDefault: true,
      isActive: true
    };
    await db.insert(schema.signatories).values(signatory).onDuplicateKeyUpdate({
      set: signatory
    });

    // 6. المدن (أبها وخميس مشيط)
    console.log("🏙️ حقن المدن...");
    const cityCategory = {
      name: "City",
      nameAr: "المدن",
      type: "city",
      isActive: true
    };
    
    // إدخال التصنيف أولاً أو تحديثه
    const [insertedCategory] = await db.insert(schema.categories).values(cityCategory).onDuplicateKeyUpdate({
      set: { isActive: true }
    });
    
    // للحصول على ID التصنيف (نحتاج لاستعلام لأن onDuplicateKeyUpdate لا يعيد ID دائماً في Drizzle)
    const categoryResult = await db.select().from(schema.categories).where(sql`${schema.categories.type} = 'city'`).limit(1);
    const categoryId = categoryResult[0].id;

    const cities = [
      { categoryId, value: "Abha", valueAr: "أبها", isActive: true },
      { categoryId, value: "Khamis Mushait", valueAr: "خميس مشيط", isActive: true }
    ];

    for (const city of cities) {
      await db.insert(schema.categoryValues).values(city).onDuplicateKeyUpdate({
        set: { isActive: true }
      });
    }

    // 6.1 البنوك
    console.log("🏦 حقن البنوك الأساسية...");
    const bankCategory = {
      name: "Banks",
      nameAr: "البنوك",
      type: "banks",
      isActive: true
    };
    
    await db.insert(schema.categories).values(bankCategory).onDuplicateKeyUpdate({
      set: { isActive: true }
    });
    
    const bankCategoryResult = await db.select().from(schema.categories).where(sql`${schema.categories.type} = 'banks'`).limit(1);
    const bankCategoryId = bankCategoryResult[0].id;

    const banksList = [
      { categoryId: bankCategoryId, value: "Al Ahli Bank", valueAr: "البنك الأهلي السعودي", isActive: true },
      { categoryId: bankCategoryId, value: "Al Rajhi Bank", valueAr: "مصرف الراجحي", isActive: true },
      { categoryId: bankCategoryId, value: "Riyad Bank", valueAr: "بنك الرياض", isActive: true },
      { categoryId: bankCategoryId, value: "Banque Saudi Fransi", valueAr: "البنك السعودي الفرنسي", isActive: true },
      { categoryId: bankCategoryId, value: "SABB", valueAr: "البنك السعودي البريطاني (ساب)", isActive: true },
      { categoryId: bankCategoryId, value: "Bank Albilad", valueAr: "بنك البلاد", isActive: true },
      { categoryId: bankCategoryId, value: "Bank AlJazira", valueAr: "بنك الجزيرة", isActive: true },
      { categoryId: bankCategoryId, value: "Arab National Bank", valueAr: "البنك العربي الوطني", isActive: true },
      { categoryId: bankCategoryId, value: "Alinma Bank", valueAr: "بنك الإنماء", isActive: true },
      { categoryId: bankCategoryId, value: "Alinma Bank (Masraf)", valueAr: "مصرف الإنماء", isActive: true },
      { categoryId: bankCategoryId, value: "Gulf International Bank", valueAr: "بنك الخليج الدولي", isActive: true },
      { categoryId: bankCategoryId, value: "The Saudi Investment Bank", valueAr: "بنك الاستثمار السعودي", isActive: true }
    ];

    for (const bank of banksList) {
      await db.insert(schema.categoryValues).values(bank).onDuplicateKeyUpdate({
        set: { isActive: true }
      });
    }

    // 6.2 تصنيفات جداول الكميات
    console.log("📋 حقن تصنيفات جداول الكميات الأساسية...");
    const boqCat = {
      name: "BOQ Categories",
      nameAr: "تصنيفات جداول الكميات",
      type: "boq_category",
      isActive: true
    };
    
    await db.insert(schema.categories).values(boqCat).onDuplicateKeyUpdate({
      set: { isActive: true }
    });
    
    const boqCategoryResult = await db.select().from(schema.categories).where(sql`${schema.categories.type} = 'boq_category'`).limit(1);
    const boqCategoryId = boqCategoryResult[0].id;

    const boqCategoriesList = [
      { categoryId: boqCategoryId, value: "Construction Works", valueAr: "أعمال إنشائية", isActive: true },
      { categoryId: boqCategoryId, value: "Electrical Works", valueAr: "أعمال كهربائية", isActive: true },
      { categoryId: boqCategoryId, value: "Plumbing Works", valueAr: "أعمال سباكة", isActive: true },
      { categoryId: boqCategoryId, value: "HVAC", valueAr: "تكييف وتبريد", isActive: true },
      { categoryId: boqCategoryId, value: "Finishing Works", valueAr: "تشطيبات", isActive: true },
      { categoryId: boqCategoryId, value: "Carpentry Works", valueAr: "نجارة", isActive: true },
      { categoryId: boqCategoryId, value: "Painting Works", valueAr: "دهانات", isActive: true },
      { categoryId: boqCategoryId, value: "Flooring Works", valueAr: "أرضيات", isActive: true }
    ];

    for (const boq of boqCategoriesList) {
      await db.insert(schema.categoryValues).values(boq).onDuplicateKeyUpdate({
        set: { isActive: true }
      });
    }

    // 7. قوالب العقود
    console.log("📜 حقن قوالب العقود...");
    const templates = [
      { 
        name: "Supervision Contract", 
        nameAr: "عقد إشراف هندسي", 
        type: "supervision", 
        isActive: true, 
        isDefault: true, 
        isSystem: true,
        description: "القالب الافتراضي لعقود الإشراف الهندسي",
        headerTemplate: "نموذج عقد إشراف هندسي - جمعية تمام",
        introTemplate: "إنه في يوم {{contract_date}} الموافق {{contract_date_hijri}} بمدينة {{mosque_city}}، تم الاتفاق بين كل من:\n\nالطرف الأول: {{organization_name}}، ويمثلها في التوقيع {{signatory_name}} بصفته {{signatory_title}}.\n\nالطرف الثاني: {{second_party_name}}، سجل تجاري رقم {{second_party_cr}}، ويمثلها {{second_party_representative}}.",
        footerTemplate: "بوابة تمام للعناية بالمساجد - عقد إشراف هندسي",
        signatureTemplate: "توقيع الطرف الأول: ....................\nتوقيع الطرف الثاني: ...................."
      },
      { name: "Construction Contract", nameAr: "عقد مقاولات إنشائية", type: "construction", isActive: true, isDefault: true, isSystem: true },
      { name: "Supply Contract", nameAr: "عقد توريد", type: "supply", isActive: true, isDefault: true, isSystem: true },
      { name: "Maintenance Contract", nameAr: "عقد صيانة", type: "maintenance", isActive: true, isDefault: true, isSystem: true },
      { name: "Consulting Contract", nameAr: "عقد استشارات", type: "consulting", isActive: true, isDefault: true, isSystem: true }
    ];

    for (const t of templates) {
      await db.insert(schema.contractTemplates).values(t).onDuplicateKeyUpdate({
        set: { 
          isActive: true, 
          isDefault: true, 
          isSystem: true,
          description: t.description || null,
          headerTemplate: t.headerTemplate || null,
          introTemplate: t.introTemplate || null,
          footerTemplate: t.footerTemplate || null,
          signatureTemplate: t.signatureTemplate || null
        }
      });

      // جلب ID القالب المحقون
      const [insertedTemplate] = await db.select().from(schema.contractTemplates).where(sql`${schema.contractTemplates.type} = ${t.type}`).limit(1);
      const templateId = insertedTemplate.id;

      if (t.type === 'supervision') {
        console.log("📝 حقن بنود عقد الإشراف...");
        const supervisionClauses = [
          {
            templateId,
            title: "Article 1",
            titleAr: "المادة الأولى: التزامات الطرف الأول",
            content: "1. تزويد الطرف الثاني بجميع البيانات والمستندات المتعلقة بالمشروع.\n2. دفع قيمة الخدمات المتفق عليها وفقًا للشروط الزمنية المحددة.\n3. إصدار الدفعات حسب مراحل الإنجاز.",
            category: "obligations_first_party",
            orderIndex: 1,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 2",
            titleAr: "المادة الثانية: التزامات الطرف الثاني",
            content: "1. إصدار التراخيص المطلوبة.\n2. اعتماد كافة المخططات من كل الجهات ذات العلاقة.\n3. تقديم الدراسات الفنية والمخططات المطلوبة وفقًا للمعايير الهندسية.\n4. الالتزام بتسليم الأعمال ضمن الجدول الزمني المحدد.\n5. استخراج التراخيص في نطاق المنطقة.\n6. إجراء التعديلات المطلوبة خلال مدة زمنية محددة.\n7. المحافظة على سرية المعلومات والبيانات المقدمة.\n8. الالتزام بمعايير الجودة والسلامة.",
            category: "obligations_second_party",
            orderIndex: 2,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 3",
            titleAr: "المادة الثالثة: مدة العقد",
            content: "مدة العقد هي {{duration}} {{duration_unit}} تبدأ من تاريخ توقيع هذا العقد.",
            category: "duration",
            orderIndex: 3,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 4",
            titleAr: "المادة الرابعة: قيمة العقد والدفعات",
            content: "القيمة الإجمالية لهذا العقد هي {{contract_amount}} ريال سعودي ({{contract_amount_text}})، تُصرف كدفعات مالية حسب جدول الدفعات المعتمد.",
            category: "financial",
            orderIndex: 4,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 5",
            titleAr: "المادة الخامسة: تعديل العقد",
            content: "1. لا يجوز تعديل أي بند من بنود هذا العقد إلا بموافقة الطرفين كتابياً على التعديل.\n2. يتم إضافة أي بنود إضافية لهذا العقد لملاحق العقد بعد التوقيع عليها من الطرفين.\n3. يشار في الملاحق التي تتبع التوقيع على هذا العقد إلى هذا العقد لإيضاح العمل المنفذ وإثباته.",
            category: "modifications",
            orderIndex: 5,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 6",
            titleAr: "المادة السادسة: الإشعارات والمراسلات",
            content: "1. تتم الإشعارات والمراسلات بين الطرفين كتابياً بواسطة البريد الرسمي أو التسليم باليد بوجود تأكيد خطي على الاستلام أو عبر البريد الإلكتروني أو الفاكس مع تأكيد الاستلام على العناوين المحددة في صدر هذا العقد.\n2. تُعد الإشعارات والمراسلات المرسلة عبر الطرق المحددة صحيحة ومنتجة لكافة آثارها.\n3. في حال قام أحد الطرفين بتغيير عنوانه فيلزم إشعار الطرف الآخر رسمياً بعنوانه الجديد ويكون العنوان الجديد والموضح من الطرف المعني هو العنوان الصحيح وكذلك ضابط الاتصال.",
            category: "notifications",
            orderIndex: 6,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 7",
            titleAr: "المادة السابعة: أحكام عامة",
            content: "1. يتم البدء بالعمل بهذا العقد بموجب التوقيع عليه من قبل الطرفين.\n2. يلتزم الطرف الثاني بتنفيذ الأعمال المطلوبة منه وفق الأصول المتبعة وبأفضل جودة وخلال الفترة الزمنية المحددة بالعقد.\n3. تخضع هذه الاتفاقية لموافقة الطرفين كتابياً في جميع أعمالها والتزامهما بالعمل ضمن بنودها أو الملاحق الموافق عليها خطياً.",
            category: "general",
            orderIndex: 7,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 8",
            titleAr: "المادة الثامنة: سرية المعلومات",
            content: "يتعهد الطرفان بالحفاظ على سرية المعلومات التي تتوفر لديهما بسبب تطبيق هذه الاتفاقية سواءً كانت شفوية أو مكتوبة ولا يجوز إفشاء هذه الأسرار لأي طرف ثالث إلا بعد الحصول على موافقة خطية مسبقة من الطرف الآخر.",
            category: "confidentiality",
            orderIndex: 8,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 9",
            titleAr: "المادة التاسعة: حقوق الملكية الفكرية",
            content: "يلتزم الطرفين بمراعاة حقوق الملكية الفكرية والأدبية الخاصة أو المملوكة للطرف الآخر وعدم التعدي عليها، كما لا تعطي هذه الاتفاقية أياً من الطرفين أي حقوق تجاه حقوق الملكية الفكرية المملوكة للطرف الآخر.",
            category: "intellectual_property",
            orderIndex: 9,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 10",
            titleAr: "المادة العاشرة: حل المنازعات",
            content: "1. في حال حدوث أي خلاف بين الطرفين حول تفسير أو تنفيذ أي بند من بنود هذه الاتفاقية أو ملحقاتها يتم حله بالطرق الودية، فإن تعذر ذلك فيكون الاختصاص للجهات الرسمية وفقاً لأحكام القانون والنظام السعودي.\n2. تخضع هذه الاتفاقية للأنظمة المعمول بها في المملكة العربية السعودية، وفي حالة نشوء أي نزاع بين الطرفين حول أحكام هذه الاتفاقية يعملان على حلّه ودياً، وإذا تعذر ذلك فيعالج النزاع وفقاً للمحكمة المختصة مكانياً وولائياً.",
            category: "disputes",
            orderIndex: 10,
            isRequired: true,
            isEditable: false
          },
          {
            templateId,
            title: "Article 11",
            titleAr: "المادة الحادية عشر: نُسخ الاتفاقية",
            content: "حررت هذه الاتفاقية من نسختين ويُسلم كل طرف نسخة للعمل بموجبها، وتوثيقاً لما تقدم فقد جرى التوقيع على هذه الاتفاقية في التاريخ المبين في مقدمتها.",
            category: "copies",
            orderIndex: 11,
            isRequired: true,
            isEditable: false
          }
        ];

        for (const clause of supervisionClauses) {
          await db.insert(schema.contractClauses).values(clause).onDuplicateKeyUpdate({
            set: { 
              content: clause.content, 
              titleAr: clause.titleAr, 
              category: clause.category,
              orderIndex: clause.orderIndex,
              isRequired: clause.isRequired,
              isEditable: clause.isEditable
            }
          });
        }
      }
    }

    // 8. البرامج الأساسية (Programs)
    console.log("🛠️ حقن البرامج الأساسية (9 برامج)...");
    const programsData = [
      {
        id: "bunyan",
        name: "بنيان",
        description: "بناء مساجد جديدة",
        color: "bg-blue-600",
        icon: "Building2",
        requiresMosque: false,
        isActive: true,
      },
      {
        id: "daaem",
        name: "دعائم",
        description: "استكمال المساجد المتعثرة",
        color: "bg-purple-600",
        icon: "Hammer",
        requiresMosque: true,
        isActive: true,
      },
      {
        id: "enaya",
        name: "عناية",
        description: "الصيانة والترميم",
        color: "bg-green-600",
        icon: "Wrench",
        requiresMosque: true,
        isActive: true,
      },
      {
        id: "emdad",
        name: "إمداد",
        description: "توفير تجهيزات المساجد",
        color: "bg-orange-600",
        icon: "Package",
        requiresMosque: true,
        isActive: true,
      },
      {
        id: "ethraa",
        name: "إثراء",
        description: "سداد فواتير الخدمات",
        color: "bg-red-600",
        icon: "Receipt",
        requiresMosque: true,
        isActive: true,
      },
      {
        id: "sedana",
        name: "سدانة",
        description: "خدمات التشغيل والنظافة",
        color: "bg-cyan-600",
        icon: "Sparkles",
        requiresMosque: true,
        isActive: true,
      },
      {
        id: "taqa",
        name: "طاقة",
        description: "الطاقة الشمسية",
        color: "bg-amber-500",
        icon: "Sun",
        requiresMosque: true,
        isActive: true,
      },
      {
        id: "miyah",
        name: "مياه",
        description: "أنظمة المياه",
        color: "bg-sky-600",
        icon: "Droplets",
        requiresMosque: true,
        isActive: true,
      },
      {
        id: "suqya",
        name: "سقيا",
        description: "توفير ماء الشرب",
        color: "bg-teal-600",
        icon: "GlassWater",
        requiresMosque: true,
        isActive: true,
      },
    ];

    for (const p of programsData) {
      await db.insert(schema.programs).values(p).onDuplicateKeyUpdate({
        set: {
          name: p.name,
          description: p.description,
          color: p.color,
          icon: p.icon,
          requiresMosque: p.requiresMosque,
          isActive: p.isActive,
        },
      });
    }

    // 9. حساب المدير الافتراضي (Admin)
    console.log("🔑 إنشاء حساب المدير الافتراضي...");
    const adminEmail = "admin@tamam.sa";
    const adminPassword = "Admin@123456";
    const salt = generateSalt();
    const passwordHash = `${salt}:${hashPassword(adminPassword, salt)}`;

    const adminUser = {
      email: adminEmail,
      passwordHash: passwordHash,
      name: "مدير النظام",
      role: "super_admin",
      status: "active",
      loginMethod: "local"
    };

    await db.insert(schema.users).values(adminUser).onDuplicateKeyUpdate({
      set: { passwordHash: passwordHash, role: "super_admin", status: "active" }
    });

    console.log("\n✅ تمت عملية حقن البيانات بنجاح!");
    console.log("-----------------------------------");
    console.log(`📧 البريد الإلكتروني: ${adminEmail}`);
    console.log(`🔑 كلمة المرور: ${adminPassword}`);
    console.log("-----------------------------------");

  } catch (error) {
    console.error("❌ حدث خطأ أثناء حقن البيانات:", error);
  } finally {
    await connection.end();
  }
}

seed();
