import DashboardLayout from "@/components/DashboardLayout";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { DynamicServiceRequestForm } from "./DynamicServiceRequestForm";

export default function MosqueServiceRequest() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex items-center gap-4 max-w-4xl mx-auto px-4">
          <Link href="/requests">
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">طلبات خدمات المساجد</h1>
            <p className="text-muted-foreground">قدم طلبك للاستفادة من خدمات جمعية عمارة المساجد</p>
          </div>
        </div>

        {/* النموذج الديناميكي الموحد */}
        <DynamicServiceRequestForm showLayout={false} />
      </div>
    </DashboardLayout>
  );
}
