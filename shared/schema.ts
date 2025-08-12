import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: text("ticket_id").notNull().unique(),
  guestName: text("guest_name").notNull(),
  email: text("email").notNull(),
  seatNumber: text("seat_number"),
  qrCode: text("qr_code").notNull(),
  status: text("status").notNull().default("pending"), // pending, assigned, checked-in
  purchaseDate: timestamp("purchase_date").notNull().defaultNow(),
  assignedAt: timestamp("assigned_at"),
  checkedInAt: timestamp("checked_in_at"),
});

export const seats = pgTable("seats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  seatNumber: text("seat_number").notNull().unique(),
  row: text("row").notNull(),
  seatIndex: text("seat_index").notNull(),
  isOccupied: boolean("is_occupied").notNull().default(false),
  ticketId: text("ticket_id"),
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  purchaseDate: true,
  assignedAt: true,
  checkedInAt: true,
});

// Schema for frontend ticket creation (only requires guestName and email)
export const createTicketSchema = z.object({
  guestName: z.string().min(1, "Guest name is required").max(100, "Guest name too long"),
  email: z.string().email("Valid email address is required").max(255, "Email too long"),
  status: z.string().optional(),
  seatNumber: z.string().optional().nullable(),
});

export const insertSeatSchema = createInsertSchema(seats).omit({
  id: true,
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type CreateTicket = z.infer<typeof createTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type InsertSeat = z.infer<typeof insertSeatSchema>;
export type Seat = typeof seats.$inferSelect;
