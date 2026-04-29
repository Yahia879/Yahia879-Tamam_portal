import { getDb } from "./server/db";
import { modules, permissions, roles, rolePermissions } from "./drizzle/schema";

// الوحدات الرئيسية
const MODULES_DATA = [
  { id: 'requests', nameAr: 'إدارة الطلبات', nameEn: 'Requests Management', icon: 'FileText', displayOrder: 1 },
  { id: 'mosques', nameAr: 'إدارة المساجد', nameEn: 'Mosques Management', icon: 'Building', displayOrder: 2 },
  { id: 'projects', nameAr: 'إدارة المشاريع', nameEn: 'Projects Management', icon: 'Briefcase', displayOrder: 3 },
  { id: 'contracts', nameAr: 'إدارة العقود', nameEn: 'Contracts Management', icon: 'FileSignature', displayOrder: 4 },
  { id: 'suppliers', nameAr: 'إدارة الموردين', nameEn: 'Suppliers Management', icon: 'Users', displayOrder: 5 },
  { id: 'financial', nameAr: 'الإدارة المالية', nameEn: 'Financial Management', icon: 'DollarSign', displayOrder: 6 },
  { id: 'reports', nameAr: 'التقارير', nameEn: 'Reports', icon: 'BarChart', displayOrder: 7 },
  { id: 'settings', nameAr: 'الإعدادات', nameEn: 'Settings', icon: 'Settings', displayOrder: 8 },
  { id: 'users', nameAr: 'إدارة المستخدمين', nameEn: 'Users Management', icon: 'UserCog', displayOrder: 9 },
  { id: 'permissions', nameAr: 'إدارة الصلاحيات', nameEn: 'Permissions Management', icon: 'Shield', displayOrder: 10 }
];

// أنواع الصلاحيات
const PERMISSION_TYPES = [
  { action: 'view', nameAr: 'عرض', nameEn: 'View' },
  { action: 'create', nameAr: 'إضافة', nameEn: 'Create' },
  { action: 'edit', nameAr: 'تعديل', nameEn: 'Edit' },
  { action: 'delete', nameAr: 'حذف', nameEn: 'Delete' },
  { action: 'approve', nameAr: 'اعتماد', nameEn: 'Approve' },
  { action: 'export', nameAr: 'تصدير', nameEn: 'Export' },
  { action: 'print', nameAr: 'طباعة', nameEn: 'Print' }
];

// الأدوار الافتراضية (من schema.ts)
const DEFAULT_ROLES = [
  {
    id: 'super_admin',
    nameAr: 'المدير العام',
    nameEn: 'Super Admin',
    description: 'صلاحيات كاملة على جميع الأنظمة',
    isSystem: true
  },
  {
    id: 'system_admin',
    nameAr: 'مدير النظام',
    nameEn: 'System Admin',
    description: 'إدارة النظام والمستخدمين والصلاحيات',
    isSystem: true
  },
  {
    id: 'projects_office',
    nameAr: 'مكتب المشاريع',
    nameEn: 'Projects Office',
    description: 'إدارة الطلبات والمشاريع والعقود',
    isSystem: true
  },
  {
    id: 'field_team',
    nameAr: 'الفريق الميداني',
    nameEn: 'Field Team',
    description: 'المعاينة الميدانية وإعداد التقارير',
    isSystem: true
  },
  {
    id: 'quick_response',
    nameAr: 'فريق الاستجابة السريعة',
    nameEn: 'Quick Response Team',
    description: 'الاستجابة السريعة للطلبات العاجلة',
    isSystem: true
  },
  {
    id: 'financial',
    nameAr: 'الإدارة المالية',
    nameEn: 'Financial Management',
    description: 'إدارة العمليات المالية والدفعات',
    isSystem: true
  },
  {
    id: 'project_manager',
    nameAr: 'مدير المشروع',
    nameEn: 'Project Manager',
    description: 'إدارة تنفيذ المشاريع',
    isSystem: true
  },
  {
    id: 'corporate_comm',
    nameAr: 'الاتصال المؤسسي',
    nameEn: 'Corporate Communications',
    description: 'إدارة الشركاء والتواصل المؤسسي',
    isSystem: true
  },
  {
    id: 'service_requester',
    nameAr: 'طالب الخدمة',
    nameEn: 'Service Requester',
    description: 'تقديم الطلبات ومتابعتها',
    isSystem: true
  }
];

// صلاحيات كل دور
const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  super_admin: ['*'], // جميع الصلاحيات
  system_admin: [
    'users.*',
    'permissions.*',
    'settings.*',
    'reports.view',
    'reports.export'
  ],
  projects_office: [
    'requests.*',
    'mosques.*',
    'projects.*',
    'contracts.*',
    'suppliers.view',
    'reports.view',
    'reports.export'
  ],
  field_team: [
    'requests.view',
    'requests.edit',
    'mosques.view',
    'projects.view'
  ],
  quick_response: [
    'requests.view',
    'requests.edit',
    'mosques.view'
  ],
  financial: [
    'financial.*',
    'contracts.view',
    'projects.view',
    'reports.view',
    'reports.export'
  ],
  project_manager: [
    'projects.*',
    'contracts.view',
    'suppliers.view',
    'reports.view'
  ],
  corporate_comm: [
    'settings.view',
    'settings.edit',
    'reports.view'
  ],
  service_requester: [
    'requests.view',
    'requests.create',
    'mosques.view',
    'mosques.create'
  ]
};

async function main() {
  console.log('🚀 بدء تهيئة نظام الصلاحيات...\n');

  const db = await getDb();
  if (!db) {
    console.error('❌ خطأ: لا يمكن الاتصال بقاعدة البيانات');
    process.exit(1);
  }

  try {
    // 1. إضافة الوحدات
    console.log('📦 إضافة الوحدات الرئيسية...');
    for (const module of MODULES_DATA) {
      await db.insert(modules).values(module).onDuplicateKeyUpdate({ set: { id: module.id } });
      console.log(`  ✓ ${module.nameAr}`);
    }
    console.log(`✅ تم إضافة ${MODULES_DATA.length} وحدة\n`);

    // 2. إضافة الصلاحيات
    console.log('🔐 إضافة الصلاحيات التفصيلية...');
    let permissionsCount = 0;
    for (const module of MODULES_DATA) {
      for (const permType of PERMISSION_TYPES) {
        const permissionId = `${module.id}.${permType.action}`;
        await db.insert(permissions).values({
          id: permissionId,
          moduleId: module.id,
          action: permType.action,
          nameAr: `${permType.nameAr} ${module.nameAr}`,
          nameEn: `${permType.nameEn} ${module.nameEn}`,
          description: `صلاحية ${permType.nameAr} في ${module.nameAr}`
        }).onDuplicateKeyUpdate({ set: { id: permissionId } });
        permissionsCount++;
      }
      console.log(`  ✓ ${module.nameAr}: ${PERMISSION_TYPES.length} صلاحيات`);
    }
    console.log(`✅ تم إضافة ${permissionsCount} صلاحية\n`);

    // 3. إضافة الأدوار الافتراضية
    console.log('👥 إضافة الأدوار الافتراضية...');
    for (const role of DEFAULT_ROLES) {
      await db.insert(roles).values(role).onDuplicateKeyUpdate({ set: { id: role.id } });
      console.log(`  ✓ ${role.nameAr}`);
    }
    console.log(`✅ تم إضافة ${DEFAULT_ROLES.length} دور\n`);

    // 4. ربط الصلاحيات بالأدوار
    console.log('🔗 ربط الصلاحيات بالأدوار...');
    
    // جمع جميع الصلاحيات المتاحة
    const allPermissions = await db.select().from(permissions);
    const allPermissionIds = allPermissions.map(p => p.id);

    for (const [roleId, permPatterns] of Object.entries(ROLE_PERMISSIONS_MAP)) {
      let rolePermissions: string[] = [];

      if (permPatterns.includes('*')) {
        // جميع الصلاحيات
        rolePermissions = allPermissionIds;
      } else {
        // صلاحيات محددة
        for (const pattern of permPatterns) {
          if (pattern.endsWith('.*')) {
            // جميع صلاحيات الوحدة
            const moduleId = pattern.replace('.*', '');
            rolePermissions.push(...allPermissionIds.filter(p => p.startsWith(`${moduleId}.`)));
          } else {
            // صلاحية محددة
            rolePermissions.push(pattern);
          }
        }
      }

      // إضافة الصلاحيات للدور
      for (const permId of rolePermissions) {
        try {
          await db.insert(rolePermissions).values({
            roleId,
            permissionId: permId
          }).onDuplicateKeyUpdate({ set: { roleId } });
        } catch (error) {
          // تجاهل أخطاء التكرار
        }
      }

      const role = DEFAULT_ROLES.find(r => r.id === roleId);
      console.log(`  ✓ ${role?.nameAr}: ${rolePermissions.length} صلاحية`);
    }
    console.log(`✅ تم ربط الصلاحيات بالأدوار\n`);

    console.log('🎉 تم تهيئة نظام الصلاحيات بنجاح!');
    console.log('\n📊 الملخص:');
    console.log(`  • ${MODULES_DATA.length} وحدات رئيسية`);
    console.log(`  • ${permissionsCount} صلاحية تفصيلية`);
    console.log(`  • ${DEFAULT_ROLES.length} أدوار افتراضية`);

  } catch (error) {
    console.error('❌ خطأ في تهيئة نظام الصلاحيات:', error);
    throw error;
  }

  process.exit(0);
}

main();
