import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, AlertCircle } from "lucide-react";

export interface ColumnDef {
  key: string;
  label: string;
  type: "text" | "select" | "date";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface DynamicArrayTableProps {
  title: string;
  description?: string;
  columns: ColumnDef[];
  rows: Record<string, any>[];
  onChange: (rows: Record<string, any>[]) => void;
  isRequired?: boolean;
  emptyLabel?: string;
  badgeText?: string;
  disabled?: boolean;
}

export function DynamicArrayTable({
  title,
  columns,
  rows,
  onChange,
  emptyLabel = "اضغط إضافة صف جديد لتسجيل البيانات",
  disabled = false,
}: DynamicArrayTableProps) {
  const handleAddRow = () => {
    if (disabled) return;
    const newRow: Record<string, any> = {};
    columns.forEach((col) => {
      newRow[col.key] = col.options ? col.options[0]?.value || "" : "";
    });
    onChange([...rows, newRow]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = rows.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleCellChange = (index: number, key: string, value: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [key]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={handleAddRow}
          className="h-9 max-lg:min-h-10 text-xs gap-1.5 border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          إضافة صف جديد
        </Button>
      </div>

      {/* Mobile Stacked Cards View */}
      <div className="md:hidden space-y-3">
        {rows.length === 0 ? (
          <div className="border border-border/80 rounded-xl bg-card p-6 text-center text-xs text-muted-foreground">
            <div className="flex flex-col items-center justify-center gap-1.5">
              <AlertCircle className="w-5 h-5 text-muted-foreground/60" />
              <span>{emptyLabel}</span>
            </div>
          </div>
        ) : (
          rows.map((row, idx) => (
            <div key={idx} className="border border-border/80 rounded-xl bg-card p-3.5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="text-xs font-bold text-muted-foreground">البند #{idx + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => handleRemoveRow(idx)}
                  className="h-9 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف
                </Button>
              </div>
              <div className="space-y-2.5">
                {columns.map((col) => (
                  <div key={col.key} className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground block">
                      {col.label}
                    </label>
                    {col.type === "select" && col.options ? (
                      <Select
                        disabled={disabled}
                        value={row[col.key] || col.options[0]?.value}
                        onValueChange={(val) => handleCellChange(idx, col.key, val)}
                      >
                        <SelectTrigger className="w-full h-10 text-xs max-md:text-base border-border/80">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {col.options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : col.type === "date" ? (
                      <Input
                        type="date"
                        disabled={disabled}
                        value={row[col.key] || ""}
                        onChange={(e) => handleCellChange(idx, col.key, e.target.value)}
                        className="w-full h-10 text-xs max-md:text-base border-border/80"
                      />
                    ) : (
                      <Input
                        type="text"
                        disabled={disabled}
                        placeholder={col.placeholder || col.label}
                        value={row[col.key] || ""}
                        onChange={(e) => handleCellChange(idx, col.key, e.target.value)}
                        className="w-full h-10 text-xs max-md:text-base border-border/80"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tablet & Desktop Table View */}
      <div className="hidden md:block border border-border/80 rounded-xl overflow-x-auto bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
              {columns.map((col) => (
                <TableHead key={col.key} className="text-xs font-bold text-foreground whitespace-nowrap">
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="w-16 text-center text-xs font-bold">حذف</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 2} className="text-center py-6 text-xs text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <AlertCircle className="w-5 h-5 text-muted-foreground/60" />
                    <span>{emptyLabel}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow key={idx} className="hover:bg-muted/30">
                  <TableCell className="text-center text-xs font-semibold text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell key={col.key} className="p-2 min-w-[140px]">
                      {col.type === "select" && col.options ? (
                        <Select
                          disabled={disabled}
                          value={row[col.key] || col.options[0]?.value}
                          onValueChange={(val) => handleCellChange(idx, col.key, val)}
                        >
                          <SelectTrigger className="h-9 pointer-coarse:min-h-10 text-xs border-border/80">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {col.options.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : col.type === "date" ? (
                        <Input
                          type="date"
                          disabled={disabled}
                          value={row[col.key] || ""}
                          onChange={(e) => handleCellChange(idx, col.key, e.target.value)}
                          className="h-9 pointer-coarse:min-h-10 text-xs border-border/80"
                        />
                      ) : (
                        <Input
                          type="text"
                          disabled={disabled}
                          placeholder={col.placeholder || col.label}
                          value={row[col.key] || ""}
                          onChange={(e) => handleCellChange(idx, col.key, e.target.value)}
                          className="h-9 pointer-coarse:min-h-10 text-xs border-border/80"
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      onClick={() => handleRemoveRow(idx)}
                      className="h-8 w-8 pointer-coarse:min-h-10 pointer-coarse:min-w-10 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
