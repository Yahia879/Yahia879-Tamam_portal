import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL || 'mysql://root:@localhost:3306/temam');
  console.log('🚀 بدء إنشاء الطلب في مرحلة التعاقد بكافة البيانات المطلوبة...\n');

  // 1. إنشاء المسجد
  const [mosqueRes] = await connection.execute(
    'INSERT INTO mosques (' +
    '  name, city, district, address, governorate, center, area, capacity,' +
    '  hasPrayerHall, mosqueAge, imamName, imamPhone, imamEmail,' +
    '  approvalStatus, mosqueType, createdAt, updatedAt' +
    ') VALUES (' +
    '  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()' +
    ')',
    [
      'جامع الفاروق - حي المنسك',
      'أبها',
      'حي المنسك',
      'شارع الإمام مسلم، حي المنسك، أبها',
      'منطقة عسير',
      'أبها',
      650.00,
      550,
      1,
      8,
      'الشيخ عبدالله بن صالح الغامدي',
      '0551234567',
      'imam.farooq@gmail.com',
      'approved',
      'جامع'
    ]
  );
  const mosqueId = mosqueRes.insertId;
  console.log('✅ تم إنشاء المسجد: جامع الفاروق (ID: ' + mosqueId + ')');

  // 2. تحديث تسلسل أرقام الطلبات
  const currentYear = new Date().getFullYear();
  const [existingSeq] = await connection.execute('SELECT * FROM request_number_sequence WHERE year = ?', [currentYear]);
  let reqSeq = 1;
  if (existingSeq.length > 0) {
    reqSeq = existingSeq[0].lastSequence + 1;
    await connection.execute('UPDATE request_number_sequence SET lastSequence = ?, updatedAt = NOW() WHERE year = ?', [reqSeq, currentYear]);
  } else {
    await connection.execute('INSERT INTO request_number_sequence (year, lastSequence, updatedAt) VALUES (?, 1, NOW())', [currentYear]);
  }
  const requestNumber = 'REQ-' + currentYear + '-ENA-' + String(reqSeq).padStart(4, '0');
  console.log('✅ توليد رقم الطلب: ' + requestNumber);

  // 3. تحديث تسلسل أرقام المشاريع
  const [existingProjSeq] = await connection.execute('SELECT * FROM project_number_sequence WHERE year = ?', [currentYear]);
  let projSeq = 1;
  if (existingProjSeq.length > 0) {
    projSeq = existingProjSeq[0].lastSequence + 1;
    await connection.execute('UPDATE project_number_sequence SET lastSequence = ?, updatedAt = NOW() WHERE year = ?', [projSeq, currentYear]);
  } else {
    await connection.execute('INSERT INTO project_number_sequence (year, lastSequence, updatedAt) VALUES (?, 1, NOW())', [currentYear]);
  }
  const projectNumber = 'PRJ-' + currentYear + '-' + String(projSeq).padStart(4, '0');
  console.log('✅ توليد رقم المشروع: ' + projectNumber);

  const winningQuotationNumber = 'QUO-' + currentYear + '-FAR-001';
  const alternateQuotationNumber = 'QUO-' + currentYear + '-FAR-002';

  const programData = JSON.stringify({
    workDescription: 'مشروع ترميم شامل وتأهيل لجامع الفاروق يشمل العزل المائي والحراري للأسطح وتجديد دورات المياه والإنارة والتكييف ومعالجة التشققات',
    mosqueArea: '650',
    actualWorshippers: '550',
    hasDonorForMaintenance: 'no',
    willingToVolunteer: 'yes',
    neighborhoodName: 'المنسك',
    hasLand: 'yes',
    landOwnership: 'waqf',
    hasDonor: 'yes',
    fundingProposal: 'تم اعتماد التمويل من صندوق رعاية المساجد وبرنامج عناية',
    urgencyReason: 'وجود تصدعات وتلف في عزل الأسطح وتسربات مياه الأمطار داخل الجامع',
    applicantName: 'الشيخ عبدالله بن صالح الغامدي',
    applicantPhone: '0551234567',
    applicantRelation: 'إمام المسجد'
  });

  // 4. إنشاء الطلب في مرحلة التعاقد
  const [reqRes] = await connection.execute(
    'INSERT INTO mosque_requests (' +
    '  requestNumber, mosqueId, userId, programType, currentStage, status, priority,' +
    '  assignedTo, currentResponsible, currentResponsibleDepartment, reviewCompleted,' +
    '  fieldVisitAssignedTo, fieldVisitScheduledDate, fieldVisitScheduledTime,' +
    '  fieldVisitContactName, fieldVisitContactTitle, fieldVisitContactPhone,' +
    '  programData, requestTrack, technicalEvalDecision, technicalEvalJustification,' +
    '  estimatedCost, approvedBudget, selectedQuotationId, descriptiveName,' +
    '  submittedAt, reviewedAt, approvedAt, createdAt, updatedAt' +
    ') VALUES (' +
    '  ?, ?, ?, ?, ?, ?, ?,' +
    '  ?, ?, ?, ?,' +
    '  ?, ?, ?,' +
    '  ?, ?, ?,' +
    '  ?, ?, ?, ?,' +
    '  ?, ?, ?, ?,' +
    '  NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 9 DAY, NOW() - INTERVAL 1 DAY, NOW(), NOW()' +
    ')',
    [
      requestNumber,
      mosqueId,
      8, // مقدم الطلب: محمد محمد محمد
      'enaya',
      'contracting',
      'approved',
      'urgent',
      4, // مكتب إدارة المشاريع
      1, // مدير النظام
      'مكتب المشاريع',
      1,
      2, // تركي الشريف (field_team)
      new Date(Date.now() - 8 * 24 * 3600 * 1000),
      '09:00',
      'الشيخ عبدالله بن صالح الغامدي',
      'إمام الجامع',
      '0551234567',
      programData,
      'standard',
      'convert_to_project',
      'المسجد بحاجة ماسة لأعمال الترميم والتأهيل الإنشائي والمعماري والكهربائي والطلب يستوفي كافة معايير برنامج عناية، ويوصى بالتحويل لمشروع والتعاقد.',
      250000.00,
      245000.00,
      winningQuotationNumber,
      'مشروع ترميم وتأهيل جامع الفاروق بحي المنسك'
    ]
  );
  const requestId = reqRes.insertId;
  console.log('✅ تم إنشاء الطلب بنجاح (ID: ' + requestId + ', الرقم: ' + requestNumber + ')');

  // 5. إنشاء تقرير الزيارة الميدانية
  await connection.execute(
    'INSERT INTO field_visit_reports (' +
    '  requestId, visitedBy, visitDate, mosqueCondition, conditionRating,' +
    '  menPrayerLength, menPrayerWidth, menPrayerHeight,' +
    '  womenPrayerExists, womenPrayerLength, womenPrayerWidth, womenPrayerHeight,' +
    '  requiredNeeds, generalDescription, findings, recommendations,' +
    '  estimatedCost, technicalNeeds, teamMember1, teamMember2,' +
    '  beneficiaryInfoAccuracyRating, beneficiaryInfoAccuracyNotes,' +
    '  createdAt, updatedAt' +
    ') VALUES (' +
    '  ?, ?, NOW() - INTERVAL 7 DAY, ?, ?,' +
    '  ?, ?, ?,' +
    '  ?, ?, ?, ?,' +
    '  ?, ?, ?, ?,' +
    '  ?, ?, ?, ?,' +
    '  ?, ?,' +
    '  NOW() - INTERVAL 7 DAY, NOW() - INTERVAL 7 DAY' +
    ')',
    [
      requestId,
      2, // تركي الشريف
      'يحتاج ترميم وتأهيل شامل',
      'poor',
      26.00, 20.00, 4.50,
      1, 10.00, 8.00, 3.50,
      'عزل مائي وحراري للأسطح، ترميم وصيانة دورات المياه، تغيير وحدات الإنارة إلى LED موفرة، صيانة أنظمة التكييف، معالجة التشققات الإنشائية والدهانات',
      'جامع خرساني مكون من دورين ومصلى نساء، يعاني من تسربات مياه الأمطار في السقف العلوي وتلف جزئي في بلاط دورات المياه ومغاسل الوضوء',
      'تمت المعاينة الميدانية من قبل الفريق الفني، وتبين وجود حاجة ملحة لترميم السقف والواجهات الداخلية ودورات المياه والمواضئ تجنباً لتفاقم التلف الإنشائي',
      'الموافقة الفورية على إدراج الجامع ضمن مسار مشاريع برنامج عناية وإعداد جدول الكميات والبدء في استدراج عروض الأسعار للتعاقد',
      250000.00,
      'مقاول معتمد لأعمال العزل والترميم والتشطيبات العامة',
      'تركي الشريف',
      'م. سعود آل ناصر',
      5,
      'البيانات دقيقة ومطابقة للواقع الميداني'
    ]
  );
  console.log('✅ تم إنشاء تقرير الزيارة الميدانية للطلب');

  // 6. إنشاء التقييم الفني
  await connection.execute(
    'INSERT INTO request_evaluations (' +
    '  requestId, userId, decision, justification, notes, createdAt' +
    ') VALUES (' +
    '  ?, ?, ?, ?, ?, NOW() - INTERVAL 6 DAY' +
    ')',
    [
      requestId,
      1, // مدير النظام
      'convert_to_project',
      'استيفاء كافة المعايير الفنية والهندسية واكتمال تقرير المعاينة الميدانية، واعتماد التحويل إلى مسار مشروع تمهيداً للتعاقد والتنفيذ.',
      'تم اعتماد التقرير الفني والموافقة على إعداد جدول الكميات والبدء في إجراءات الطرح والترسية'
    ]
  );
  console.log('✅ تم تسجيل التقييم الفني واعتماد التحويل إلى مشروع');

  // 7. إنشاء المشروع المرتبط
  const [projRes] = await connection.execute(
    'INSERT INTO projects (' +
    '  projectNumber, requestId, name, description, managerId, status,' +
    '  budget, actualCost, startDate, expectedEndDate, completionPercentage,' +
    '  donorName, isMultiMosque, createdAt, updatedAt' +
    ') VALUES (' +
    '  ?, ?, ?, ?, ?, ?,' +
    '  ?, ?, NOW() - INTERVAL 5 DAY, NOW() + INTERVAL 90 DAY, ?,' +
    '  ?, ?, NOW() - INTERVAL 5 DAY, NOW()' +
    ')',
    [
      projectNumber,
      requestId,
      'مشروع ترميم وتأهيل جامع الفاروق بحي المنسك',
      'أعمال الترميم الشامل والعزل المائي والكهرباء والسباكة لجامع الفاروق بأبها',
      4, // مكتب إدارة المشاريع
      'planning',
      245000.00,
      0.00,
      25,
      'صندوق رعاية المساجد',
      0
    ]
  );
  const projectId = projRes.insertId;
  console.log('✅ تم إنشاء المشروع المرتبط: ' + projectNumber + ' (ID: ' + projectId + ')');

  // إنشاء مراحل المشروع الافتراضية
  const phases = [
    { name: 'المرحلة الأولى : الإنشاء والتخطيط', order: 1, status: 'completed' },
    { name: 'المرحلة الثانية : إعداد جدول الكميات', order: 2, status: 'completed' },
    { name: 'المرحلة الثالثة : اعتماد عرض السعر المناسب', order: 3, status: 'completed' },
    { name: 'المرحلة الرابعة : التعاقد', order: 4, status: 'in_progress' },
    { name: 'المرحلة الخامسة : صرف المدفوعات', order: 5, status: 'pending' },
    { name: 'المرحلة السادسة : المراجعة والإغلاق', order: 6, status: 'pending' }
  ];
  for (const p of phases) {
    await connection.execute(
      'INSERT INTO project_phases (projectId, phaseName, phaseOrder, status, createdAt, updatedAt)' +
      ' VALUES (?, ?, ?, ?, NOW(), NOW())',
      [projectId, p.name, p.order, p.status]
    );
  }
  console.log('✅ تم إنشاء مراحل المشروع الستة');

  // 8. إنشاء التفاصيل المالية للمشروع
  await connection.execute(
    'INSERT INTO project_financial_details (' +
    '  projectId, supportEntity, customSupportEntity, supportAmount,' +
    '  adminFeeType, adminFeeValue, adminFeeAmount, associationFundingAmount,' +
    '  supportSourcesJson, notes, createdAt, updatedAt' +
    ') VALUES (' +
    '  ?, ?, ?, ?,' +
    '  ?, ?, ?, ?,' +
    '  ?, ?, NOW(), NOW()' +
    ')',
    [
      projectId,
      'صندوق رعاية المساجد',
      '',
      245000.00,
      'percentage',
      5.00,
      12250.00,
      0.00,
      JSON.stringify([{ entity: 'صندوق رعاية المساجد', customEntity: '', amount: 245000.00 }]),
      'تم اعتماد الدعم المالي والترسية على المقاول الفائز بمبلغ 245,000 ريال'
    ]
  );
  console.log('✅ تم إنشاء البيانات المالية للمشروع');

  // 9. إنشاء بنود جدول الكميات (BOQ)
  const boqItems = [
    {
      itemName: 'أعمال العزل المائي والحراري للأسطح بنظام الممبرين المعتمد',
      itemDescription: 'توريد وتركيب طبقات العزل المائي والحراري (فوم بولي يوريثان + لفائف بيتومينية سمك 4 مم) مع اختبار الغمر بالماء لمدة 48 ساعة والضمان لمدة 10 سنوات',
      unit: 'م2',
      quantity: 650.000,
      unitPrice: 120.00,
      totalPrice: 78000.00,
      category: 'boq_category_1784196242033_g0550p'
    },
    {
      itemName: 'تأهيل وترميم دورات المياه والمواضئ بالكامل',
      itemDescription: 'إزالة البلاط التالف وتجديد التمديدات الصحية وتركيب بلاط سيراميك نخب أول للجدران والأرضيات وتوريد مغاسل وخلاطات موفرة للمياه',
      unit: 'مقطوعية',
      quantity: 1.000,
      unitPrice: 55000.00,
      totalPrice: 55000.00,
      category: 'Plumbing Works'
    },
    {
      itemName: 'تجديد شبكة الإنارة واللوحات الكهربائية',
      itemDescription: 'استبدال الكشافات التقليدية بوحدات إضاءة LED موفرة وتحديث القواطع واللوحات الكهربائية الرئيسية والفرعية وتأريض الشبكة بالكامل',
      unit: 'مقطوعية',
      quantity: 1.000,
      unitPrice: 42000.00,
      totalPrice: 42000.00,
      category: 'Electrical Works'
    },
    {
      itemName: 'أعمال الدهانات ومعالجة التشققات الداخلية والخارجية',
      itemDescription: 'معالجة شروخ وتصدعات اللياسة بمواد إيبوكسية غير قابلة للانكماش، وتطبيق دهانات بروفايل خارجية ودهانات أكريليك داخلية مقاومة للبكتيريا والرطوبة',
      unit: 'م2',
      quantity: 1400.000,
      unitPrice: 50.00,
      totalPrice: 70000.00,
      category: 'Painting Works'
    }
  ];

  for (const item of boqItems) {
    await connection.execute(
      'INSERT INTO quantity_schedules (' +
      '  requestId, projectId, mosqueId, itemName, itemDescription,' +
      '  unit, quantity, unitPrice, totalPrice, category, createdAt, updatedAt' +
      ') VALUES (' +
      '  ?, ?, ?, ?, ?,' +
      '  ?, ?, ?, ?, ?, NOW() - INTERVAL 4 DAY, NOW()' +
      ')',
      [
        requestId,
        projectId,
        mosqueId,
        item.itemName,
        item.itemDescription,
        item.unit,
        item.quantity,
        item.unitPrice,
        item.totalPrice,
        item.category
      ]
    );
  }
  console.log('✅ تم إضافة ' + boqItems.length + ' بنود في جدول الكميات بإجمالي 245,000 ريال');

  // 10. إضافة عروض الأسعار (Quotations)
  const [qWin] = await connection.execute(
    'INSERT INTO quotations (' +
    '  quotationNumber, requestId, projectId, supplierId, totalAmount,' +
    '  includesTax, finalAmount, approvedAmount, status, notes,' +
    '  createdAt, updatedAt' +
    ') VALUES (' +
    '  ?, ?, ?, ?, ?,' +
    '  ?, ?, ?, ?, ?,' +
    '  NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 1 DAY' +
    ')',
    [
      winningQuotationNumber,
      requestId,
      projectId,
      7, // مؤسسة عبدالرحمن يحيى عبدالرحمن الزهراني للمقاولات
      245000.00,
      1,
      245000.00,
      245000.00,
      'accepted',
      'عرض أسعار متكامل مطابق لكافة المواصفات والشروط الفنية وبضمان 10 سنوات على العزل المائي'
    ]
  );
  const winningQuotationDbId = qWin.insertId;

  // ربط العرض المعتمد بـ project_financial_details
  await connection.execute(
    'UPDATE project_financial_details SET approvedQuotationId = ? WHERE projectId = ?',
    [winningQuotationDbId, projectId]
  );

  // العرض الثاني (منافس): مؤسسة مثلث الرواد (supplierId: 9)
  await connection.execute(
    'INSERT INTO quotations (' +
    '  quotationNumber, requestId, projectId, supplierId, totalAmount,' +
    '  includesTax, finalAmount, status, notes,' +
    '  createdAt, updatedAt' +
    ') VALUES (' +
    '  ?, ?, ?, ?, ?,' +
    '  ?, ?, ?, ?,' +
    '  NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY' +
    ')',
    [
      alternateQuotationNumber,
      requestId,
      projectId,
      9, // مؤسسة مثلث الرواد
      268500.00,
      1,
      268500.00,
      'pending',
      'عرض أسعار بديل غير شامل بعض شروط الضمان الإضافية'
    ]
  );
  console.log('✅ تم تسجيل عروض الأسعار وتحديد العرض الفائز: ' + winningQuotationNumber);

  // 11. سجل تاريخ الطلب (Request History)
  const historyEntries = [
    {
      action: 'request_created',
      fromStage: null,
      toStage: 'submitted',
      fromStatus: null,
      toStatus: 'pending',
      notes: 'تقديم طلب جديد لترميم وتأهيل جامع الفاروق بحي المنسك بأبها',
      daysAgo: 10
    },
    {
      action: 'stage_updated',
      fromStage: 'submitted',
      toStage: 'initial_review',
      fromStatus: 'pending',
      toStatus: 'under_review',
      notes: 'تم تحويل الطلب إلى مرحلة المراجعة الأولية',
      daysAgo: 9
    },
    {
      action: 'stage_updated',
      fromStage: 'initial_review',
      toStage: 'field_visit',
      fromStatus: 'under_review',
      toStatus: 'under_review',
      notes: 'تم تحويل الطلب إلى مرحلة الزيارة الميدانية وتكليف فريق المعاينة',
      daysAgo: 8
    },
    {
      action: 'field_visit_scheduled',
      fromStage: null,
      toStage: null,
      fromStatus: null,
      toStatus: null,
      notes: 'تم جدولة زيارة ميدانية لمعاينة الموقع وتحديد نطاق الأعمال المطلوبة',
      daysAgo: 8
    },
    {
      action: 'stage_updated',
      fromStage: 'field_visit',
      toStage: 'technical_eval',
      fromStatus: 'under_review',
      toStatus: 'under_review',
      notes: 'تم رفع تقرير الزيارة الميدانية والتحويل للتقييم الفني',
      daysAgo: 7
    },
    {
      action: 'technical_eval_convert_to_project',
      fromStage: 'technical_eval',
      toStage: 'boq_preparation',
      fromStatus: 'under_review',
      toStatus: 'in_progress',
      notes: 'اعتماد التقييم الفني وتحويل الطلب إلى مشروع رقم ' + projectNumber + ' وإعداد جدول الكميات',
      daysAgo: 6
    },
    {
      action: 'stage_updated',
      fromStage: 'boq_preparation',
      toStage: 'financial_eval_and_approval',
      fromStatus: 'in_progress',
      toStatus: 'in_progress',
      notes: 'تم استكمال واعتماد جدول الكميات والتحويل للتقييم المالي واستدراج عروض الأسعار',
      daysAgo: 4
    },
    {
      action: 'select_winning_quotation',
      fromStage: 'financial_eval_and_approval',
      toStage: 'financial_eval_and_approval',
      fromStatus: 'in_progress',
      toStatus: 'in_progress',
      notes: 'تم اختيار عرض السعر ' + winningQuotationNumber + ' (مؤسسة عبدالرحمن يحيى الزهراني للمقاولات) كعرض فائز بقيمة ٢٤٥٬٠٠٠ ريال',
      daysAgo: 2
    },
    {
      action: 'financial_approval',
      fromStage: 'financial_eval_and_approval',
      toStage: 'contracting',
      fromStatus: 'in_progress',
      toStatus: 'approved',
      notes: 'الاعتماد المالي: ٢٤٥٬٠٠٠ ريال - وتم تحويل الطلب إلى مرحلة التعاقد لإعداد وتوقيع العقد مع المقاول الفائز',
      daysAgo: 1
    }
  ];

  for (const h of historyEntries) {
    await connection.execute(
      'INSERT INTO request_history (' +
      '  requestId, userId, action, fromStage, toStage, fromStatus, toStatus, notes, createdAt' +
      ') VALUES (' +
      '  ?, 1, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ' + h.daysAgo + ' DAY' +
      ')',
      [
        requestId,
        h.action,
        h.fromStage,
        h.toStage,
        h.fromStatus,
        h.toStatus,
        h.notes
      ]
    );
  }
  console.log('✅ تم تسجيل كامل خطوات دورة العمل في سجل تاريخ الطلب (' + historyEntries.length + ' إجراءات)');

  console.log('\n🎉 اكتمل إنشاء الطلب بنجاح وهو الآن في مرحلة التعاقد جاهز لإنشاء العقد:');
  console.log('- رقم الطلب (Request Number): ' + requestNumber);
  console.log('- معرّف الطلب (Request ID): ' + requestId);
  console.log('- اسم المسجد: جامع الفاروق - حي المنسك (أبها)');
  console.log('- البرنامج: برنامج عناية (enaya)');
  console.log('- المرحلة الحالية: التعاقد (contracting)');
  console.log('- الحالة: معتمد (approved)');
  console.log('- المشروع المرتبط: ' + projectNumber + ' (ID: ' + projectId + ')');
  console.log('- المقاول الفائز المعتمد: مؤسسة عبدالرحمن يحيى عبدالرحمن الزهراني للمقاولات');
  console.log('- قيمة العرض والاعتماد المالي: 245,000 ريال');
  console.log('- رابط الطلب: http://localhost:3001/requests/' + requestId);
  console.log('- رابط إنشاء العقد: http://localhost:3001/contracts/new?requestId=' + requestId);

  await connection.end();
}

main().catch(err => {
  console.error('❌ خطأ:', err);
  process.exit(1);
});
