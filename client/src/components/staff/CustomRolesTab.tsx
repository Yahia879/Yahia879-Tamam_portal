import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, Loader2, Power, MoreVertical, Plus } from "lucide-react";

export interface CustomRolesTabProps {
  openAddModal: boolean;
  setOpenAddModal: (open: boolean) => void;
}

export default function CustomRolesTab({ openAddModal, setOpenAddModal }: CustomRolesTabProps) {
  const [, setLocation] = useLocation();

  const utils = trpc.useContext();
  const { data: allRoles, isLoading } = trpc.permissions.getRoles.useQuery();

  const toggleMutation = trpc.permissions.toggleRoleStatus.useMutation({
    onSuccess: () => {
      utils.permissions.getRoles.invalidate();
    }
  });

  const handleToggleStatus = (roleId: string, isActive: boolean) => {
    toggleMutation.mutate({ roleId, isActive });
  };
  
  // تصفية الأدوار لإظهار الأدوار المخصصة فقط (isSystem === false)
  const roles = allRoles?.filter(role => role.id !== 'service_requester' && !role.isSystem);

  useEffect(() => {
    if (openAddModal) {
      setLocation("/roles/new");
      setOpenAddModal(false);
    }
  }, [openAddModal, setLocation, setOpenAddModal]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom Roles Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الدور المخصص</TableHead>
              <TableHead className="text-right">النوع</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles && roles.length > 0 ? (
              roles.map((role) => (
                <TableRow 
                  key={role.id}
                  onClick={() => setLocation(`/staff/roles/${role.id}`)}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-medium text-right">
                    {role.nameAr}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">مخصص</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {role.isActive ? (
                      <Badge variant="default" className="bg-green-600">
                        نشط
                      </Badge>
                    ) : (
                      <Badge variant="destructive">موقوف</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">فتح القائمة</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(role.id, !role.isActive)}
                          disabled={toggleMutation.isPending}
                          className={role.isActive ? "text-destructive focus:text-destructive cursor-pointer" : "text-green-600 focus:text-green-600 cursor-pointer"}
                        >
                          <Power className="h-4 w-4 ml-2" />
                          {role.isActive ? "إيقاف الدور" : "تفعيل الدور"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="p-4 bg-muted/30 rounded-full">
                      <Shield className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium text-lg">لا توجد أدوار مخصصة</h3>
                      <p className="text-muted-foreground max-w-sm mx-auto">
                        تُستخدم هذه المساحة لإدارة الأدوار التي تقوم بإنشائها خصيصاً لمنظمتك، وهي منفصلة عن الأدوار الأساسية للنظام.
                      </p>
                    </div>
                    <Button 
                      className="mt-4 gap-2"
                      onClick={() => setLocation("/roles/new")}
                    >
                      <Plus className="h-4 w-4" />
                      إضافة دور مخصص
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
