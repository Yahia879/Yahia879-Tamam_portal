import fs from "fs";

const filePath = "c:/Users/Yamen/Documents/GitHub/Yahia879-Tamam_portal/client/src/components/ProjectFinancialsTab.tsx";
let content = fs.readFileSync(filePath, "utf-8");

// Pattern for the notes cell in both tables
const targetPattern = /<TableCell className="text-xs text-muted-foreground">\s*\{voucher\.notes \? \([\s\S]*?<\/TableCell>/g;

const replacement = `<TableCell className="text-xs text-muted-foreground font-medium max-w-[250px] truncate" title={getCleanVoucherNotes(voucher.notes)}>
                                     {getCleanVoucherNotes(voucher.notes)}
                                   </TableCell>`;

content = content.replace(targetPattern, replacement);

fs.writeFileSync(filePath, content, "utf-8");
console.log("✅ Successfully replaced notes cells in ProjectFinancialsTab.tsx");
