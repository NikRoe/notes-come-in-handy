import { ThemeToggle } from "@/components/ThemeToggle";

interface HeaderProps {
  title: string;
  className?: string;
}

export function Header({ title, className = "" }: HeaderProps) {
  return (
    <div
      className={`flex justify-around sm:flex-row sm:justify-between sm:items-center gap-4 ${className}`}
    >
      <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
      <ThemeToggle />
    </div>
  );
}
