import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        className="pl-10 bg-card border-border rounded-xl h-11 shadow-sm text-sm placeholder:text-muted-foreground focus-visible:ring-primary/30"
        placeholder="Buscar produto por nome ou código..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
