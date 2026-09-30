import { appRouter } from "../server/routers";

async function testConfirmation() {
  const ctx = {
    user: { id: 1, username: "admin", role: "admin", name: "مدير النظام" },
    req: {} as any,
    res: {} as any,
  };
  const caller = appRouter.createCaller(ctx);

  console.log("Checking current outbound orders for requestId 98...");
  const inventory: any = await caller.sedanaExecution.getVirtualInventory({ requestId: 98 });
  const pending = inventory.outboundOrders.find((o: any) => o.status === "pending_confirmation");

  if (!pending) {
    console.log("No pending_confirmation outbound order found. Orders:", inventory.outboundOrders);
    return;
  }

  console.log("Found pending order:", pending.orderNumber, "periodLabel:", pending.periodLabel);
  console.log("Attempting confirmation via caller.sedanaExecution.confirmSupervisorOutbound...");

  const res = await caller.sedanaExecution.confirmSupervisorOutbound({
    requestId: 98,
    outboundOrderId: pending.id,
    confirmedItems: pending.items.map((i: any) => ({
      id: i.id,
      quantity: i.quantity,
    })),
    outboundDate: "2026-09-23",
    outboundMethod: "direct_imam",
    recipientName: "إمام المسجد",
    recipientPhone: "0500000000",
    supervisorNotes: "تم التأكيد والموافقة على صرف الدفعة الدورية",
  });

  console.log("Confirmation result:", res);

  const afterInventory: any = await caller.sedanaExecution.getVirtualInventory({ requestId: 98 });
  console.log("After confirmation outbound orders count:", afterInventory.outboundOrders.length);
  const updatedOrder = afterInventory.outboundOrders.find((o: any) => o.id === pending.id);
  console.log("Updated order status:", updatedOrder?.status, "confirmedBy:", updatedOrder?.confirmedByName);
  console.log("Delivery orders count:", afterInventory.deliveryOrders?.length);

  process.exit(0);
}

testConfirmation().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
