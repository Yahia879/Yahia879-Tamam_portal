import { useState } from "react";
import { Layers } from "lucide-react";
import { toast } from "sonner";
import { boqAllocationsSchema, boqQuantityUnits } from "@shared/boqPayments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export function BoqOrderSettlement({ orderId }: { orderId: number }) {
  const utils = trpc.useUtils();
  const [edits, setEdits] = useState<Record<number, string>>({});
  const { data } = trpc.disbursements.getOrderBoqSettlement.useQuery({ id: orderId });
  const save = trpc.disbursements.saveOrderBoqSettlement.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.disbursements.getOrderBoqSettlement.invalidate({ id: orderId }),
        utils.projects.getBOQ.invalidate(),
        utils.contracts.getById.invalidate(),
      ]);
      setEdits({});
      toast.success("تم حفظ الكميات المسددة.");
    },
    onError: error => toast.error(error.message),
  });
  if (!data?.rows?.length) return null;
  const { rows, canEdit } = data;

  function saveQuantities() {
    const parsed = boqAllocationsSchema.safeParse(rows.map(row => ({
      quantityScheduleId: row.quantityScheduleId,
      quantity: edits[row.quantityScheduleId] ?? row.settled,
    })).filter(row => row.quantity.trim() !== "" && boqQuantityUnits(row.quantity) !== 0));
    if (!parsed.success || parsed.data.some(row => {
      const limit = rows.find(item => item.quantityScheduleId === row.quantityScheduleId)?.limit;
      return (boqQuantityUnits(row.quantity) ?? 0) > (boqQuantityUnits(limit) ?? 0);
    })) {
      toast.error("أدخل كمية مسددة ضمن الحد المتاح وبما لا يتجاوز ثلاث منازل عشرية.");
      return;
    }
    save.mutate({ id: orderId, rows: parsed.data });
  }

  return (
    <section dir="rtl" className="space-y-3 rounded-xl border border-border/80 bg-card p-4">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Layers className="size-4 text-teal-600" />
          الكميات المسددة في أمر الصرف
        </h2>
        {canEdit && <p className="text-xs text-muted-foreground">إذا كان الصرف جزئيًا، سجّل الكمية التي سُدّدت من كل بند بهذا الأمر.</p>}
      </div>
      {rows.map(row => (
        <div key={row.quantityScheduleId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5">
          <div className="min-w-0 break-words text-sm">
            <div className="font-medium">{row.itemName}</div>
            <div className="text-xs text-muted-foreground">الحد المتاح {row.limit} {row.unit}</div>
          </div>
          <Input type="number" inputMode="decimal" min="0" step="0.001" max={row.limit} className="w-36"
            aria-label={`الكمية المسددة لبند ${row.itemName}`} placeholder="0"
            value={edits[row.quantityScheduleId] ?? row.settled} disabled={!canEdit || save.isPending}
            onChange={event => {
              const value = event.target.value;
              setEdits(current => ({ ...current, [row.quantityScheduleId]: value }));
            }} />
        </div>
      ))}
      {canEdit && (
        <Button type="button" onClick={saveQuantities} disabled={save.isPending || Object.keys(edits).length === 0}
          className="bg-teal-600 text-white hover:bg-teal-700">
          حفظ الكميات المسددة
        </Button>
      )}
    </section>
  );
}
