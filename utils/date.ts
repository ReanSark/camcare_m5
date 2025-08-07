// utils/date.ts

// 1. Format to yyyy-MM-dd for <input type="date" />
export function toDateInputValue(dateString?: string): string {
  if (!dateString) return "";
  return new Date(dateString).toISOString().slice(0, 10);
}

// 2. Format to HH:mm for <input type="time" />
export function toTimeInputValue(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toISOString().slice(11, 16);
}

// 3. Format to yyyy-MM-ddTHH:mm for <input type="datetime-local" />
export function toDateTimeLocalInputValue(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toISOString().slice(0, 16);
}

// 4. Parse input value from <input type="date" /> back to ISO string
export function fromDateInputValue(inputValue?: string): string | undefined {
  if (!inputValue) return undefined;
  return new Date(inputValue).toISOString();
}

// 5. Parse input value from <input type="datetime-local" /> back to ISO string
export function fromDateTimeLocalInputValue(inputValue?: string): string | undefined {
  if (!inputValue) return undefined;
  return new Date(inputValue).toISOString();
}
