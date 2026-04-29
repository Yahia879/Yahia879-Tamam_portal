// سكريبت لإضافة بنود العقد الافتراضية
import mysql from 'mysql2/promise';

const clauses = [
  {
    title: 'Obligations of Second Party',
    titleAr: 'التزامات الطرف الثاني',
    category: 'obligations',
    content: `1. تنفيذ الأعمال المتفق عليها وفقاً للمواصفات والمعايير المحددة.
2. الالتزام بالجدول الزمني المتفق عليه لتنفيذ الأعمال.
3. توفير العمالة المؤهلة والمدربة لتنفيذ الأعمال.
4. الالتزام بأنظمة السلامة والصحة المهنية.
5. تقديم تقارير دورية عن سير العمل.
6. ضمان جودة المواد المستخدمة ومطابقتها للمواصفات.
7. تصحيح أي عيوب أو أخطاء خلال فترة الضمان.
8. الحفاظ على سرية المعلومات المتعلقة بالمشروع.`,
    isRequired: true,
    isEditable: true,
    sortOrder: 2
  },
  {
    title: 'Contract Duration',
    titleAr: 'مدة العقد',
    category: 'duration',
    content: `مدة هذا العقد {{duration}} تبدأ من تاريخ {{startDate}} وتنتهي في {{endDate}}.
ويجوز تمديد العقد باتفاق الطرفين كتابياً قبل انتهاء المدة بثلاثين يوماً على الأقل.`,
    isRequired: true,
    isEditable: true,
    sortOrder: 3
  },
  {
    title: 'Contract Value and Payments',
    titleAr: 'قيمة العقد والدفعات',
    category: 'financial',
    content: `قيمة هذا العقد الإجمالية {{contractValue}} ريال سعودي ({{contractValueInWords}}).
تُسدد القيمة وفقاً لجدول الدفعات التالي:
{{paymentSchedule}}

ملاحظة: جميع المبالغ شاملة لضريبة القيمة المضافة.`,
    isRequired: true,
    isEditable: true,
    sortOrder: 4
  },
  {
    title: 'Contract Amendment',
    titleAr: 'تعديل العقد',
    category: 'general',
    content: `1. لا يجوز تعديل هذا العقد إلا بموافقة كتابية من الطرفين.
2. أي تعديل على نطاق العمل يتطلب ملحقاً مكتوباً يوقعه الطرفان.
3. التعديلات الجوهرية قد تستلزم إعادة تسعير الأعمال.`,
    isRequired: true,
    isEditable: true,
    sortOrder: 5
  },
  {
    title: 'Notices and Communications',
    titleAr: 'الإشعارات والمراسلات',
    category: 'general',
    content: `1. جميع الإشعارات والمراسلات تكون كتابية وترسل على العناوين المذكورة في هذا العقد.
2. يعتبر الإشعار مستلماً بعد 48 ساعة من إرساله بالبريد المسجل أو فوراً بالبريد الإلكتروني.
3. يلتزم كل طرف بإخطار الآخر بأي تغيير في بيانات الاتصال خلال 7 أيام.`,
    isRequired: true,
    isEditable: true,
    sortOrder: 6
  },
  {
    title: 'General Provisions',
    titleAr: 'أحكام عامة',
    category: 'general',
    content: `1. يخضع هذا العقد لأنظمة المملكة العربية السعودية.
2. لا يجوز لأي طرف التنازل عن حقوقه أو التزاماته بموجب هذا العقد دون موافقة كتابية مسبقة من الطرف الآخر.
3. إذا أصبح أي بند من بنود هذا العقد باطلاً أو غير قابل للتنفيذ، فإن ذلك لا يؤثر على صحة باقي البنود.`,
    isRequired: true,
    isEditable: true,
    sortOrder: 7
  },
  {
    title: 'Confidentiality',
    titleAr: 'سرية المعلومات',
    category: 'general',
    content: `يلتزم الطرفان بالحفاظ على سرية جميع المعلومات والبيانات المتبادلة بينهما بموجب هذا العقد، وعدم الإفصاح عنها لأي طرف ثالث دون موافقة كتابية مسبقة، ويستمر هذا الالتزام حتى بعد انتهاء العقد.`,
    isRequired: true,
    isEditable: false,
    sortOrder: 8
  },
  {
    title: 'Intellectual Property Rights',
    titleAr: 'حقوق الملكية الفكرية',
    category: 'general',
    content: `جميع حقوق الملكية الفكرية الناتجة عن تنفيذ هذا العقد تؤول للطرف الأول، ويحق له استخدامها والتصرف فيها دون أي قيود.`,
    isRequired: true,
    isEditable: false,
    sortOrder: 9
  },
  {
    title: 'Dispute Resolution',
    titleAr: 'حل المنازعات',
    category: 'general',
    content: `1. في حالة نشوء أي خلاف أو نزاع بين الطرفين، يتم حله ودياً خلال 30 يوماً من تاريخ إخطار أحد الطرفين للآخر.
2. في حالة تعذر الحل الودي، يُحال النزاع إلى الجهات القضائية المختصة في المملكة العربية السعودية.`,
    isRequired: true,
    isEditable: false,
    sortOrder: 10
  },
  {
    title: 'Agreement Copies',
    titleAr: 'نُسخ الاتفاقية',
    category: 'general',
    content: `حُرر هذا العقد من نسختين أصليتين، بيد كل طرف نسخة للعمل بموجبها.`,
    isRequired: true,
    isEditable: false,
    sortOrder: 11
  }
];

async function seedClauses() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: parseInt(process.env.DB_PORT || '4000'),
    user: process.env.DB_USER || '3muA8VCcfRYqFPB.root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'tamam_portal',
    ssl: { rejectUnauthorized: true }
  });

  try {
    // الحصول على templateId
    const [templates] = await connection.execute(
      'SELECT id FROM contract_templates WHERE name_ar = ? LIMIT 1',
      ['عقد توريد']
    );

    if (templates.length === 0) {
      console.log('لم يتم العثور على قالب عقد التوريد');
      return;
    }

    const templateId = templates[0].id;
    console.log(`تم العثور على القالب: ${templateId}`);

    // إضافة البنود
    for (const clause of clauses) {
      await connection.execute(
        `INSERT INTO contract_clauses (template_id, title, title_ar, category, content, is_required, is_editable, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [templateId, clause.title, clause.titleAr, clause.category, clause.content, clause.isRequired, clause.isEditable, clause.sortOrder]
      );
      console.log(`تم إضافة البند: ${clause.titleAr}`);
    }

    console.log('تم إضافة جميع البنود بنجاح!');
  } catch (error) {
    console.error('خطأ:', error);
  } finally {
    await connection.end();
  }
}

seedClauses();
