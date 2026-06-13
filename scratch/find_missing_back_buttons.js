import fs from "fs";
import path from "path";

const PAGES_DIR = "C:/Users/Yamen/Documents/GitHub/Yahia879-Tamam_portal/client/src/pages";
const APP_TSX = "C:/Users/Yamen/Documents/GitHub/Yahia879-Tamam_portal/client/src/App.tsx";

const appContent = fs.readFileSync(APP_TSX, "utf8");

// Parse routes from App.tsx to map component name -> path
const routesMap = {};
const routeRegex = /<Route\s+path="([^"]+)"[^>]*component=\{([a-zA-Z0-9]+)\}/g;
let match;
while ((match = routeRegex.exec(appContent)) !== null) {
  routesMap[match[2]] = match[1];
}

// Also parse inline rendered routes like component={() => <AdminRoute component={X} />} or {() => <X />}
const inlineRouteRegex = /<Route\s+path="([^"]+)"[^>]*>[\s\S]*?<([a-zA-Z0-9]+)\s/g;
while ((match = inlineRouteRegex.exec(appContent)) !== null) {
  if (match[2] !== "AdminRoute" && match[2] !== "RequesterRoute" && match[2] !== "ProtectedRoute") {
    routesMap[match[2]] = match[1];
  }
}
// Try another variant: component={params => <AdminRoute component={() => <EditImam params={params} />} />}
const variantRouteRegex = /<Route\s+path="([^"]+)"[^>]*>.*?component=\{\(\)\s*=>\s*<([a-zA-Z0-9]+)\b/g;
while ((match = variantRouteRegex.exec(appContent)) !== null) {
  routesMap[match[2]] = match[1];
}
// Add manual mappings for routes that are harder to parse regex
routesMap["EditImam"] = "/mosques/:id/edit-imam";
routesMap["FieldInspectionForm"] = "/requests/:requestId/field-inspection";
routesMap["QuickResponseReportForm"] = "/requests/:requestId/quick-response";
routesMap["NewDisbursementRequest"] = "/disbursements/new";
routesMap["NewLinkedDisbursementRequest"] = "/disbursements/new-linked";
routesMap["EditLinkedDisbursementRequest"] = "/disbursements/requests/:id/edit";
routesMap["NewDisbursementOrder"] = "/disbursements/orders/new/:requestId";
routesMap["DisbursementOrderDetails"] = "/disbursement-orders/:id";
routesMap["RolePermissions"] = "/staff/roles/:id";
routesMap["UserPermissions"] = "/users/:id/permissions";
routesMap["BOQ"] = "/boq/:requestId";

const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith(".tsx"));

const missingBack = [];

for (const file of files) {
  const componentName = file.replace(".tsx", "");
  const filePath = path.join(PAGES_DIR, file);
  const content = fs.readFileSync(filePath, "utf8");

  // Check for indicators of back button
  const hasArrowRight = content.includes("ArrowRight");
  const hasArrowLeft = content.includes("ArrowLeft");
  const hasHistoryBack = content.includes("history.back") || content.includes("navigate(-1)") || content.includes("window.history.back");
  const hasBackText = content.includes("العودة") || content.includes("رجوع");
  const hasBackButton = hasArrowRight || hasArrowLeft || hasHistoryBack || hasBackText;

  if (!hasBackButton) {
    // Check if it is a sub-page/form/details page or general page
    const route = routesMap[componentName] || null;
    
    // Ignore landing, login, register, dashboard, main lists
    const isRootPage = [
      "LandingPage.tsx", "Home.tsx", "Login.tsx", "AdminLogin.tsx", "Register.tsx", 
      "Dashboard.tsx", "RequesterDashboard.tsx", "Unauthorized.tsx", "NotFound.tsx",
      "Mosques.tsx", "Requests.tsx", "Projects.tsx", "SuppliersManagement.tsx",
      "StaffManagement.tsx", "ContractsList.tsx", "DisbursementRequests.tsx",
      "DisbursementOrders.tsx", "ProgressReports.tsx", "Handovers.tsx",
      "FinancialDashboard.tsx", "MyRequests.tsx", "MyMosques.tsx", "Notifications.tsx"
    ].includes(file);

    if (!isRootPage) {
      // Find the header or first h1 in the page
      const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
      const title = h1Match ? h1Match[1].trim().replace(/\{.*?\}/g, "").replace(/<.*?>/g, "") : "Unknown Title";

      missingBack.push({
        file,
        componentName,
        route,
        title,
        size: content.length
      });
    }
  }
}

console.log(JSON.stringify(missingBack, null, 2));
