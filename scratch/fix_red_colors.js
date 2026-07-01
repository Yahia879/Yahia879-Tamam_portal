import fs from "fs";

const filepath = "C:/Users/Loq/Desktop/Trying/Tamam_portal/client/src/pages/RequesterApprovalDetails.tsx";
let content = fs.readFileSync(filepath, "utf8");

const replacements = [
  {
    target: 'bg-red-50/20 dark:bg-red-955/10 p-4 rounded-xl border border-red-200/40 dark:border-red-900/30',
    replace: 'bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800'
  },
  {
    target: 'bg-red-100/10 dark:bg-slate-800',
    replace: 'bg-slate-100 dark:bg-slate-800'
  },
  {
    target: '"bg-red-600 text-white shadow-sm"',
    replace: '"bg-slate-900 dark:bg-slate-700 text-white shadow-sm"'
  },
  {
    target: '"text-slate-650 dark:text-slate-300 hover:bg-red-200/20 dark:hover:bg-slate-700/50"',
    replace: '"text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"'
  },
  {
    target: '"text-slate-655 dark:text-slate-300 hover:bg-red-200/20 dark:hover:bg-slate-700/50"',
    replace: '"text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"'
  },
  {
    target: 'text-red-700 dark:text-red-400',
    replace: 'text-rose-600 dark:text-rose-455'
  },
  {
    target: 'border-red-200/50 dark:border-red-900/40 bg-white dark:bg-slate-955 focus:ring-1 focus:ring-red-500 focus:border-red-500',
    replace: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-1 focus:ring-rose-500 focus:border-rose-500'
  },
  {
    target: 'className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 rounded-xl"',
    replace: 'className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 rounded-xl transition-colors"'
  }
];

let replacedCount = 0;
for (const rep of replacements) {
  if (content.includes(rep.target)) {
    content = content.replaceAll(rep.target, rep.replace);
    replacedCount++;
  }
}

if (replacedCount > 0) {
  fs.writeFileSync(filepath, content, "utf8");
  console.log(`✅ Color adjustments successfully softened (${replacedCount} replacements made).`);
} else {
  console.log("❌ None of the target color strings were found.");
}
