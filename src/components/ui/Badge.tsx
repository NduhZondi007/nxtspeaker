import type { BookingStatus } from "@/lib/types/database";

const statusStyles: Record<BookingStatus, string> = {
  PENDING: "bg-[#A88C7C]/15 text-[#A88C7C] border border-[#A88C7C]/30",
  CONFIRMED: "bg-success/15 text-success border border-success/30",
  DEPOSIT_PAID: "bg-[#8BA888]/15 text-[#8BA888] border border-[#8BA888]/30",
  COMPLETED: "bg-[#8C7CA8]/15 text-[#8C7CA8] border border-[#8C7CA8]/30",
  CANCELLED: "bg-danger/15 text-danger border border-danger/30",
  DECLINED: "bg-mid-gray/15 text-mid-gray border border-mid-gray/30",
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
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
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
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warm-gray text-charcoal",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
