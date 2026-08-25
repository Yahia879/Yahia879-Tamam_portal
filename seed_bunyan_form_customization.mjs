import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: './.env' });

async function seedBunyanFormCustomization() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in the environment.");
    process.exit(1);
  }

  console.log("=================================================================");
  console.log("🚀 بدء تطبيق Seed لتخصيص نموذج خدمة 'بنيان'...");
  console.log("=================================================================");

  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const settingKey = 'service_form_customization_bunyan';
    const settingType = 'json';
    const description = 'تخصيص نموذج الخدمة: بنيان';

    const bunyanFormConfig = {
      serviceId: 'bunyan',
      serviceName: 'بنيان',
      fields: [
        {
          id: 'workDescription',
          type: 'textarea',
          label: 'وصف الأعمال المطلوبة',
          placeholder: 'اكتب وصفاً تفصيلياً للأعمال المطلوبة...',
          helpText: 'قدم وصفاً مفصلاً لما تحتاجه المسجد',
          required: true,
          isActive: true,
          order: 1,
          isSystem: true,
        },
        {
          id: 'mosqueArea',
          type: 'number',
          label: 'مساحة المسجد بالمتر المربع',
          placeholder: 'مثال: 300',
          helpText: '',
          required: false,
          isActive: true,
          order: 2,
          isSystem: true,
        },
        {
          id: 'actualWorshippers',
          type: 'number',
          label: 'عدد المصلين الفعلي',
          placeholder: 'مثال: 200',
          helpText: '',
          required: false,
          isActive: true,
          order: 3,
          isSystem: true,
        },
        {
          id: 'hasDonorForMaintenance',
          type: 'radio',
          label: 'هل يوجد متبرع للقيام بتكاليف الصيانة المطلوبة؟',
          placeholder: '',
          helpText: '',
          required: false,
          isActive: true,
          order: 4,
          options: [
            { label: 'نعم', value: 'yes' },
            { label: 'لا', value: 'no' },
          ],
          isSystem: true,
        },
        {
          id: 'willingToVolunteer',
          type: 'radio',
          label: 'هل لديكم استعداد لتأسيس فريق تطوعي بقيادتكم لتسويق الفرصة؟',
          placeholder: '',
          helpText: '',
          required: true,
          isActive: true,
          order: 5,
          options: [
            { label: 'نعم', value: 'yes' },
            { label: 'لا', value: 'no' },
          ],
          isSystem: true,
        },
        {
          id: 'neighborhoodName',
          type: 'text',
          label: 'اسم الحي',
          placeholder: 'مثال: حي النسيم',
          helpText: '',
          required: true,
          isActive: true,
          order: 6,
          isSystem: true,
        },
        {
          id: 'hasLand',
          type: 'radio',
          label: 'هل لديكم أرض مخصصة للبناء؟',
          placeholder: '',
          helpText: '',
          required: true,
          isActive: true,
          order: 7,
          options: [
            { label: 'نعم', value: 'yes' },
            { label: 'لا', value: 'no' },
          ],
          isSystem: true,
        },
        {
          id: 'landOwnership',
          type: 'select',
          label: 'ملكية الأرض',
          placeholder: '',
          helpText: '',
          required: true,
          isActive: true,
          order: 8,
          options: [
            { label: 'ملك خاص', value: 'owned' },
            { label: 'وقف', value: 'waqf' },
            { label: 'حكومية', value: 'government' },
            { label: 'أخرى', value: 'other' },
          ],
          isSystem: true,
        },
        {
          id: 'landArea',
          type: 'number',
          label: 'مساحة الأرض بالمتر المربع',
          placeholder: 'مثال: 500',
          helpText: '',
          required: false,
          isActive: true,
          order: 9,
          isSystem: true,
        },
        {
          id: 'landProposal',
          type: 'textarea',
          label: 'مقترحات بخصوص الأرض',
          placeholder: 'أي مقترحات أو ملاحظات بخصوص الأرض...',
          helpText: '',
          required: false,
          isActive: true,
          order: 10,
          isSystem: true,
        },
        {
          id: 'hasDonor',
          type: 'radio',
          label: 'هل لديكم متبرع للقيام بتكاليف البناء؟',
          placeholder: '',
          helpText: '',
          required: true,
          isActive: true,
          order: 11,
          options: [
            { label: 'نعم', value: 'yes' },
            { label: 'لا', value: 'no' },
          ],
          isSystem: true,
        },
        {
          id: 'donationAmount',
          type: 'number',
          label: 'مبلغ التبرع (بالريال السعودي)',
          placeholder: 'مثال: 100000',
          helpText: '',
          required: false,
          isActive: true,
          order: 12,
          isSystem: true,
        },
        {
          id: 'fundingProposal',
          type: 'textarea',
          label: 'مقترحات التمويل',
          placeholder: 'أي مقترحات بخصوص التمويل والتبرعات...',
          helpText: '',
          required: true,
          isActive: true,
          order: 13,
          isSystem: true,
        },
        {
          id: 'nearestMosque',
          type: 'text',
          label: 'أقرب مسجد موجود',
          placeholder: 'اسم أقرب مسجد للموقع المقترح',
          helpText: '',
          required: false,
          isActive: true,
          order: 14,
          isSystem: true,
        },
        {
          id: 'distanceToMosque',
          type: 'number',
          label: 'المسافة من أقرب مسجد (بالكيلومتر)',
          placeholder: 'مثال: 2.5',
          helpText: '',
          required: false,
          isActive: true,
          order: 15,
          isSystem: true,
        },
        {
          id: 'attachment',
          type: 'file',
          label: 'المرفقات والوثائق الداعمة (اختياري)',
          placeholder: 'ملفات PDF أو صور أو مستندات Word',
          helpText: 'يدعم ملفات PDF، الصور، ومستندات Word (الحد الأقصى 10 ميجابايت)',
          required: false,
          isActive: true,
          order: 16,
          isSystem: true,
        },
      ],
    };

    const settingValue = JSON.stringify(bunyanFormConfig);

    // التحقق من وجود السجل مسبقاً
    const [existing] = await conn.execute(
      'SELECT id FROM brand_settings WHERE settingKey = ?',
      [settingKey]
    );

    if (existing.length === 0) {
      await conn.execute(
        'INSERT INTO brand_settings (settingKey, settingValue, settingType, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [settingKey, settingValue, settingType, description]
      );
      console.log(`✅ تم إدراج تخصيص نموذج بنيان بنجاح في جدول brand_settings.`);
    } else {
      await conn.execute(
        'UPDATE brand_settings SET settingValue = ?, settingType = ?, description = ?, updatedAt = NOW() WHERE settingKey = ?',
        [settingValue, settingType, description, settingKey]
      );
      console.log(`🔄 تم تحديث تخصيص نموذج بنيان بنجاح في جدول brand_settings.`);
    }

    console.log(`\n📋 الحقول المرتبة التي تم تطبيقها:`);
    bunyanFormConfig.fields.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.type}] ${f.label} (${f.id}) - مطلوب: ${f.required ? 'نعم' : 'لا'}`);
    });

    console.log("\n=================================================================");
    console.log("🎉 اكتمل تنفيذ الـ Seed بنجاح تام!");
    console.log("=================================================================");
  } catch (error) {
    console.error("❌ حدث خطأ أثناء تنفيذ الـ Seed:", error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seedBunyanFormCustomization();
