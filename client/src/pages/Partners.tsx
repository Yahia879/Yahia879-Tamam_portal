import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Handshake, Plus, Search, MoreVertical, Eye, Edit, Trash2, Globe, Phone, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";

// بيانات تجريبية للشركاء
const partnersData = [
  { id: 1, name: "شركة الخير للمقاولات", type: "مقاول", logo: null, phone: "0500000001", email: "info@alkhair.sa", website: "https://alkhair.sa" },
  { id: 2, name: "مؤسسة البناء المتقدم", type: "مورد", logo: null, phone: "0500000002", email: "info@binaa.sa", website: "https://binaa.sa" },
  { id: 3, name: "شركة التجهيزات الإسلامية", type: "مورد", logo: null, phone: "0500000003", email: "info@islamic.sa", website: "https://islamic.sa" },
];

export default function Partners() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredPartners = partnersData.filter(p => 
    p.name.includes(search) || p.type.includes(search)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الشركاء والداعمون</h1>
            <p className="text-muted-foreground">إدارة الشركاء والموردين والمقاولين</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white">
                <Plus className="w-4 h-4 ml-2" />
                إضافة شريك
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>إضافة شريك جديد</DialogTitle>
                <DialogDescription>أدخل بيانات الشريك أو الداعم</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>اسم الشريك</Label>
                  <Input placeholder="اسم الشركة أو المؤسسة" />
                </div>
                <div className="space-y-2">
                  <Label>نوع الشريك</Label>
                  <Input placeholder="مقاول، مورد، داعم..." />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input placeholder="05xxxxxxxx" />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" placeholder="email@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>الموقع الإلكتروني</Label>
                  <Input placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>الشعار</Label>
                  <Input type="file" accept="image/*" />
                </div>
                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <Textarea placeholder="ملاحظات إضافية..." />
                </div>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => { toast.success("تم إضافة الشريك"); setIsDialogOpen(false); }}>
                  حفظ
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* البحث */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن شريك..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* قائمة الشركاء */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartners.map((partner) => (
            <Card key={partner.id} className="border-0 shadow-sm card-hover">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Handshake className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{partner.name}</h3>
                      <p className="text-sm text-muted-foreground">{partner.type}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="cursor-pointer">
                        <Eye className="w-4 h-4 ml-2" />
                        عرض التفاصيل
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <Edit className="w-4 h-4 ml-2" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer text-destructive">
                        <Trash2 className="w-4 h-4 ml-2" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{partner.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{partner.email}</span>
                  </div>
                  {partner.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        الموقع الإلكتروني
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPartners.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <Handshake className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا يوجد شركاء مسجلون</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
