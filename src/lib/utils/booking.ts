import type { BookingStatus } from "@/lib/types/database";

export function getBookingStatusColor(status: BookingStatus): string {
  const colors: Record<BookingStatus, string> = {
    PENDING: "#A88C7C",
    CONFIRMED: "#6B9E78",
    DEPOSIT_PAID: "#8BA888",
    COMPLETED: "#8C7CA8",
    CANCELLED: "#C47A6A",
    DECLINED: "#9A9590",
  };
  return colors[status] ?? "#9A9590";
}

export function getBookingStatusLabel(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    DEPOSIT_PAID: "Deposit Paid",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    DECLINED: "Declined",
  };
  return labels[status] ?? status;
}

export function canChat(status: BookingStatus): boolean {
  return status !== "PENDING" && status !== "DECLINED" && status !== "CANCELLED";
}
