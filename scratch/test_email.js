import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const service = process.env.SMTP_SERVICE;

  console.log("Testing SMTP with configuration:");
  console.log("Host:", host || "default gmail");
  console.log("Port:", port);
  console.log("Secure:", secure);
  console.log("User:", user);

  let transporter;
  if (service) {
    transporter = nodemailer.createTransport({
      service,
      auth: { user, pass },
    });
  } else if (host) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false,
      },
    });
  } else {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  const mailOptions = {
    from: `"جمعية عمارة المساجد (منارة)" <${user}>`,
    to: "yahiatr188@gmail.com",
    subject: "تجربة إرسال بريد إلكتروني من جمعية عمارة المساجد (منارة)",
    text: "مرحباً، هذا بريد تجريبي للتأكد من ربط الحساب بنجاح بباكيند النظام.",
    html: `
      <div style="direction: rtl; font-family: Tahoma, Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px;">تجربة إرسال بريد إلكتروني</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">مرحباً،</p>
        <p style="font-size: 14px; line-height: 1.5; color: #555; background-color: #f9f9f9; padding: 15px; border-radius: 4px; border-right: 4px solid #0d9488;">
          هذا بريد تجريبي تم إرساله من جمعية عمارة المساجد (منارة) للتأكد من صحة إعدادات SMTP وكلمة مرور التطبيق (App Password).
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">نظام إشعارات جمعية عمارة المساجد (منارة).</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

main();
