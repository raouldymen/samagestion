"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export type SearchSuggestion = {
  value: string;
  label: string;
  detail?: string | null;
};

type ListSearchProps = {
  id: string;
  label: string;
  placeholder: string;
  initialQuery: string;
  emptyLabel: string;
  searchSuggestions: (query: string) => Promise<SearchSuggestion[]>;
};

/** Recherche de liste avec saisie directe, suggestions et menu déroulant. */
export function ListSearch({
  id,
  label,
  placeholder,
  initialQuery,
  emptyLabel,
  searchSuggestions,
}: ListSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [menuOpen, setMenuOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [resultsQuery, setResultsQuery] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionsCache = useRef(new Map<string, SearchSuggestion[]>());

  const applyQuery = useCallback(
    (value: string) => {
      const term = value.trim();
      const params = new URLSearchParams(searchParams.toString());

      if (term) {
        params.set("q", term);
      } else {
        params.delete("q");
      }

      params.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const current = searchParams.get("q") ?? "";

      if (query === current || query.trim() === current) {
        return;
      }

      applyQuery(query);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [applyQuery, query, searchParams]);

  useEffect(() => {
    const term = query.trim();

    if (!term && !menuOpen) {
      return;
    }

    const cached = suggestionsCache.current.get(term);
    if (cached) {
      setSuggestions(cached);
      setResultsQuery(term);
      return;
    }

    let active = true;
    setLoadingSuggestions(true);
    void searchSuggestions(term)
      .then((nextSuggestions) => {
        if (active) {
          suggestionsCache.current.set(term, nextSuggestions);
          setSuggestions(nextSuggestions);
          setResultsQuery(term);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingSuggestions(false);
        }
      });

    return () => {
      active = false;
    };
  }, [menuOpen, query, searchSuggestions]);

  const visible = menuOpen || Boolean(query.trim());
  const currentResults = resultsQuery === query.trim();

  function selectSuggestion(value: string) {
    setQuery(value);
    setMenuOpen(false);
    applyQuery(value);
  }

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        label={label}
        hideLabel
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setMenuOpen(true);
        }}
        onFocus={() => setMenuOpen(true)}
        placeholder={placeholder}
        className="pr-11 pl-10"
        autoComplete="off"
      />
      <button
        type="button"
        aria-label={`Afficher les suggestions : ${label}`}
        aria-expanded={visible}
        onClick={() => setMenuOpen((open) => !open)}
        className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-md border border-border bg-muted text-foreground shadow-sm transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronDown className="size-5" strokeWidth={2.5} aria-hidden="true" />
      </button>
      {visible ? (
        <div className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          {loadingSuggestions || !currentResults ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Recherche…
            </div>
          ) : suggestions.length ? (
            <ul className="max-h-72 overflow-y-auto py-1" role="listbox" aria-label={label}>
              {suggestions.map((suggestion) => (
                <li key={`${suggestion.value}-${suggestion.label}`}>
                  <button
                    type="button"
                    role="option"
                    onClick={() => selectSuggestion(suggestion.value)}
                    className="flex w-full flex-col px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <span className="font-medium text-foreground">{suggestion.label}</span>
                    {suggestion.detail ? (
                      <span className="text-xs text-muted-foreground">{suggestion.detail}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              {query.trim() ? "Aucun résultat." : emptyLabel}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
