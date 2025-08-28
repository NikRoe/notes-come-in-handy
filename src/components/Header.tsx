import { ThemeToggle } from "@/components/ThemeToggle";
import { OfflineStatus } from "@/components/OfflineStatus";

interface HeaderProps {
  title: string;
  className?: string;
  syncStatus?: 'synced' | 'pending';
}

export function Header({ title, className = "", syncStatus }: HeaderProps) {
  return (
    <div
      className={`flex justify-around sm:flex-row sm:justify-between sm:items-center gap-4 ${className}`}
    >
      <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
      <div className="flex items-center gap-2">
        <OfflineStatus syncStatus={syncStatus} />
        <ThemeToggle />
      </div>
    </div>
  );
}
