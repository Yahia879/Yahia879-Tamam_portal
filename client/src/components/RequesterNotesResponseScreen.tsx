import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Upload, LogOut, CheckCircle2, Loader2, FileText, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function RequesterNotesResponseScreen() {
  const { user, logout } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitResponse = trpc.users.submitNotesResponse.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال المرفق وتحديث طلب التسجيل بنجاح.");
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

      await submitResponse.mutateAsync({
        remarksDocument: fileUrl,
      });
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء رفع الملف. يرجى المحاولة مرة أخرى.");
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const isSuspended = user.status === "suspended";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-tr from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-right" dir="rtl">
      <Card className="w-full max-w-lg border border-slate-200/80 dark:border-slate-800/80 shadow-2xl rounded-3xl overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-all">
        {/* رأس البطاقة */}
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-850 px-6 py-5 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">تحديث طلب التسجيل</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">يرجى مراجعة الملاحظات وإرفاق المستند المطلـوب</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={logout}
            className="text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
            title="تسجيل الخروج"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </CardHeader>

        {/* محتوى البطاقة */}
        <CardContent className="p-6 space-y-6">
          {/* صندوق عرض الملاحظات أو سبب الرفض */}
          {isSuspended ? (
            <div className="p-4 rounded-2xl border border-red-200/80 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/30 text-red-900 dark:text-red-300 space-y-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span className="font-bold text-sm">سبب رفض الحساب</span>
              </div>
              <p className="text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-300 pr-7">
                {user.adminNotes}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 dark:border-primary/30 text-primary space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <AlertCircle className="h-5 w-5 shrink-0 animate-pulse" />
                <span className="font-bold text-sm">ملاحظات الإدارة</span>
              </div>
              <p className="text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-300 pr-7">
                {user.adminNotes}
              </p>
            </div>
          )}

          {/* نموذج رفع المرفق */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">
                رفع مرفق يثبت الصفة الجديد <span className="text-red-500">*</span>
              </label>
              
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 bg-slate-50/30 dark:bg-slate-900/10 hover:bg-slate-50/70 dark:hover:bg-slate-900/20 group">
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
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-750 group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                    {file ? (
                      <div className="text-green-600 dark:text-green-450 font-bold flex items-center justify-center gap-2 bg-green-50/80 dark:bg-green-950/20 px-3 py-1.5 rounded-xl border border-green-150">
                        <Check className="w-4.5 h-4.5" />
                        <span className="truncate max-w-[240px] text-xs sm:text-sm">{file.name}</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">اضغط لاختيار ملف أو اسحبه هنا</p>
                        <p className="text-xs text-slate-400">PDF، صور، أو مستندات (الحد الأقصى 10 ميجابايت)</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting || !file}
                className="w-full bg-primary hover:bg-primary/95 text-white font-bold h-11 sm:h-12 rounded-2xl transition-all shadow-md shadow-primary/10 dark:shadow-none text-sm sm:text-base gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    جاري الرفع والإرسال...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4.5 h-4.5" />
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
