import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Search, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Beneficiary = { id: number; name: string; phone: string | null; email: string; city: string | null; status: string };

export default function RequestBeneficiaryTransfer({ requestId, requestNumber }: { requestId: number; requestNumber: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Beneficiary | null>(null);
  const utils = trpc.useUtils();
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const { data, isFetching, isError } = trpc.requests.getTransferBeneficiaries.useQuery({ search: query, page }, { enabled: open });
  const transfer = trpc.requests.transferToBeneficiary.useMutation({
    onSuccess: async ({ beneficiaryName }) => {
      setOpen(false);
      setSelected(null);
      setSearch("");
      toast.success(`تم تحويل الطلب إلى ${beneficiaryName}، وسيظهر في حسابه ضمن طلباتي`);
      await Promise.all([
        utils.requests.getById.invalidate({ id: requestId }),
        utils.requests.getMyRequests.invalidate(),
        utils.requests.search.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });
  const items = data?.items || [];
  const choices = selected && !items.some((item) => item.id === selected.id) ? [selected, ...items] : items;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-10 gap-2 rounded-xl border border-violet-400 bg-gradient-to-l from-violet-700 to-indigo-600 px-4 font-bold text-white shadow-md shadow-violet-500/20 hover:from-violet-800 hover:to-indigo-700">
        <UserCheck className="h-4 w-4" />تحويل الطلب لمستفيد
      </Button>
      <Dialog open={open} onOpenChange={(value) => {
        if (transfer.isPending) return;
        setOpen(value);
        if (!value) { setSelected(null); setSearch(""); setQuery(""); setPage(1); }
      }}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto border-violet-200 sm:max-w-2xl">
          <DialogHeader className="items-start text-right sm:text-right">
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Users className="h-6 w-6" /></div>
            <DialogTitle>تحويل الطلب لمستفيد</DialogTitle>
            <DialogDescription className="text-right leading-relaxed">اختر المستفيد الذي سيتبع له الطلب <span dir="ltr" className="font-mono font-bold">{requestNumber}</span>، ليظهر في حسابه ضمن «طلباتي».</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-4 sm:p-5">
            <div className="space-y-2">
              <Label htmlFor="transfer-beneficiary-search" className="font-bold text-violet-950">البحث عن مستفيد</Label>
              <div className="relative">
                <Search className="absolute right-3 top-3.5 h-4 w-4 text-violet-500" />
                <Input id="transfer-beneficiary-search" value={search} onChange={(event) => setSearch(event.target.value)} disabled={transfer.isPending} placeholder="ابحث بالاسم أو رقم الجوال أو البريد الإلكتروني..." className="h-12 rounded-xl border-violet-200 bg-white pr-10 focus-visible:ring-violet-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-beneficiary" className="font-bold text-violet-950">المستفيد المسجل *</Label>
              <Select value={selected ? String(selected.id) : ""} onValueChange={(value) => setSelected(choices.find((item) => item.id === Number(value)) || null)} disabled={transfer.isPending || isFetching || isError}>
                <SelectTrigger id="transfer-beneficiary" className="h-12 w-full rounded-xl border-2 border-violet-200 bg-white text-right shadow-xs focus:ring-violet-400"><SelectValue placeholder={isFetching ? "جارٍ البحث عن المستفيدين..." : "اختر المستفيد لتحويل الطلب إليه"} /></SelectTrigger>
                <SelectContent dir="rtl" className="border-violet-200">
                  {choices.map((item) => <SelectItem key={item.id} value={String(item.id)} className="py-3 text-right focus:bg-violet-50">{item.name} — {item.phone || item.email}{item.status === "pending" ? " (قيد المراجعة)" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
              {isError ? <p role="alert" className="text-xs text-red-700">تعذر تحميل المستفيدين. أعد المحاولة.</p> : !isFetching && !items.length && <p className="text-xs text-violet-800">لا يوجد مستفيد مطابق للبحث.</p>}
              {(page > 1 || data?.hasMore) && <div className="flex items-center justify-between gap-2 text-xs text-violet-800">
                <Button variant="outline" size="sm" disabled={page <= 1 || isFetching || transfer.isPending} onClick={() => setPage(page - 1)}>السابق</Button>
                <span>صفحة {page}</span>
                <Button variant="outline" size="sm" disabled={!data?.hasMore || isFetching || transfer.isPending} onClick={() => setPage(page + 1)}>المزيد من المستفيدين</Button>
              </div>}
            </div>
            {selected && <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
              <div className="flex flex-wrap items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><strong>{selected.name}</strong><Badge variant="outline">{selected.status === "pending" ? "قيد المراجعة" : "معتمد"}</Badge></div>
              <p className="text-sm">{selected.phone}{selected.city ? ` — ${selected.city}` : ""}</p>
            </div>}
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => selected && transfer.mutate({ requestId, beneficiaryId: selected.id })} disabled={!selected || transfer.isPending} className="gap-2 bg-violet-700 font-bold text-white hover:bg-violet-800">
              {transfer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}تأكيد التحويل للمستفيد
            </Button>
            <Button variant="outline" disabled={transfer.isPending} onClick={() => { setOpen(false); setSelected(null); setSearch(""); setPage(1); }}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
