import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationSearchProps {
  onLocationSelect: (lat: number, lon: number) => void;
}

export function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = async (value: string) => {
    setQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Using OpenStreetMap Nominatim for better address/building search
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&addressdetails=1`
        );
        const data = await response.json();
        
        if (Array.isArray(data)) {
          setResults(data);
          setIsOpen(true);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('Failed to search location:', error);
        toast.error('Failed to search location');
      } finally {
        setIsLoading(false);
      }
    }, 800); // Increased debounce to 800ms to be polite to Nominatim
  };

  const handleSelect = (result: SearchResult) => {
    onLocationSelect(parseFloat(result.lat), parseFloat(result.lon));
    // Extract a shorter name for display if possible, or use full one
    const shortName = result.display_name.split(',')[0];
    setQuery(shortName);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full z-[800]" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search address, building, or city..." 
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 bg-background/95 backdrop-blur-sm shadow-sm"
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 p-1 max-h-[300px] overflow-y-auto shadow-lg z-[900]">
          <ul className="space-y-1">
            {results.map((result) => (
              <li key={result.place_id}>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto py-2 px-3 text-left font-normal"
                  onClick={() => handleSelect(result)}
                  type="button"
                >
                  <div className="flex items-start gap-3 w-full">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      <div className="font-medium text-sm line-clamp-2">{result.display_name}</div>
                    </div>
                  </div>
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
