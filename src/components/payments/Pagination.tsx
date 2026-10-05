import Link from "next/link";

interface PaginationProps {
  /** Path without a query string, e.g. "/admin/payments". */
  basePath: string;
  page: number;
  hasNext: boolean;
}

function href(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

/** Previous / next links for an offset-paginated ledger (`?page=`). */
export function Pagination({ basePath, page, hasNext }: PaginationProps) {
  if (page <= 1 && !hasNext) return null;

  const linkClass =
    "rounded-[3px] border border-secondary px-3 py-1.5 text-xs font-medium text-primary hover:bg-soft transition-colors";

  return (
    <nav
      aria-label="Pagination"
      className="px-5 py-3 border-t border-line flex items-center justify-between gap-4"
    >
      {page > 1 ? (
        <Link href={href(basePath, page - 1)} className={linkClass} rel="prev">
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="font-space-mono text-xs text-muted">Page {page}</span>
      {hasNext ? (
        <Link href={href(basePath, page + 1)} className={linkClass} rel="next">
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
