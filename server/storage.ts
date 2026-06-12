import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// المسار المحلي للمرفقات (كاحتياطي)
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// التأكد من وجود المجلد
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ذاكرة تخزين مؤقت للـ Token
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * التحقق من وجود إعدادات OneDrive
 */
export function isOneDriveConfigured(): boolean {
  return !!(
    process.env.ONEDRIVE_TENANT_ID &&
    process.env.ONEDRIVE_CLIENT_ID &&
    process.env.ONEDRIVE_CLIENT_SECRET &&
    process.env.ONEDRIVE_USER_PRINCIPAL_NAME
  );
}

/**
 * الحصول على رمز الوصول (Access Token) لـ Microsoft Graph API
 */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const tenantId = process.env.ONEDRIVE_TENANT_ID;
  const clientId = process.env.ONEDRIVE_CLIENT_ID;
  const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("OneDrive configuration is missing in environment variables.");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("scope", "https://graph.microsoft.com/.default");
  params.append("client_secret", clientSecret);
  params.append("grant_type", "client_credentials");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to obtain access token: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

/**
 * حفظ ملف (OneDrive أو محلياً)
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");

  if (isOneDriveConfigured()) {
    try {
      const token = await getAccessToken();
      const upn = process.env.ONEDRIVE_USER_PRINCIPAL_NAME;

      // التأكد من تحويل البيانات لـ Buffer
      let fileBuffer: Buffer;
      if (data instanceof Buffer) {
        fileBuffer = data;
      } else if (data instanceof Uint8Array) {
        fileBuffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      } else {
        fileBuffer = Buffer.from(data, 'utf-8');
      }

      // استخدام createUploadSession لضمان رفع كافة الأحجام بطريقة موثوقة
      const sessionUrl = `https://graph.microsoft.com/v1.0/users/${upn}/drive/root:/${key}:/createUploadSession`;
      const sessionResponse = await fetch(sessionUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item: {
            "@microsoft.graph.conflictBehavior": "replace",
          },
        }),
      });

      if (!sessionResponse.ok) {
        const errText = await sessionResponse.text();
        throw new Error(`Failed to create OneDrive upload session: ${sessionResponse.statusText} - ${errText}`);
      }

      const sessionData = await sessionResponse.json() as { uploadUrl: string };
      const uploadUrl = sessionData.uploadUrl;

      // رفع محتوى الملف
      const size = fileBuffer.length;
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Length": size.toString(),
          "Content-Range": `bytes 0-${size - 1}/${size}`,
        },
        body: fileBuffer as any,
      });

      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text();
        throw new Error(`Failed to upload file to OneDrive session: ${uploadResponse.statusText} - ${errText}`);
      }

      console.log(`Successfully uploaded file "${key}" to OneDrive.`);
      const url = `/uploads/${key}`;
      return { key, url };
    } catch (error) {
      console.error("OneDrive upload failed, falling back to local storage:", error);
    }
  }

  // الاحتياطي: التخزين المحلي
  const filePath = path.join(UPLOADS_DIR, key);
  const dirPath = path.dirname(filePath);

  if (!fs.existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }

  await writeFile(filePath, data);
  const url = `/uploads/${key}`;
  return { key, url };
}

/**
 * الحصول على رابط الملف
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const key = relKey.replace(/^\/+/, "");
  return {
    key,
    url: `/uploads/${key}`,
  };
}

/**
 * حذف ملف
 */
export async function storageDelete(relKey: string): Promise<void> {
  const key = relKey.replace(/^\/+/, "");

  if (isOneDriveConfigured()) {
    try {
      const token = await getAccessToken();
      const upn = process.env.ONEDRIVE_USER_PRINCIPAL_NAME;
      const deleteUrl = `https://graph.microsoft.com/v1.0/users/${upn}/drive/root:/${key}`;
      
      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        const errText = await response.text();
        console.warn(`Failed to delete file from OneDrive: ${response.statusText} - ${errText}`);
      } else {
        console.log(`Successfully deleted file "${key}" from OneDrive.`);
      }
    } catch (error) {
      console.error("Error deleting file from OneDrive:", error);
    }
  }

  // حذف محلي في حال وجود الملف
  const filePath = path.join(UPLOADS_DIR, key);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
