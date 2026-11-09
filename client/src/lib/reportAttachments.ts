export type ReportAttachment = {
  name: string;
  base64: string;
  uploadedUrl?: string;
};

export type ReportUploadProgress = {
  completed: number;
  total: number;
  currentFile: string | null;
};

async function uploadAttachment(file: ReportAttachment): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const [header, encoded] = file.base64.split(",");
    const mime = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
    const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
    const formData = new FormData();
    formData.append("file", new File([bytes], file.name, { type: mime }));

    const response = await fetch("/api/upload?folder=progress-reports", {
      method: "POST",
      body: formData,
      credentials: "include",
      signal: controller.signal,
    });
    // A proxy may return HTML, or a successful response may be missing the file URL.
    const data = await response.json().catch(() => null);
    if (!response.ok || typeof data?.url !== "string" || !data.url.trim()) {
      throw new Error(`Invalid upload response (HTTP ${response.status})`);
    }
    const url = data.url.trim();
    if (!url.startsWith("/uploads/") && !/^https?:\/\//i.test(url)) {
      throw new Error("Invalid attachment URL");
    }
    return url;
  } catch (cause) {
    const reason = controller.signal.aborted
      ? "انتهت مهلة رفع الملف"
      : "تعذر رفع الملف";
    throw new Error(`${reason} «${file.name}». تحقق من الاتصال ثم أعد المحاولة.`, { cause });
  } finally {
    clearTimeout(timeout);
  }
}

export async function uploadReportAttachments<T extends ReportAttachment>(
  files: readonly T[],
  onProgress: (progress: ReportUploadProgress) => void,
  onUploaded: (file: T, url: string) => void,
): Promise<string[]> {
  const urls: string[] = [];
  const total = files.length;
  onProgress({ completed: 0, total, currentFile: null });
  for (const file of files) {
    let url = file.uploadedUrl || (!file.base64.startsWith("data:") ? file.base64 : null);
    if (!url) {
      onProgress({ completed: urls.length, total, currentFile: file.name });
      url = await uploadAttachment(file);
      onUploaded(file, url);
    }
    urls.push(url);
    onProgress({ completed: urls.length, total, currentFile: null });
  }
  return urls;
}
