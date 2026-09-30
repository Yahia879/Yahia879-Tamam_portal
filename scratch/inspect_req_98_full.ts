import { db } from './server/db';
import { mosqueRequests, quantitySchedules } from './server/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const req = await db.query.mosqueRequests.findFirst({ where: eq(mosqueRequests.id, 98) });
  console.log('Request 98 Stage:', req?.currentStage, 'Status:', req?.status);
  const pd: any = req?.programData || {};
  console.log('Program Data Keys:', Object.keys(pd));
  console.log('basketItems:', pd.basketItems);
  console.log('needsAssessment:', pd.needsAssessment);
  console.log('needsStudy:', pd.needsStudy);
  console.log('reviewedItems:', pd.reviewedItems);
  console.log('sedanaExecution dates/cycles:', {
    startDate: pd.sedanaExecution?.startDate || pd.sedanaExecution?.executionStartDate,
    history: pd.sedanaExecution?.outboundOrders,
  });
  
  const qs = await db.query.quantitySchedules.findMany({ where: eq(quantitySchedules.requestId, 98) });
  console.log('Quantity Schedules:', qs.map(q => ({
    id: q.id,
    itemDescription: q.itemDescription,
    unit: q.unit,
    totalQuantity: q.totalQuantity,
    notes: q.notes,
  })));
  process.exit(0);
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
