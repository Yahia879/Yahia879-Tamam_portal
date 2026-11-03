import { z } from "zod";

const preciseNumber = (places: number, message: string) =>
  z
    .number()
    .finite()
    .positive()
    .refine(
      value =>
        Math.abs(value * 10 ** places - Math.round(value * 10 ** places)) <
        0.00001,
      message
    );

export const changeOrderItemSchema = z.object({
  name: z.string().trim().min(1, "اسم البند مطلوب").max(255),
  unit: z.string().trim().min(1, "وحدة البند مطلوبة").max(50),
  quantity: preciseNumber(3, "الكمية تقبل ثلاث منازل عشرية فقط").max(1_000_000),
  unitPrice: preciseNumber(2, "السعر يقبل منزلتين عشريتين فقط").max(
    1_000_000_000
  ),
});

export const createChangeOrderSchema = z.object({
  projectId: z.number().int().positive(),
  submissionKey: z.string().uuid(),
  title: z.string().trim().min(3, "عنوان أمر التغيير مطلوب").max(200),
  reason: z.string().trim().min(3, "سبب التغيير مطلوب").max(4000),
  items: z
    .array(changeOrderItemSchema)
    .min(1, "أضف بنداً واحداً على الأقل")
    .max(100),
  beneficiaryName: z.string().trim().min(2, "اسم المستفيد مطلوب").max(255),
  beneficiaryBank: z.string().trim().max(255).optional(),
  beneficiaryIban: z.string().trim().max(50).optional(),
});

export type ChangeOrderItem = z.infer<typeof changeOrderItemSchema>;
export type PricedChangeOrderItem = ChangeOrderItem & { total: number };

export function priceChangeOrderItems(items: ChangeOrderItem[]) {
  // Round each line to halalas before adding the lines, as displayed to the user.
  const pricedItems = items.map(item => {
    const quantityMillis = Math.round(item.quantity * 1000);
    const priceCents = Math.round(item.unitPrice * 100);
    const total =
      Number.isFinite(quantityMillis) && Number.isFinite(priceCents)
        ? Number(
            (BigInt(quantityMillis) * BigInt(priceCents) + BigInt(500)) /
              BigInt(1000)
          ) / 100
        : 0;
    return { ...item, total };
  });
  const total =
    pricedItems.reduce((sum, item) => sum + Math.round(item.total * 100), 0) /
    100;
  return { items: pricedItems, total };
}

export function changeOrderPercentage(
  amount: number,
  originalProjectCost: number
) {
  return originalProjectCost > 0
    ? Math.round((amount / originalProjectCost) * 100_000_000) / 1_000_000
    : 0;
}
