import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function formatDateTime(value: string | Date, format = "MMM D, YYYY h:mm A") {
  return dayjs(value).format(format);
}

export function formatDate(value: string | Date, format = "MMM D, YYYY") {
  return dayjs(value).format(format);
}

export function formatRelative(value: string | Date) {
  return dayjs(value).fromNow();
}

export function isPast(value: string | Date) {
  return dayjs(value).isBefore(dayjs());
}

export function isSameDay(a: string | Date, b: string | Date) {
  return dayjs(a).isSame(b, "day");
}
