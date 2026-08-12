import 'dotenv/config';
import { sendEmailNotification } from '../server/routers/notifications';

async function sendUserEmail() {
  console.log("✉️ Sending email to yamenbk6@gmail.com with new HTML Action Button...\n");

  const recipient = "yamenbk6@gmail.com";
  const reqNum = "REQ-2026-9355";
  const evalUrl = "https://tamamgate.manarah.org.sa/requests/75/evaluation";
  const title = `📋 تقييم رضا المستفيد - تم إغلاق الطلب رقم ${reqNum}`;
  const message = `السلام عليكم ورحمة الله وبركاته،\n\nنفيدكم بأنه تم إغلاق طلبكم رقم ${reqNum} بنجاح لدى جمعية عمارة المساجد (منارة).\n\nحرصاً منا على تحسين وتطوير خدماتنا، نأمل منكم تكرمكم بتقييم مستوى رضاكم عن الخدمة المقدمة من خلال الضغط على زر التقييم أدناه:\n\nشكراً لتعاونكم معنا.`;

  const success = await sendEmailNotification(
    recipient,
    title,
    message,
    evalUrl,
    "تقييم الخدمة الآن ⭐"
  );

  if (success) {
    console.log(`✅ SUCCESS: Email with the new HTML button sent successfully to ${recipient}`);
  } else {
    console.error(`❌ FAILED to send email to ${recipient}`);
  }
}

sendUserEmail();
