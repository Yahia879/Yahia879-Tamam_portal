import fs from 'fs';

const path = 'C:/Users/Loq/Desktop/Trying/Tamam_portal/client/src/components/ProjectFinancialsTab.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `                                          ) : voucher.status === "pending_approval" ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  approveVoucherMutation.mutate({ id: voucher.id });
                                                }}
                                                disabled={approveVoucherMutation.isPending}
                                                className="h-7 px-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/70 border border-emerald-200 rounded-md gap-1"
                                                title="اعتماد سند القبض"
                                              >
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                اعتماد
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenRejectModal(voucher)}
                                                disabled={rejectVoucherMutation.isPending}
                                                className="h-7 px-2 text-[11px] font-bold text-rose-700 hover:text-rose-900 hover:bg-rose-100/70 border border-rose-200 rounded-md gap-1"
                                                title="رفض سند القبض"
                                              >
                                                <XCircle className="h-3.5 w-3.5" />
                                                رفض
                                              </Button>
                                          ) : null`;

// We just need to wrap the two buttons with <> </> inside pending_approval branch
content = content.replace(
  /\) : voucher\.status === "pending_approval" \? \(/g,
  ') : voucher.status === "pending_approval" ? (<>'
);
content = content.replace(
  /رفض\r?\n\s*<\/Button>\r?\n\s*\) : null/g,
  'رفض\n                                              </Button>\n                                            </> ) : null'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed pending_approval branch JSX fragment');
