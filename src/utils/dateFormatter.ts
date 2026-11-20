/**
 * Formats an ISO date or Date object into human-friendly relative format:
 * - "Today, 7:14 PM"
 * - "Yesterday, 6:58 PM"
 * - "18 Nov, 12:20 AM" (current year)
 * - "10 Nov 2025, 8:58 PM" (different year)
 */
export function formatExpenseDateTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  // Time in 12-hour format e.g. 7:14 PM
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // '0' becomes '12'
  const timeStr = `${hours}:${minutes} ${ampm}`;

  // If today or slightly ahead in today's midnight window
  if (isSameDay(date, now)) {
    return `Today, ${timeStr}`;
  }
  if (isSameDay(date, yesterday)) {
    return `Yesterday, ${timeStr}`;
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[date.getMonth()];
  const day = date.getDate();

  if (date.getFullYear() === now.getFullYear()) {
    return `${day} ${monthName}, ${timeStr}`;
  }
  return `${day} ${monthName} ${date.getFullYear()}, ${timeStr}`;
}

import { Expense } from '../types';

/**
 * Returns a section title for grouping expenses by date:
 * - "TODAY"
 * - "YESTERDAY"
 * - "18 NOV 2026"
 */
export function getDateSectionTitle(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return 'OLDER';

  const now = new Date();
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) {
    return 'TODAY';
  }
  if (isSameDay(date, yesterday)) {
    return 'YESTERDAY';
  }

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthName = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  return `${day} ${monthName} ${year}`;
}

export interface ExpenseDateGroup {
  title: string;
  total: number;
  items: Expense[];
}

export function groupExpensesByDate(expenses: Expense[]): ExpenseDateGroup[] {
  const groups: ExpenseDateGroup[] = [];
  const groupMap = new Map<string, ExpenseDateGroup>();

  for (const exp of expenses) {
    const title = getDateSectionTitle(exp.date);
    if (!groupMap.has(title)) {
      const entry: ExpenseDateGroup = { title, total: 0, items: [] };
      groupMap.set(title, entry);
      groups.push(entry);
    }
    const g = groupMap.get(title)!;
    g.items.push(exp);
    g.total += exp.amount;
  }

  return groups;
}
