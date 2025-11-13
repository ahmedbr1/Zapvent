import dayjs, { type Dayjs } from "dayjs";
import type { EventType, Location } from "@/lib/types";

export interface EventFilters {
  search: string;
  eventType?: EventType | "All";
  location?: Location | "All";
  professor?: string;
  sessionType?: string | "All";
  startDate?: string | null;
  endDate?: string | null;
  sortOrder: "asc" | "desc";
}

interface FilterOptions<T> {
  getEventType?: (item: T) => EventType | string | undefined | null;
  getLocation?: (item: T) => Location | string | undefined | null;
  getSessionType?: (item: T) => string | undefined | null;
  getStartDate?: (item: T) => string | Date | Dayjs | null | undefined;
  getProfessorNames?: (item: T) => readonly string[] | undefined;
  getSearchValues?: (item: T) => Array<string | undefined | null>;
}

export function filterAndSortEvents<T>(
  items: readonly T[] | undefined,
  filters: EventFilters,
  options: FilterOptions<T> = {}
): T[] {
  if (!items || items.length === 0) {
    return [];
  }

  const {
    getEventType,
    getLocation = (item: T) =>
      (item as { location?: Location | string }).location,
    getSessionType,
    getStartDate = (item: T) =>
      (item as { startDate?: string | Date }).startDate ?? null,
    getProfessorNames,
    getSearchValues,
  } = options;

  const searchTerm = filters.search.trim().toLowerCase();
  const startDate = filters.startDate ? dayjs(filters.startDate) : null;
  const endDate = filters.endDate ? dayjs(filters.endDate) : null;

  const filtered = items.filter((item) => {
    const itemEventType = getEventType
      ? getEventType(item)
      : (item as { eventType?: EventType }).eventType;
    if (
      filters.eventType &&
      filters.eventType !== "All" &&
      itemEventType &&
      itemEventType !== filters.eventType
    ) {
      return false;
    }

    const itemLocation = getLocation(item);
    if (
      filters.location &&
      filters.location !== "All" &&
      itemLocation &&
      itemLocation !== filters.location
    ) {
      return false;
    }

    if (filters.sessionType && filters.sessionType !== "All") {
      const itemSessionType = getSessionType ? getSessionType(item) : undefined;
      if (!itemSessionType || itemSessionType !== filters.sessionType) {
        return false;
      }
    }

    if (filters.professor) {
      const lowerProfessor = filters.professor.toLowerCase();
      const professors = getProfessorNames
        ? getProfessorNames(item)
        : undefined;
      if (!professors || professors.length === 0) {
        return false;
      }
      const matchesProfessor = professors.some((entry) =>
        entry.toLowerCase().includes(lowerProfessor)
      );
      if (!matchesProfessor) {
        return false;
      }
    }

    const dateValue = getStartDate(item);
    if (dateValue) {
      const eventDate = dayjs(dateValue);
      if (startDate && eventDate.isBefore(startDate, "day")) {
        return false;
      }
      if (endDate && eventDate.isAfter(endDate, "day")) {
        return false;
      }
    }

    if (searchTerm) {
      const haystackValues = getSearchValues
        ? getSearchValues(item)
        : [
            (item as { name?: string }).name,
            (item as { description?: string }).description,
          ];
      const haystack = haystackValues
        .flatMap((value) => (value ? value.toString() : []))
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const startA = getStartDate(a);
    const startB = getStartDate(b);
    const timeA = startA ? dayjs(startA).valueOf() : Number.POSITIVE_INFINITY;
    const timeB = startB ? dayjs(startB).valueOf() : Number.POSITIVE_INFINITY;
    const delta = timeA - timeB;
    return filters.sortOrder === "asc" ? delta : -delta;
  });

  return sorted;
}
