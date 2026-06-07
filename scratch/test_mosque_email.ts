import "dotenv/config";
import { notifyNewMosque } from "../server/routers/notifications";

async function main() {
  console.log("Triggering notifyNewMosque for testing...");
  // mosqueId: 999, mosqueName: "مسجد التجربة البريدية", requesterId: 61 (a non-admin requester to trigger the notification for officers)
  await notifyNewMosque(999, "مسجد التجربة البريدية", 61);
  console.log("notifyNewMosque call completed!");
  
  // Wait a few seconds for async email sending to complete or print errors
  await new Promise(resolve => setTimeout(resolve, 8000));
  process.exit(0);
}

main().catch(console.error);
