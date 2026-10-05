import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";

export const PAGE_SIZE = 20;

/** `?page=` from searchParams; anything that is not a positive integer is page 1. */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value)) return 1;
  const n = Number(value);
  return n >= 1 ? n : 1;
}

/** Inclusive `[from, to]` row indexes for PostgREST `.range()`. */
export function pageRange(page: number, pageSize: number = PAGE_SIZE): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}

interface PaginationProps {
  page: number;
  pageSize?: number;
  total: number;
  hrefFor: (page: number) => string;
}

export function Pagination({ page, pageSize = PAGE_SIZE, total, hrefFor }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={buttonClasses({ variant: "outline", size: "sm" })}>
          <ChevronLeft size={12} aria-hidden="true" /> Previous
        </Link>
      ) : (
        <span />
      )}
      <span aria-current="page" className="font-space-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        Page {Math.min(page, pages)} of {pages}
      </span>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={buttonClasses({ variant: "outline", size: "sm" })}>
          Next <ChevronRight size={12} aria-hidden="true" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
