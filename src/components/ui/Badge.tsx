import type { BookingStatus } from "@/lib/types/database";

const statusStyles: Record<BookingStatus, string> = {
  PENDING: "bg-secondary/15 text-secondary border border-secondary/30",
  CONFIRMED: "bg-success/15 text-success border border-success/30",
  DEPOSIT_PAID: "bg-primary/10 text-primary border border-primary/20",
  COMPLETED: "bg-primary/20 text-primary border border-primary/30",
  CANCELLED: "bg-danger/15 text-danger border border-danger/30",
  DECLINED: "bg-muted/15 text-muted border border-muted/30",
};

const statusLabels: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  DEPOSIT_PAID: "Deposit Paid",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DECLINED: "Declined",
};

interface BookingStatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

export function BookingStatusBadge({ status, className = "" }: BookingStatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-space-mono uppercase tracking-wide",
        statusStyles[status],
        className,
      ].join(" ")}
    >
      {statusLabels[status]}
    </span>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-support text-primary font-space-mono uppercase tracking-wide",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
