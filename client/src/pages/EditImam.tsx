import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePermission } from "@/hooks/usePermission";
import { mosqueHasImam } from "@shared/mosquePermissions";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { User, Contact, Mail, Save, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { PermissionGuard } from "@/components/PermissionGuard";

const imamSchema = z.object({
  imamName: z.string().min(3, "الاسم الكامل مطلوب"),
  imamPhone: z.string().min(10, "رقم الجوال مطلوب"),
  imamEmail: z.string().email("بريد إلكتروني غير صالح").optional().or(z.literal('')),
});

type ImamFormValues = z.infer<typeof imamSchema>;

export default function EditImam({ params }: { params: { id: string } }) {
  const mosqueId = parseInt(params.id, 10);
  const [, setLocation] = useLocation();
  const canAddImam = usePermission("mosques.add_imam");
  const canEditMosque = usePermission("mosques.edit");
  const utils = trpc.useUtils();

  const { data: mosque, isLoading: isMosqueLoading } = trpc.mosques.getById.useQuery({ id: mosqueId });
  const hasImam = mosque ? mosqueHasImam(mosque) : false;
  const canSave = hasImam ? canEditMosque : canAddImam;

  const form = useForm<ImamFormValues>({
    resolver: zodResolver(imamSchema),
    defaultValues: {
      imamName: "",
      imamPhone: "",
      imamEmail: "",
    },
  });

  useEffect(() => {
    if (mosque) {
      form.reset({
        imamName: mosque.imamName || "",
        imamPhone: mosque.imamPhone || "",
        imamEmail: mosque.imamEmail || "",
      });
    }
  }, [mosque, form]);

  const updateImamMutation = trpc.mosques.updateImam.useMutation({
    onSuccess: () => {
      toast.success(hasImam ? "تم تحديث بيانات الإمام بنجاح" : "تم تسجيل بيانات الإمام بنجاح");
      utils.mosques.getById.invalidate({ id: mosqueId });
      setLocation(`/mosques/${mosqueId}`);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث البيانات");
    },
  });

  const onSubmit = (values: ImamFormValues) => {
    if (!canSave) return;
    updateImamMutation.mutate({
      id: mosqueId,
      ...values,
    });
  };

  if (isMosqueLoading) {
    return (
      <DashboardLayout>
        <div className="text-center p-8">جاري تحميل بيانات المسجد...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PermissionGuard permission={hasImam ? "mosques.edit" : "mosques.add_imam"}>
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => setLocation(`/mosques/${mosqueId}`)} className="mb-4">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة إلى تفاصيل المسجد
          </Button>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <User className="w-6 h-6 text-primary" />
                {hasImam ? "تحديث بيانات الإمام" : "تسجيل بيانات الإمام"}
              </CardTitle>
              <CardDescription>
                أدخل بيانات الإمام الخاصة بمسجد: {mosque?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="imamName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الاسم الكامل</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="اسم الإمام الثلاثي" {...field} className="pr-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="imamPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الجوال</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Contact className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="05xxxxxxxx" {...field} className="pr-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="imamEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>البريد الإلكتروني (اختياري)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="example@domain.com" {...field} className="pr-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-4 flex justify-end">
                    <Button type="submit" className="gradient-primary text-white" disabled={!canSave || updateImamMutation.isPending}>
                      <Save className="w-4 h-4 ml-2" />
                      {updateImamMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </PermissionGuard>
    </DashboardLayout>
  );
}
