import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Upload, LogOut, CheckCircle2, Loader2, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function RequesterNotesResponseScreen() {
  const { user, logout } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitResponse = trpc.users.submitNotesResponse.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال المرفق وتحديث طلب التسجيل بنجاح.");
      // Reload the window or trigger auth reload so the app updates the user status
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء إرسال المرفق.");
      setIsSubmitting(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً. الحد الأقصى هو 10 ميجابايت.");
      e.target.value = "";
      return;
    }
    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("يرجى اختيار ملف المرفق أولاً");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload file
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("فشل رفع الملف");
      }

      const uploadData = await response.json();
      const fileUrl = uploadData.url;

      // 2. Submit notes response (status -> pending, adminNotes -> null, proofDocument -> fileUrl)
      await submitResponse.mutateAsync({
        proofDocument: fileUrl,
      });
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء رفع الملف. يرجى المحاولة مرة أخرى.");
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-955 font-sans text-right" dir="rtl">
      <Card className="w-full max-w-lg border border-slate-200/80 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden bg-white dark:bg-slate-900 transition-all">
        {/* رأس البطاقة */}
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 px-6 py-5 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-foreground">تحديث طلب التسجيل</CardTitle>
            <CardDescription className="text-xs">يرجى مراجعة ملاحظات الإدارة وإرفاق المستند المطلوب</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={logout}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl"
            title="تسجيل الخروج"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </CardHeader>

        {/* محتوى البطاقة */}
        <CardContent className="p-6 space-y-6">
          {/* صندوق عرض الملاحظات */}
          <Alert variant="destructive" className="border-amber-200/70 bg-amber-50/50 dark:bg-amber-950/15 dark:border-amber-900/30 text-amber-900 dark:text-amber-300 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            <AlertTitle className="font-bold text-sm text-amber-800 dark:text-amber-400">ملاحظات الإدارة / سبب الرفض</AlertTitle>
            <AlertDescription className="text-sm font-semibold mt-1.5 leading-relaxed">
              {user.adminNotes}
            </AlertDescription>
          </Alert>

          {/* نموذج رفع المرفق */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">
                رفع مرفق يثبت الصفة الجديد <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors bg-slate-50/30 dark:bg-slate-900/10">
                <input
                  id="responseProofFile"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
                <label htmlFor="responseProofFile" className="cursor-pointer block">
                  <div className="text-slate-500 flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner">
                      <Upload className="w-6 h-6 text-slate-400" />
                    </div>
                    {file ? (
                      <div className="text-green-600 font-bold flex items-center justify-center gap-2">
                        <Check className="w-5 h-5" />
                        <span className="truncate max-w-[240px] text-sm">{file.name}</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">اضغط لاختيار ملف أو اسحبه هنا</p>
                        <p className="text-xs text-slate-400">PDF، صور، أو مستندات (الحد الأقصى 10 ميجابايت)</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting || !file}
                className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold h-11 rounded-xl transition-all shadow-md shadow-teal-100 dark:shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    جاري الرفع والإرسال...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4.5 h-4.5 ml-2" />
                    إرسال المرفق وتحديث الطلب
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
