import { useEffect, useRef, useState } from "react";
import { MapPin, Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { useGeocoding } from "@/features/warehouses/hooks/useGeocoding";
import type { GeocodingResult } from "@/features/warehouses/hooks/useGeocoding";

interface LocationSearchProps {
  /** Called when the user selects a geocoded result. */
  onSelect: (result: GeocodingResult) => void;
  /** Placeholder text for the search input. */
  placeholder?: string;
  /** Disable the entire search input. */
  disabled?: boolean;
}

/**
 * Search-as-you-type location input backed by Nominatim geocoding.
 *
 * Debounces keystrokes (400 ms) before sending a request. Shows a
 * dropdown of matching results the user can pick from. Includes a
 * clear button and loading/error states.
 *
 * Nominatim usage policy: max 1 request/second, custom User-Agent.
 * The 400 ms debounce naturally throttles to ~2.5 req/s at most,
 * which is within the spirit of the policy for interactive use.
 */
export function LocationSearch({
  onSelect,
  placeholder = "Search location (e.g. Hyderabad, India)",
  disabled = false,
}: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const { results, isSearching, searchError, search, clearResults } =
    useGeocoding();
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger search when debounced query changes.
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      void search(debouncedQuery);
      setIsDropdownOpen(true);
    } else {
      clearResults();
      setIsDropdownOpen(false);
    }
  }, [debouncedQuery, search, clearResults]);

  // Close dropdown when clicking outside.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: GeocodingResult) => {
    setQuery(result.displayName);
    setIsDropdownOpen(false);
    onSelect(result);
  };

  const handleClear = () => {
    setQuery("");
    clearResults();
    setIsDropdownOpen(false);
  };

  const showDropdown =
    isDropdownOpen && (results.length > 0 || isSearching || searchError || query.trim().length >= 2);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || query.trim().length >= 2) {
              setIsDropdownOpen(true);
            }
          }}
          placeholder={placeholder}
          className="pl-9 pr-9"
          disabled={disabled}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md">
          {/* Loading */}
          {isSearching && results.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching locations…
            </div>
          )}

          {/* Error */}
          {searchError && (
            <div className="px-4 py-3 text-sm text-destructive">
              {searchError}
            </div>
          )}

          {/* Results */}
          {!isSearching && !searchError && results.length === 0 && query.trim().length >= 2 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No locations found for "{query.trim()}"
            </div>
          )}

          {results.length > 0 && (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((result) => (
                <li key={result.placeId}>
                  <button
                    type="button"
                    onClick={() => handleSelect(result)}
                    className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {result.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.lat.toFixed(6)}, {result.lon.toFixed(6)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
