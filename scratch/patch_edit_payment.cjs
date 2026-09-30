const fs = require('fs');
const filePath = 'client/src/pages/EditPaymentPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target1 = `  const isPaid = Boolean(payment?.isPaid || payment?.status === "paid" || Number(payment?.paidAmount || 0) > 0);`;
const replacement1 = `  const isPaid = Boolean(payment?.isPaid || payment?.status === "paid" || Number(payment?.paidAmount || 0) > 0);
  const isRequestClosed = Boolean(
    (projectDetails as any)?.isRequestClosed ||
    projectDetails?.request?.currentStage === "closed" ||
    (projectDetails as any)?.request?.status === "completed" ||
    (projectDetails as any)?.request?.closureStatus === "confirmed"
  );`;

const target2 = `    if (isPaid) {
      toast.error("لا يمكن تعديل دفعة مسددة نهائياً");
      return;
    }`;
const replacement2 = `    if (isPaid) {
      toast.error("لا يمكن تعديل دفعة مسددة نهائياً");
      return;
    }
    if (isRequestClosed) {
      toast.error("لا يمكن تعديل الدفعة لأن الطلب المرتبط بالمشروع مغلق نهائياً");
      return;
    }`;

const target3 = `            <Button onClick={handleSubmit} disabled={updateMutation.isPending || isPaid} className="w-full sm:w-auto shadow-sm">`;
const replacement3 = `            <Button onClick={handleSubmit} disabled={updateMutation.isPending || isPaid || isRequestClosed} className="w-full sm:w-auto shadow-sm">`;

const target4 = `        {isPaid && (
          <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="font-bold">تنبيه: هذه الدفعة مسددة ومقفلة</AlertTitle>
            <AlertDescription>
              تم سداد هذه الدفعة (أو تم تنفيذ أوامر صرف عليها). لا يمكن تعديل بياناتها أو مبالغها نهائياً حفاظاً على السلامة المالية والمحاسبية.
            </AlertDescription>
          </Alert>
        )}`;

const replacement4 = `        {isPaid && (
          <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="font-bold">تنبيه: هذه الدفعة مسددة ومقفلة</AlertTitle>
            <AlertDescription>
              تم سداد هذه الدفعة (أو تم تنفيذ أوامر صرف عليها). لا يمكن تعديل بياناتها أو مبالغها نهائياً حفاظاً على السلامة المالية والمحاسبية.
            </AlertDescription>
          </Alert>
        )}
        {isRequestClosed && (
          <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="font-bold">تنبيه: الطلب المرتبط بالمشروع مغلق</AlertTitle>
            <AlertDescription>
              تم إغلاق الطلب المرتبط بهذا المشروع نهائياً. لا يمكن تعديل بيانات هذه الدفعة.
            </AlertDescription>
          </Alert>
        )}`;

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget1 = target1.replace(/\r\n/g, '\n');
const normalizedReplacement1 = replacement1.replace(/\r\n/g, '\n');
const normalizedTarget2 = target2.replace(/\r\n/g, '\n');
const normalizedReplacement2 = replacement2.replace(/\r\n/g, '\n');
const normalizedTarget3 = target3.replace(/\r\n/g, '\n');
const normalizedReplacement3 = replacement3.replace(/\r\n/g, '\n');
const normalizedTarget4 = target4.replace(/\r\n/g, '\n');
const normalizedReplacement4 = replacement4.replace(/\r\n/g, '\n');

if (!normalizedContent.includes(normalizedTarget1)) {
  console.error('Target 1 not found!');
  process.exit(1);
}
if (!normalizedContent.includes(normalizedTarget2)) {
  console.error('Target 2 not found!');
  process.exit(1);
}
if (!normalizedContent.includes(normalizedTarget3)) {
  console.error('Target 3 not found!');
  process.exit(1);
}
if (!normalizedContent.includes(normalizedTarget4)) {
  console.error('Target 4 not found!');
  process.exit(1);
}

let newContent = normalizedContent.replace(normalizedTarget1, normalizedReplacement1);
newContent = newContent.replace(normalizedTarget2, normalizedReplacement2);
newContent = newContent.replace(normalizedTarget3, normalizedReplacement3);
newContent = newContent.replace(normalizedTarget4, normalizedReplacement4);

const isCRLF = content.includes('\r\n');
fs.writeFileSync(filePath, isCRLF ? newContent.replace(/\n/g, '\r\n') : newContent, 'utf8');
console.log('Successfully patched EditPaymentPage.tsx!');
