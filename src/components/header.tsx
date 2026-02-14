"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, LogOut, Menu, User } from "lucide-react";
import { signOut } from "@/lib/auth/auth-client";
import { switchOrganizationAction } from "@/app/(dashboard)/actions/switch-organization";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SidebarMobileContent } from "@/components/sidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type HeaderProps = {
  user: { name: string; email: string };
  role: string | null;
  isAdmin: boolean;
  currentOrg?: { id: string; name: string } | null;
  organizations?: { id: string; name: string; slug: string }[];
};

const roleLabels: Record<string, string> = {
  owner: "Platform Admin",
  admin: "Fleet Manager",
  member: "Autista",
};

export function Header({
  user,
  role,
  isAdmin,
  currentOrg,
  organizations,
}: HeaderProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const [isSwitching, startTransition] = useTransition();

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = role ? roleLabels[role] ?? role : "Nessun ruolo";

  async function handleSignOut() {
    setIsLoggingOut(true);
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  }

  function handleOrgSwitch(orgId: string) {
    setOrgSwitcherOpen(false);
    startTransition(async () => {
      const result = await switchOrganizationAction(orgId);
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const showOrgSwitcher =
    isAdmin && organizations && organizations.length > 0;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Apri menu"
        >
          <Menu className="size-5" />
        </Button>

        {/* Breadcrumb navigation */}
        <div className="hidden min-w-0 flex-1 md:block">
          <Breadcrumb />
        </div>

        {/* Spacer on mobile */}
        <div className="flex-1 md:hidden" />

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Org switcher (admin only) */}
          {showOrgSwitcher && (
            <Popover open={orgSwitcherOpen} onOpenChange={setOrgSwitcherOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-between gap-2 max-w-[220px]",
                    isSwitching && "opacity-70"
                  )}
                  disabled={isSwitching}
                >
                  <Building2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">
                    {currentOrg?.name ?? "Seleziona..."}
                  </span>
                  <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0" align="end">
                <Command>
                  <CommandInput placeholder="Cerca organizzazione..." />
                  <CommandList>
                    <CommandEmpty>Nessuna organizzazione trovata</CommandEmpty>
                    <CommandGroup>
                      {organizations!.map((org) => (
                        <CommandItem
                          key={org.id}
                          value={org.name}
                          onSelect={() => handleOrgSwitch(org.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              currentOrg?.id === org.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <span className="truncate">{org.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {/* Theme toggle */}
          <ThemeToggle />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-accent"
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </div>
                <div className="hidden flex-col items-start sm:flex">
                  <span className="text-sm font-medium leading-tight">
                    {user.name}
                  </span>
                  <span className="text-xs leading-tight text-muted-foreground">
                    {roleLabel}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initials}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        {user.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="w-fit text-xs"
                  >
                    {roleLabel}
                    {isAdmin && role !== "owner" && " (Admin)"}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push("/settings/profile")}
                >
                  <User className="mr-2 size-4" />
                  Profilo
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={handleSignOut}
                disabled={isLoggingOut}
              >
                <LogOut className="mr-2 size-4" />
                {isLoggingOut ? "Disconnessione..." : "Esci"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile sidebar sheet */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0" showCloseButton={true}>
          <SheetTitle className="sr-only">Menu navigazione</SheetTitle>
          <SheetDescription className="sr-only">
            Menu di navigazione principale
          </SheetDescription>
          <SidebarMobileContent
            user={user}
            role={role}
            isAdmin={isAdmin}
            onNavigate={() => setIsMobileMenuOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
