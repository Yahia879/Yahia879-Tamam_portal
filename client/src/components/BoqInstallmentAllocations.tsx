import { Layers, Trash2 } from "lucide-react";
import { boqQuantityUnits, formatBoqQuantity, type BoqAllocation } from "@shared/boqPayments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BoqItem = { id: number; itemName: string; mosqueName?: string | null; unit: string; available: number };

export function BoqInstallmentAllocations({ items, value, paid, locked, onChange }: {
  items: BoqItem[];
  value: BoqAllocation[];
  paid: BoqAllocation[];
  locked: boolean;
  onChange: (rows: BoqAllocation[]) => void;
}) {
  const choices = items.filter(item => item.available > 0 && !value.some(row => row.quantityScheduleId === item.id));

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border/80 bg-muted/25 p-3.5">
      <h4 className="flex items-center gap-2 text-sm font-bold">
        <Layers className="size-4 shrink-0 text-teal-600" /> بنود جدول الكميات المرتبطة بالدفعة
      </h4>
      {value.map(row => {
        const item = items.find(item => item.id === row.quantityScheduleId);
        const paidQuantity = paid.find(entry => entry.quantityScheduleId === row.quantityScheduleId)?.quantity;
        const isFull = paidQuantity && boqQuantityUnits(paidQuantity) === boqQuantityUnits(row.quantity);
        const label = item?.itemName || `#${row.quantityScheduleId}`;
        return (
          <div key={row.quantityScheduleId} className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2.5">
            <div className="min-w-[8rem] flex-1 break-words text-sm">
              <span className={isFull ? "line-through" : undefined}>{label}</span>
              {item?.mosqueName && <span className="ms-2 text-xs text-muted-foreground">{item.mosqueName}</span>}
              {paidQuantity && <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">مسدّد <s>{paidQuantity} {item?.unit}</s></p>}
            </div>
            <div className="w-36 space-y-1">
              <Input type="number" inputMode="decimal" min="0.001" step="0.001"
                max={item ? formatBoqQuantity(item.available) : undefined} value={row.quantity}
                aria-label={`الكمية المرتبطة لبند ${label}`} disabled={locked}
                onChange={event => onChange(value.map(entry => entry.quantityScheduleId === row.quantityScheduleId
                  ? { ...entry, quantity: event.target.value }
                  : entry))} />
              {item && !locked && <p className="text-xs text-muted-foreground">المتاح {formatBoqQuantity(item.available)} {item.unit}</p>}
            </div>
            {!locked && (
              <Button type="button" variant="ghost" size="icon" aria-label={`إزالة ربط بند ${label}`}
                onClick={() => onChange(value.filter(entry => entry.quantityScheduleId !== row.quantityScheduleId))}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        );
      })}
      {!locked && choices.length > 0 && (
        <Select value="" onValueChange={id => onChange([...value, { quantityScheduleId: Number(id), quantity: "" }])}>
          <SelectTrigger className="w-full sm:max-w-sm" aria-label="ربط بنود من جدول الكميات">
            <SelectValue placeholder="ربط بنود من جدول الكميات" />
          </SelectTrigger>
          <SelectContent>
            {choices.map(item => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.itemName}{item.mosqueName ? ` — ${item.mosqueName}` : ""} · {formatBoqQuantity(item.available)} {item.unit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {!locked && choices.length === 0 && value.length === 0 && (
        <p className="text-xs text-muted-foreground">لا توجد كميات متاحة للربط.</p>
      )}
    </div>
  );
}
