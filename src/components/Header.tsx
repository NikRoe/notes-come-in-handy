import { ThemeToggle } from "@/components/ThemeToggle";
import { OfflineStatus } from "@/components/OfflineStatus";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

interface HeaderProps {
  title: string;
  className?: string;
  syncStatus?: "synced" | "pending";
}

export function Header({ title, className = "", syncStatus }: HeaderProps) {
  return (
    <header
      className={`flex justify-around sm:flex-row sm:justify-between sm:items-center gap-4 ${className}`}
    >
      <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
      <aside className="flex items-center gap-2" aria-label="App status and settings">
        <OfflineStatus syncStatus={syncStatus} />
        <ThemeToggle />
        <Button 
          onClick={() => signOut()} 
          variant="outline"
          size="sm"
        >
          Sign Out
        </Button>
      </aside>
    </header>
  );
}
