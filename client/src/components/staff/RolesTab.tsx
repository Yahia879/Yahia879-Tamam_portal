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
import { Shield, Plus, Users, Loader2, Power, MoreVertical, ShieldOff } from "lucide-react";

export interface RolesTabProps {
  openAddModal: boolean;
  setOpenAddModal: (open: boolean) => void;
}

export default function RolesTab({ openAddModal, setOpenAddModal }: RolesTabProps) {
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
  
  // تصفية الأدوار لإخفاء "طالب الخدمة" ولإظهار الأدوار الافتراضية فقط
  const roles = allRoles?.filter(role => role.id !== 'service_requester' && role.isSystem);

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
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الأدوار</p>
              <p className="text-2xl font-bold">{roles?.length || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الأدوار النشطة</p>
              <p className="text-2xl font-bold">
                {roles?.filter((r) => r.isActive).length || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <ShieldOff className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الأدوار الموقوفة</p>
              <p className="text-2xl font-bold">
                {roles?.filter((r) => !r.isActive).length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Roles Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الدور</TableHead>
              <TableHead className="text-right">الوصف</TableHead>
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
                  <TableCell className="text-muted-foreground text-right">
                    {role.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {role.isSystem ? (
                      <Badge variant="secondary">أساسي</Badge>
                    ) : (
                      <Badge variant="outline">مخصص</Badge>
                    )}
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
                    {role.id !== 'super_admin' && role.id !== 'system_admin' && (
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
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Shield className="h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">لا توجد أدوار</p>
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
