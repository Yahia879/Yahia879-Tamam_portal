import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import BeneficiaryLayout from "@/components/BeneficiaryLayout";
import MawasimRequestForm, { type MawasimMosque } from "@/components/MawasimRequestForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  evaluateMawasimExceptionState,
  seasonalStatusLabels,
} from "@shared/mawasim";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  MoonStar,
  Users,
} from "lucide-react";

export default function MawasimPortal() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [seasonId, setSeasonId] = useState<number>();
  const [mosqueId, setMosqueId] = useState<number>();
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [exceptionFile, setExceptionFile] = useState<File | null>(null);
  const [isSubmittingException, setIsSubmittingException] = useState(false);

  const portal = trpc.mawasim.portal.useQuery(seasonId ? { seasonId } : undefined);
  const data = portal.data;
  const season = data?.season;
  const openSeasons = useMemo(
    () => (data?.seasons ?? []).filter(item => item.isOpen),
    [data?.seasons],
  );

  const submitExceptionMutation = trpc.mawasim.submitException.useMutation();

  useEffect(() => {
    if (!data) return;
    if (seasonId && data.seasons.some(item => item.id === seasonId)) return;
    if (openSeasons.length > 0 && data.season?.id !== openSeasons[0].id) {
      setSeasonId(openSeasons[0].id);
    }
  }, [data, openSeasons, seasonId]);

  const exceptionState = useMemo(
    () => evaluateMawasimExceptionState(data?.activeRequest, data?.latestException),
    [data?.activeRequest, data?.latestException],
  );
  const hasApprovedException = exceptionState.exceptionForCycle?.status === "approved";

  const eligible = (data?.eligible ?? []) as MawasimMosque[];
  const availableMosques = useMemo(() => {
    if (exceptionState.isBlocked) return [];
    if (hasApprovedException) return eligible;
    return eligible.filter(item => !data?.requests.some(req => req.mosqueId === item.id));
  }, [eligible, data?.requests, exceptionState.isBlocked, hasApprovedException]);
  const selectedMosque = useMemo(
    () => availableMosques.find(item => item.id === mosqueId) ?? availableMosques[0],
    [availableMosques, mosqueId],
  );
  const hasCapacity = Boolean(
    season && data?.capacity.some(row => row.available > 0 && season.settings.services[row.service]?.enabled),
  );

  const handleMawasimExceptionSubmit = async () => {
    if (!exceptionReason.trim() || exceptionReason.trim().length < 5) {
      toast.error("يرجى كتابة سبب طلب الاستثناء (5 أحرف على الأقل)");
      return;
    }

    setIsSubmittingException(true);
    try {
      let fileUrl: string | null = null;
      if (exceptionFile) {
        const formDataForUpload = new FormData();
        formDataForUpload.append("file", exceptionFile);
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formDataForUpload,
        });
        if (!response.ok) {
          throw new Error("فشل رفع الملف المرفق");
        }
        const uploaded = await response.json();
        fileUrl = uploaded.url;
      }

      await submitExceptionMutation.mutateAsync({
        reason: exceptionReason.trim(),
        attachment: fileUrl,
      });

      toast.success("تم تقديم طلب الاستثناء في برنامج مواسم بنجاح وهو قيد المراجعة حالياً");
      setIsExceptionModalOpen(false);
      setExceptionReason("");
      setExceptionFile(null);
      await utils.mawasim.portal.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء إرسال طلب الاستثناء");
    } finally {
      setIsSubmittingException(false);
    }
  };

  return (
    <BeneficiaryLayout
      activeTab="mawasim"
      title="برنامج مواسم"
      subtitle="تقديم ومتابعة طلبات برنامج مواسم للخدمات الرمضانية"
      backUrl="/requester"
      backLabel="العودة للوحة التحكم"
    >
      <div dir="rtl" className="mx-auto max-w-5xl space-y-6">
        {portal.isLoading && (
          <Card className="border-border/60 shadow-xs">
            <CardContent className="flex items-center justify-center gap-3 py-12 text-muted-foreground" role="status">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-sm font-medium">جارٍ تحميل بيانات برنامج مواسم…</span>
            </CardContent>
          </Card>
        )}

        {portal.error && (
          <Card className="border-destructive/40 bg-destructive/5" role="alert">
            <CardContent className="flex items-center gap-3 p-4 text-sm text-destructive">
              <AlertCircle className="size-5 shrink-0" />
              <span>{portal.error.message}</span>
            </CardContent>
          </Card>
        )}

        {data && !season && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <CalendarDays className="size-6" />
              </div>
              <h2 className="text-base font-bold text-foreground">لا يوجد موسم متاح للتسجيل حالياً</h2>
              <p className="mt-1 max-w-md text-xs text-muted-foreground sm:text-sm">
                سيظهر نموذج التقديم فور إتاحة موسم جديد للتسجيل من قِبل الإدارة.
              </p>
            </CardContent>
          </Card>
        )}

        {data && season && (
          <>
            {/* Season & Auto-Bound Mosque Summary */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="border-b border-border/50 bg-muted/20 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                      <MoonStar className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">بيانات الموسم والمسجد</CardTitle>
                      <CardDescription className="text-xs">
                        {season.isOpen
                          ? hasCapacity
                            ? "التسجيل متاح حالياً للخدمات المفعّلة في هذا الموسم"
                            : "استُنفدت السعة المتاحة لهذا الموسم"
                          : "التسجيل مغلق لهذا الموسم حالياً"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      season.isOpen
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                    }
                  >
                    {season.isOpen ? "متاح للتسجيل" : "التسجيل مغلق"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                {/* Season Picker */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">الموسم</label>
                  {data.seasons.length > 1 ? (
                    <Select
                      value={String(season.id)}
                      onValueChange={val => {
                        setSeasonId(Number(val));
                        setMosqueId(undefined);
                      }}
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl bg-background font-semibold">
                        <SelectValue placeholder="اختر الموسم" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.seasons.map(item => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.title} ({item.hijriYear} هـ) {item.isOpen ? "· متاح" : "· مغلق"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex h-10 items-center rounded-xl border border-border/60 bg-muted/30 px-3 text-sm font-semibold text-foreground">
                      {season.title} ({season.hijriYear} هـ)
                    </div>
                  )}
                </div>

                {/* Auto-bound Mosque Field */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">المسجد المرتبط بالحساب</label>
                  {availableMosques.length > 1 ? (
                    <Select
                      value={String(selectedMosque?.id ?? "")}
                      onValueChange={val => setMosqueId(Number(val))}
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl bg-background font-semibold">
                        <SelectValue placeholder="اختر المسجد" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMosques.map(item => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name} · {item.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : selectedMosque ? (
                    <div className="flex h-10 items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 text-sm font-semibold text-foreground">
                      <Building2 className="size-4 shrink-0 text-primary" />
                      <span className="truncate">{selectedMosque.name} · {selectedMosque.city}</span>
                    </div>
                  ) : (
                    <div className="flex h-10 items-center rounded-xl border border-border/60 bg-muted/30 px-3 text-xs text-muted-foreground">
                      {eligible.length > 0 ? "تم تقديم طلب مسبقاً لهذا المسجد في هذا الموسم" : "لا يوجد مسجد معتمد مرتبط"}
                    </div>
                  )}
                </div>

                {selectedMosque && (
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                      <Building2 className="size-4 text-primary" />
                      {selectedMosque.name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <MapPin className="size-3.5 text-primary/80" />
                      {selectedMosque.city}
                      {selectedMosque.district ? ` · ${selectedMosque.district}` : ""}
                    </span>
                    {selectedMosque.capacity ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="size-3.5 text-primary/80" />
                        السعة: {selectedMosque.capacity.toLocaleString("ar-SA")} مصلٍ
                      </span>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Eligibility / Already Submitted Messages */}
            {season.isOpen && hasCapacity && eligible.length === 0 && (
              <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-1 text-sm">
                      <p className="font-bold text-foreground">حسابك غير مرتبط بمسجد معتمد للتقديم</p>
                      <p className="text-xs text-muted-foreground">
                        يرجى إضافة مسجد واعتماده أولاً لتتمكن من إرسال الطلب فيه، حيث يتاح التقديم للإمام أو المؤذن النشط المرتبط بمسجد معتمد في المنصة، أو عند وجود استثناء مفعّل من الجمعية.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link href="/requester/mosques/new">
                      <Button size="sm" className="rounded-xl font-bold cursor-pointer">
                        إضافة مسجد
                      </Button>
                    </Link>
                    <Link href="/my-mosques">
                      <Button variant="outline" size="sm" className="rounded-xl font-bold cursor-pointer">
                        عرض مساجدي
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {season.isOpen && hasCapacity && exceptionState.isBlocked && exceptionState.activeRequest && (
              <div className="space-y-4">
                <Alert variant="destructive" className="border-destructive/50 bg-destructive/5 rounded-2xl p-5">
                  <AlertCircle className="h-5 w-5" />
                  <AlertTitle className="text-base sm:text-lg font-bold">
                    لا يمكن تقديم طلب مواسم جديد حالياً
                  </AlertTitle>
                  <AlertDescription className="text-xs sm:text-sm leading-relaxed mt-1.5 space-y-3">
                    <p>
                      عذراً، لا يمكنك تقديم طلب جديد في برنامج مواسم لوجود طلب مواسم سابق فعال قيد المعالجة ولم يكتمل بعد. يمكنك رفع طلب استثناء خاص ببرنامج مواسم.
                    </p>
                    <div className="p-4 rounded-xl border border-red-200/40 bg-red-500/5 text-right space-y-1.5 max-w-md">
                      <div>
                        <span className="font-bold text-red-700 dark:text-red-400">رقم طلب مواسم السابق: </span>
                        <span className="font-mono font-semibold text-foreground">#{exceptionState.activeRequest.id}</span>
                      </div>
                      {exceptionState.activeRequest.mosqueName && (
                        <div>
                          <span className="font-bold text-red-700 dark:text-red-400">المسجد: </span>
                          <span className="font-semibold text-foreground">{exceptionState.activeRequest.mosqueName}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-red-700 dark:text-red-400">تاريخ التقديم: </span>
                        <span className="font-semibold text-foreground font-mono">
                          {new Date(exceptionState.activeRequest.createdAt).toLocaleDateString("ar-SA")}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-red-700 dark:text-red-400">حالة الطلب: </span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {seasonalStatusLabels[exceptionState.activeRequest.status as keyof typeof seasonalStatusLabels] ?? exceptionState.activeRequest.status}
                        </span>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
                  <Link href="/my-requests" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto min-h-11 px-5 rounded-xl font-bold bg-primary hover:bg-primary/95 text-white cursor-pointer">
                      متابعة طلباتي السابقة
                    </Button>
                  </Link>

                  {exceptionState.exceptionForCycle?.status === "pending" ? (
                    <Button disabled variant="outline" className="w-full sm:w-auto min-h-11 px-5 rounded-xl font-bold bg-slate-100 text-slate-500">
                      طلب الاستثناء قيد المراجعة حالياً
                    </Button>
                  ) : exceptionState.exceptionForCycle?.status === "rejected" ? (
                    <Button disabled variant="outline" className="w-full sm:w-auto min-h-11 px-5 rounded-xl font-bold bg-red-50 text-red-600 border border-red-200/50">
                      تم رفض طلب الاستثناء السابق
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setIsExceptionModalOpen(true)}
                      className="w-full sm:w-auto min-h-11 px-5 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                    >
                      طلب استثناء (برنامج مواسم)
                    </Button>
                  )}

                  <Link href="/requester" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto min-h-11 px-5 rounded-xl font-bold cursor-pointer">
                      العودة للوحة التحكم
                    </Button>
                  </Link>
                </div>

                <Dialog open={isExceptionModalOpen} onOpenChange={setIsExceptionModalOpen}>
                  <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto text-right" dir="rtl">
                    <DialogHeader className="text-right sm:text-right ps-8">
                      <DialogTitle className="text-base sm:text-lg font-bold text-right">
                        تقديم طلب استثناء في برنامج مواسم
                      </DialogTitle>
                      <DialogDescription className="text-xs sm:text-sm text-right">
                        يُستخدم هذا الاستثناء لتقديم طلب جديد في برنامج مواسم فقط مع وجود طلب مواسم سابق فعال.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3 text-right">
                      <div className="space-y-2">
                        <Label htmlFor="mawasimExceptionReason" className="text-sm font-bold text-foreground">
                          سبب طلب الاستثناء / مبررات التقديم <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="mawasimExceptionReason"
                          value={exceptionReason}
                          onChange={e => setExceptionReason(e.target.value)}
                          placeholder="يرجى كتابة سبب طلب الاستثناء لبرنامج مواسم بالتفصيل هنا..."
                          className="min-h-[120px] rounded-xl text-xs sm:text-sm leading-relaxed"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mawasimExceptionAttachment" className="text-sm font-bold text-foreground">
                          مرفق إثبات (اختياري)
                        </Label>
                        <Input
                          type="file"
                          id="mawasimExceptionAttachment"
                          accept="image/*,.heic,.heif,.pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={e => {
                            if (e.target.files && e.target.files.length > 0) {
                              setExceptionFile(e.target.files[0]);
                            }
                          }}
                          className="h-11 text-xs sm:text-sm rounded-xl cursor-pointer"
                        />
                        {exceptionFile && (
                          <p className="text-xs text-muted-foreground mt-1 break-all">
                            الملف المختار: {exceptionFile.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <DialogFooter className="flex-row flex-wrap items-center justify-start sm:justify-start gap-2 pt-4 border-t border-border">
                      <Button
                        type="button"
                        onClick={() => void handleMawasimExceptionSubmit()}
                        disabled={isSubmittingException || submitExceptionMutation.isPending}
                        className="min-h-11 px-6 rounded-xl font-bold bg-primary hover:bg-primary/95 text-white cursor-pointer"
                      >
                        {isSubmittingException || submitExceptionMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "تقديم طلب الاستثناء"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsExceptionModalOpen(false);
                          setExceptionReason("");
                          setExceptionFile(null);
                        }}
                        className="min-h-11 px-5 rounded-xl font-bold cursor-pointer"
                      >
                        إلغاء
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {season.isOpen && hasCapacity && !exceptionState.isBlocked && eligible.length > 0 && !selectedMosque && data.requests.length > 0 && (
              <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="space-y-1 text-sm">
                      <p className="font-bold text-foreground">تم استلام طلبك لهذا الموسم</p>
                      <p className="text-xs text-muted-foreground">
                        تم تسجيل طلب مسجدك في هذا الموسم بنجاح ويمكنك متابعة حالته من قائمة الطلبات أدناه.
                      </p>
                    </div>
                  </div>
                  <Link href="/my-requests?seasonal=submitted">
                    <Button variant="outline" size="sm" className="rounded-xl font-bold cursor-pointer">
                      الذهاب إلى طلباتي
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Approved Mawasim Exception Notice */}
            {season.isOpen && hasCapacity && !exceptionState.isBlocked && hasApprovedException && selectedMosque && (
              <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <CardContent className="flex items-center gap-3 p-4 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <p className="font-semibold">
                    تم قبول طلب الاستثناء الخاص بك في برنامج مواسم، ويمكنك الآن تقديم طلب مواسم جديد.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Seasonal Request Form */}
            {season.isOpen && hasCapacity && !exceptionState.isBlocked && selectedMosque && (
              <MawasimRequestForm
                key={`${season.id}-${selectedMosque.id}`}
                season={season}
                mosque={selectedMosque}
                capacity={data.capacity}
                onSubmitted={() => {
                  void utils.mawasim.portal.invalidate();
                  navigate("/my-requests?seasonal=submitted");
                }}
              />
            )}
          </>
        )}
      </div>
    </BeneficiaryLayout>
  );
}
