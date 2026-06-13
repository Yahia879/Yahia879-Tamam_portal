import fs from "fs";
import path from "path";

const PAGES_DIR = "C:/Users/Yamen/Documents/GitHub/Yahia879-Tamam_portal/client/src/pages";

const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith(".tsx"));

console.log(`Analyzing ${files.length} page files...`);

const report = [];

for (const file of files) {
  const filePath = path.join(PAGES_DIR, file);
  const content = fs.readFileSync(filePath, "utf8");

  // Check for indicators of back button
  const hasArrowRight = content.includes("ArrowRight");
  const hasArrowLeft = content.includes("ArrowLeft");
  const hasHistoryBack = content.includes("history.back") || content.includes("navigate(-1)");
  const hasBackText = content.includes("العودة") || content.includes("رجوع");
  const hasBackButton = hasArrowRight || hasArrowLeft || hasHistoryBack || hasBackText;

  // Let's guess if it's a sub-page/form/details page
  const isDetails = file.toLowerCase().includes("detail") || content.includes("Details");
  const isForm = file.toLowerCase().includes("form") || content.includes("Form");
  const isEdit = file.toLowerCase().includes("edit") || content.includes("Edit");
  const isNew = file.toLowerCase().includes("new") || content.includes("New");
  const isPrint = file.toLowerCase().includes("print") || content.includes("Print");
  const isPreview = file.toLowerCase().includes("preview") || content.includes("Preview");
  
  // Non-root pages generally have parameters in wouter, or are specific sub-pages
  const hasParams = content.includes("useParams") || content.includes("params.");

  const isSubPage = isDetails || isForm || isEdit || isNew || isPreview || hasParams;

  report.push({
    file,
    hasBackButton,
    isSubPage,
    isPrint,
    indicators: { hasArrowRight, hasArrowLeft, hasHistoryBack, hasBackText }
  });
}

console.log(JSON.stringify(report, null, 2));
