import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  placeholder?: string;
}

export function SearchBar({
  onSearch,
  searchQuery,
  placeholder = "Search notes...",
}: SearchBarProps) {
  const handleSearch = (value: string) => {
    onSearch(value);
  };

  const clearSearch = () => {
    onSearch("");
  };

  return (
    <section role="search" className="relative w-full max-w-md">
      <form onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="search-input" className="sr-only">
          Search notes by title or content
        </label>
        <Search 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" 
          aria-hidden="true"
        />
        <Input
          id="search-input"
          type="search"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10"
          aria-describedby="search-help"
        />
        <span id="search-help" className="sr-only">
          Search results will update as you type
        </span>
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </Button>
        )}
      </form>
    </section>
  );
}
