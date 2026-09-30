import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PurchaseOrdersView } from "./PurchaseOrdersList";
import { CsrLettersView } from "./CsrLettersList";
import { ShoppingCart, HeartHandshake, Receipt } from "lucide-react";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

export default function FinancialOfficerTasks() {
  useDocumentTitle("مهام المسؤول المالي - أوامر الشراء والخطاب المجتمعي");

  // قراءة التبويب النشط من رابط الصفحة (Query Parameter)
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    if (tabParam === "csr_letters" || tabParam === "csr") {
      return "csr_letters";
    }
    return "purchase_orders";
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  // تحديث التبويب في حال تغير الرابط
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("tab", val);
    window.history.replaceState({}, "", newUrl.toString());
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-right font-sans" dir="rtl">
        {/* الهيدر العلوي الموحد لشاشة المسؤول المالي */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/70 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  مهام المسؤول المالي
                </h1>
                <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-primary/30 text-primary bg-primary/5">
                  واجهة موحدة
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                إدارة واستعراض أوامر الشراء والخطابات المجتمعية
              </p>
            </div>
          </div>

          {/* تبويبات التنقل السلس بين أوامر الشراء والخطاب المجتمعي */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full md:w-auto">
            <TabsList className="bg-muted/70 p-1.5 rounded-xl border border-border/80 h-auto grid grid-cols-2 gap-1.5 w-full md:w-auto">
              <TabsTrigger
                value="purchase_orders"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm font-bold text-xs sm:text-sm px-4 py-2 gap-2 rounded-lg transition-all"
              >
                <ShoppingCart className="w-4 h-4 text-sky-600" />
                <span>أوامر الشراء (Purchase Orders)</span>
              </TabsTrigger>
              <TabsTrigger
                value="csr_letters"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm font-bold text-xs sm:text-sm px-4 py-2 gap-2 rounded-lg transition-all"
              >
                <HeartHandshake className="w-4 h-4 text-emerald-600" />
                <span>الخطاب المجتمعي</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* محتوى الشاشة بناءً على التبويب المختار */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsContent value="purchase_orders" className="space-y-6 mt-0 focus-visible:outline-none">
            <PurchaseOrdersView isEmbedded={true} />
          </TabsContent>

          <TabsContent value="csr_letters" className="space-y-6 mt-0 focus-visible:outline-none">
            <CsrLettersView isEmbedded={true} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
