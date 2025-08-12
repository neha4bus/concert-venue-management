// Shared validation utilities

import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email too long')
  .transform(email => email.toLowerCase().trim());

export const guestNameSchema = z.string()
  .min(1, 'Guest name is required')
  .max(100, 'Guest name too long')
  .transform(name => name.trim());

export const seatNumberSchema = z.string()
  .regex(/^[A-J]-([01][0-9]|20)$/, 'Invalid seat number format. Use A-01 to J-20');

export const ticketIdSchema = z.string()
  .regex(/^TKT-\d{4}-\d{6}-\d{3}$/, 'Invalid ticket ID format');

// Pagination validation
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['pending', 'assigned', 'checked-in', 'all']).optional()
});

// CSV import validation
export const csvImportSchema = z.object({
  csvData: z.string().optional(),
  googleSheetUrl: z.string().url().optional()
}).refine(data => data.csvData || data.googleSheetUrl, {
  message: 'Either csvData or googleSheetUrl must be provided'
}).refine(data => !(data.csvData && data.googleSheetUrl), {
  message: 'Provide either csvData or googleSheetUrl, not both'
});

// Validation helpers
export function validateSeatNumber(seatNumber: string): boolean {
  return /^[A-J]-([01][0-9]|20)$/.test(seatNumber);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateTicketId(ticketId: string): boolean {
  return /^TKT-\d{4}-\d{6}-\d{3}$/.test(ticketId);
}

export function sanitizeString(input: string, maxLength: number = 255): string {
  return input.trim().substring(0, maxLength);
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().substring(0, 255);
}

// CSV sanitization
export function sanitizeCSVField(field: string): string {
  // Remove potential CSV injection characters
  return field.replace(/^[=+\-@]/, '').trim();
}

// Rate limiting validation
export function validateRateLimit(windowMs: number, maxRequests: number): { windowMs: number; maxRequests: number } {
  return {
    windowMs: Math.max(1000, Math.min(3600000, windowMs)), // 1 second to 1 hour
    maxRequests: Math.max(1, Math.min(1000, maxRequests))  // 1 to 1000 requests
  };
}