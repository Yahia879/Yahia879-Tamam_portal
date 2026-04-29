import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function addTestData() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // الحصول على أول طلب موجود
    const [requests] = await connection.query('SELECT id FROM mosque_requests LIMIT 1');
    
    if (requests.length === 0) {
      console.log('لا توجد طلبات في قاعدة البيانات');
      return;
    }
    
    const requestId = requests[0].id;
    console.log(`إضافة بيانات تجريبية للطلب رقم: ${requestId}`);
    
    // إضافة تعليقات تجريبية
    const comments = [
      {
        comment: 'تم استلام الطلب ومراجعته بشكل أولي. جميع المستندات المطلوبة مرفقة.',
        userId: 1,
      },
      {
        comment: 'تمت الموافقة على الطلب من قبل اللجنة الفنية. سيتم التواصل مع مقدم الطلب قريباً.',
        userId: 1,
      },
      {
        comment: 'تم جدولة الزيارة الميدانية ليوم الأحد القادم الساعة 10 صباحاً.',
        userId: 1,
      },
      {
        comment: 'هل يمكن تزويدنا بصور إضافية للموقع؟',
        userId: 1,
      },
      {
        comment: 'تم رفع الصور المطلوبة في المرفقات.',
        userId: 1,
      },
    ];
    
    for (const c of comments) {
      await connection.query(
        'INSERT INTO request_comments (requestId, userId, comment, isInternal, createdAt) VALUES (?, ?, ?, ?, NOW())',
        [requestId, c.userId, c.comment, false]
      );
    }
    console.log(`✅ تم إضافة ${comments.length} تعليقات`);
    
    // إضافة مرفقات تجريبية
    const attachments = [
      {
        fileName: 'صورة المسجد الخارجية.jpg',
        fileUrl: 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=800',
        fileType: 'image/jpeg',
        fileSize: 245678,
      },
      {
        fileName: 'مخطط الموقع.pdf',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileType: 'application/pdf',
        fileSize: 156789,
      },
      {
        fileName: 'صور إضافية للموقع.jpg',
        fileUrl: 'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=800',
        fileType: 'image/jpeg',
        fileSize: 312456,
      },
    ];
    
    for (const attachment of attachments) {
      await connection.query(
        'INSERT INTO request_attachments (requestId, fileName, fileUrl, fileType, fileSize, uploadedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [requestId, attachment.fileName, attachment.fileUrl, attachment.fileType, attachment.fileSize, 1]
      );
    }
    console.log(`✅ تم إضافة ${attachments.length} مرفقات`);
    
    console.log('\n✅ تم إضافة جميع البيانات التجريبية بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await connection.end();
  }
}

addTestData();
