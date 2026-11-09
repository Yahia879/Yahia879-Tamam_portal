import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadReportAttachments, type ReportAttachment } from "../client/src/lib/reportAttachments";

const attachment = (name: string): ReportAttachment => ({ name, base64: "data:image/webp;base64,aW1hZ2U=" });
const success = (name: string) => Response.json({ url: `/uploads/progress-reports/${name}` });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("progress report attachment uploads", () => {
  it("waits for every upload before allowing the report to be saved", async () => {
    const responses: ((response: Response) => void)[] = [];
    const fetchMock = vi.fn(() => new Promise<Response>(resolve => responses.push(resolve)));
    vi.stubGlobal("fetch", fetchMock);
    const progress = vi.fn();
    const saveReport = vi.fn();
    const pending = uploadReportAttachments([attachment("one.webp"), attachment("two.webp")], progress, vi.fn()).then(saveReport);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(saveReport).not.toHaveBeenCalled();
    responses[0](success("one.webp"));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(saveReport).not.toHaveBeenCalled();
    expect(progress).toHaveBeenCalledWith({ completed: 1, total: 2, currentFile: "two.webp" });
    const [endpoint, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe("/api/upload?folder=progress-reports");
    expect(options.credentials).toBe("include");
    expect((options.body as FormData).get("file")).toMatchObject({ name: "one.webp", type: "image/webp", size: 5 });

    responses[1](success("two.webp"));
    await pending;
    expect(saveReport).toHaveBeenCalledWith(["/uploads/progress-reports/one.webp", "/uploads/progress-reports/two.webp"]);
    expect(progress).toHaveBeenLastCalledWith({ completed: 2, total: 2, currentFile: null });
  });

  it("stops on failure and retries only remaining files while preserving attachment order", async () => {
    let files = [attachment("one.webp"), attachment("two.webp"), attachment("three.webp")];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(success("one.webp"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(success("two.webp"))
      .mockResolvedValueOnce(success("three.webp"));
    vi.stubGlobal("fetch", fetchMock);
    const rememberUpload = (file: ReportAttachment, url: string) => {
      files = files.map(item => item === file ? { ...item, uploadedUrl: url } : item);
    };
    const saveReport = vi.fn();
    await expect(uploadReportAttachments(files, vi.fn(), rememberUpload).then(saveReport)).rejects.toThrow("two.webp");
    expect(saveReport).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(files[0].uploadedUrl).toBe("/uploads/progress-reports/one.webp");
    expect(files[0].base64).toContain("data:image/webp");

    const urls = await uploadReportAttachments(files, vi.fn(), rememberUpload);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(urls).toEqual(["/uploads/progress-reports/one.webp", "/uploads/progress-reports/two.webp", "/uploads/progress-reports/three.webp"]);
    // A failed report save can be retried without uploading any attachments again.
    expect(await uploadReportAttachments(files, vi.fn(), rememberUpload)).toEqual(urls);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it.each([
    ["HTML response", () => new Response("<html>Proxy error</html>", { status: 502 })],
    ["HTML with success status", () => new Response("<html>Login</html>", { status: 200 })],
    ["missing URL", () => Response.json({})],
    ["invalid URL", () => Response.json({ url: "javascript:alert(1)" })],
    ["blank URL", () => Response.json({ url: "  " })],
    ["error status with a URL", () => Response.json({ url: "/uploads/error.webp" }, { status: 500 })],
  ])("blocks saving after %s and shows a readable error with the filename", async (_label, response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response()));
    const saveReport = vi.fn();
    const rememberUpload = vi.fn();
    await expect(uploadReportAttachments([attachment("صورة.webp")], vi.fn(), rememberUpload).then(saveReport))
      .rejects.toThrow("تعذر رفع الملف «صورة.webp». تحقق من الاتصال ثم أعد المحاولة.");
    expect(saveReport).not.toHaveBeenCalled();
    expect(rememberUpload).not.toHaveBeenCalled();
  });

  it("ends a stalled upload with a retryable timeout error", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    })));
    const pending = expect(uploadReportAttachments([attachment("slow.webp")], vi.fn(), vi.fn()))
      .rejects.toThrow("انتهت مهلة رفع الملف «slow.webp»");
    await vi.advanceTimersByTimeAsync(120_000);
    await pending;
  });

  it("keeps existing attachment URLs and permits a report without attachments", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const urls = ["/uploads/progress-reports/existing.webp", "https://example.com/existing.pdf"];
    expect(await uploadReportAttachments(urls.map(base64 => ({ name: "existing", base64 })), vi.fn(), vi.fn())).toEqual(urls);
    expect(await uploadReportAttachments([], vi.fn(), vi.fn())).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
