import { useMemo, useState } from "react";

interface UseListControlsOptions<T> {
  data: T[];
  searchFields?: (keyof T)[];
  pageSize?: number;
}

/**
 * Shared list-screen behavior: search across given fields, arbitrary column
 * filters, and pagination. Client-side — fine for the list sizes a single
 * school produces (hundreds, not millions, of rows). For very large tables,
 * push search/filter into the Supabase query instead (.ilike, .eq, .range).
 */
export function useListControls<T extends Record<string, any>>({ data, searchFields = [], pageSize = 20 }: UseListControlsOptions<T>) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = data;
    if (search.trim() && searchFields.length) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((row) => searchFields.some((f) => String(row[f] ?? "").toLowerCase().includes(q)));
    }
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      rows = rows.filter((row) => String(row[key] ?? "") === value);
    }
    return rows;
  }, [data, search, filters, searchFields]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  return {
    search,
    setSearch: (v: string) => { setSearch(v); setPage(1); },
    filters,
    setFilter: (key: string, value: string) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); },
    page: clampedPage,
    setPage,
    totalPages,
    pageRows,
    totalCount: filtered.length,
  };
}
