"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Pencil, Ban } from "lucide-react";
import { toast } from "sonner";
import { deleteUser } from "../actions/delete-user";

export type UserRow = {
  id: string;
  memberId: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  createdAt: Date;
  emailVerified: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Platform Admin",
  admin: "Fleet Manager",
  member: "Autista",
};

function roleBadgeVariant(role: string) {
  switch (role) {
    case "owner":
      return "destructive" as const;
    case "admin":
      return "default" as const;
    default:
      return "secondary" as const;
  }
}

export function UserTable({
  users,
  currentUserId,
  canEdit,
}: {
  users: UserRow[];
  currentUserId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  }>({ open: false, userId: "", userName: "" });
  const [isLoading, setIsLoading] = useState(false);

  async function handleDeactivate() {
    setIsLoading(true);
    try {
      const result = await deleteUser(confirmDialog.userId);
      if (result.success) {
        toast.success("Utente disattivato");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Errore nella disattivazione");
    } finally {
      setIsLoading(false);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Ruolo</TableHead>
            <TableHead>Data creazione</TableHead>
            {canEdit && <TableHead className="w-[50px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={canEdit ? 5 : 4}
                className="text-center text-muted-foreground"
              >
                Nessun utente presente
              </TableCell>
            </TableRow>
          )}
          {users.map((user) => (
            <TableRow key={user.memberId}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {user.email}
              </TableCell>
              <TableCell>
                <Badge variant={roleBadgeVariant(user.role)}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(user.createdAt).toLocaleDateString("it-IT")}
              </TableCell>
              {canEdit && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(
                            `/settings/users/${user.id}/edit`
                          )
                        }
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifica
                      </DropdownMenuItem>
                      {user.id !== currentUserId && (
                        <DropdownMenuItem
                          onClick={() =>
                            setConfirmDialog({
                              open: true,
                              userId: user.id,
                              userName: user.name,
                            })
                          }
                          className="text-destructive"
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Disattiva
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ ...confirmDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disattiva utente</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per disattivare &quot;{confirmDialog.userName}&quot;.
              L&apos;utente verrà disconnesso immediatamente e non potrà
              più accedere alla piattaforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={isLoading}
            >
              {isLoading ? "Disattivazione..." : "Disattiva"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
