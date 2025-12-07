/**
 * Calendar utilities for generating ICS files and calendar links
 */

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startDate: Date | string;
  endDate: Date | string;
  url?: string;
}

/**
 * Format a date for ICS file format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generate unique identifier for calendar event
 */
function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}@zapvent`;
}

/**
 * Generate ICS file content for a calendar event
 */
export function generateICSContent(event: CalendarEvent): string {
  const uid = generateUID();
  const now = formatICSDate(new Date());
  const start = formatICSDate(event.startDate);
  const end = formatICSDate(event.endDate);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zapvent//Campus Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`);
  }

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Download an ICS file for the given event
 */
export function downloadICSFile(event: CalendarEvent): void {
  const content = generateICSContent(event);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Generate Google Calendar URL for the event
 */
export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const startDate =
    typeof event.startDate === "string"
      ? new Date(event.startDate)
      : event.startDate;
  const endDate =
    typeof event.endDate === "string" ? new Date(event.endDate) : event.endDate;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
  });

  if (event.description) {
    params.set("details", event.description);
  }

  if (event.location) {
    params.set("location", event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Format date for Google Calendar URL (YYYYMMDDTHHMMSSZ)
 */
function formatGoogleDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * Generate Outlook Calendar URL
 */
export function getOutlookCalendarUrl(event: CalendarEvent): string {
  const startDate =
    typeof event.startDate === "string"
      ? new Date(event.startDate)
      : event.startDate;
  const endDate =
    typeof event.endDate === "string" ? new Date(event.endDate) : event.endDate;

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
  });

  if (event.description) {
    params.set("body", event.description);
  }

  if (event.location) {
    params.set("location", event.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
