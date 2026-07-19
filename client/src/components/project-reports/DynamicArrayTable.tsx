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
}

export function DynamicArrayTable({
  title,
  columns,
  rows,
  onChange,
  emptyLabel = "اضغط إضافة صف جديد لتسجيل البيانات",
}: DynamicArrayTableProps) {
  const handleAddRow = () => {
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddRow}
          className="h-8 text-xs gap-1.5 border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10"
        >
          <Plus className="w-3.5 h-3.5" />
          إضافة صف جديد
        </Button>
      </div>

      <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
              {columns.map((col) => (
                <TableHead key={col.key} className="text-xs font-bold text-foreground">
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
                    <TableCell key={col.key} className="p-2">
                      {col.type === "select" && col.options ? (
                        <Select
                          value={row[col.key] || col.options[0]?.value}
                          onValueChange={(val) => handleCellChange(idx, col.key, val)}
                        >
                          <SelectTrigger className="h-9 text-xs border-border/80">
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
                          value={row[col.key] || ""}
                          onChange={(e) => handleCellChange(idx, col.key, e.target.value)}
                          className="h-9 text-xs border-border/80"
                        />
                      ) : (
                        <Input
                          type="text"
                          placeholder={col.placeholder || col.label}
                          value={row[col.key] || ""}
                          onChange={(e) => handleCellChange(idx, col.key, e.target.value)}
                          className="h-9 text-xs border-border/80"
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRow(idx)}
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
