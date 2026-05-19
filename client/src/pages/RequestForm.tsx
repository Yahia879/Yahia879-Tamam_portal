import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Building2, FileText, Send, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function RequestForm() {
  const [, navigate] = useLocation();
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedMosque, setSelectedMosque] = useState<string>("");
  const [priority, setPriority] = useState<string>("normal");
  const [description, setDescription] = useState("");

  const { data: mosquesData } = trpc.mosques.search.useQuery({ limit: 100 });
  const mosques = mosquesData?.mosques || [];

  const { data: programs = [], isLoading: programsLoading } = trpc.programs.getActive.useQuery();

  const createMutation = trpc.requests.create.useMutation({
    onSuccess: (data) => {
      toast.success(`تم تقديم الطلب بنجاح - رقم الطلب: ${data.requestNumber}`);
      navigate("/requests");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMosque || !selectedProgram) {
      toast.error("يرجى اختيار المسجد والبرنامج");
      return;
    }

    createMutation.mutate({
      mosqueId: parseInt(selectedMosque),
      programType: selectedProgram as any,
      priority: priority as any,
      description,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* العنوان */}
        <div className="flex items-center gap-4">
          <Link href="/requests">
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">تقديم طلب جديد</h1>
            <p className="text-muted-foreground">اختر البرنامج المناسب وأكمل البيانات المطلوبة</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* اختيار البرنامج */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                اختيار البرنامج
              </CardTitle>
              <CardDescription>اختر البرنامج المناسب لطلبك</CardDescription>
            </CardHeader>
            <CardContent>
              {programsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {programs.map((program: any) => (
                    <div
                      key={program.id}
                      onClick={() => setSelectedProgram(program.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all overflow-hidden break-words ${
                        selectedProgram === program.id
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${program.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                          <span className="text-white text-lg">📦</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm break-words">{program.name}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 break-words">{program.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* اختيار المسجد */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                اختيار المسجد
              </CardTitle>
              <CardDescription>اختر المسجد المراد تقديم الطلب له</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>المسجد</Label>
                <Select value={selectedMosque} onValueChange={setSelectedMosque}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المسجد" />
                  </SelectTrigger>
                  <SelectContent>
                    {mosques.map((mosque: any) => (
                      <SelectItem key={mosque.id} value={mosque.id.toString()}>
                        {mosque.name} - {mosque.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">المسجد غير موجود في القائمة؟</p>
                <Link href="/mosques/new">
                  <Button type="button" variant="outline">
                    إضافة مسجد جديد
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* تفاصيل الطلب */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>تفاصيل الطلب</CardTitle>
              <CardDescription>أدخل المعلومات الإضافية للطلب</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>الأولوية</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">عادي</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="urgent">عاجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>وصف الطلب</Label>
                <Textarea
                  placeholder="اكتب وصفاً تفصيلياً للطلب..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* زر الإرسال */}
          <div className="flex justify-end gap-4">
            <Link href="/requests">
              <Button type="button" variant="outline">إلغاء</Button>
            </Link>
            <Button 
              type="submit" 
              className="gradient-primary text-white"
              disabled={createMutation.isPending || !selectedMosque || !selectedProgram}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 ml-2" />
                  تقديم الطلب
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
