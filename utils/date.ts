// utils/date.ts

// 1. For HTML <input type="date" />
export function toDateInputValue(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  // Local to yyyy-MM-dd
  const yyyy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// 2. For HTML <input type="time" />
export function toTimeInputValue(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  // Local to HH:mm
  const hh = date.getHours().toString().padStart(2, "0");
  const min = date.getMinutes().toString().padStart(2, "0");
  return `${hh}:${min}`;
}

// 3. For HTML <input type="datetime-local" /> (local, no timezone)
export function toDateTimeLocalInputValue(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  const hh = date.getHours().toString().padStart(2, "0");
  const min = date.getMinutes().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

// 4. Display helper: yyyy-MM-dd HH:mm (24-hour clock, for UI)
export function toDateTimeLocalDisplay(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  const hh = date.getHours().toString().padStart(2, "0");
  const min = date.getMinutes().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

// 5. On submit: convert datetime-local string (local) to UTC ISO string
export function dateTimeLocalToUTCISOString(localString: string): string {
  if (!localString) return "";
  // localString: "2025-08-09T14:30"
  return new Date(localString).toISOString();
}

// 6. Parse date input value to ISO
export function fromDateInputValue(inputValue?: string): string | undefined {
  if (!inputValue) return undefined;
  return new Date(inputValue).toISOString();
}

// 7. Parse datetime-local input value to ISO (alias)
export function fromDateTimeLocalInputValue(inputValue?: string): string | undefined {
  if (!inputValue) return undefined;
  return new Date(inputValue).toISOString();
}
