import { type Ticket, type InsertTicket, type Seat, type InsertSeat } from "@shared/schema";

export interface IStorage {
  // Ticket operations
  getTicket(id: string): Promise<Ticket | undefined>;
  getTicketByTicketId(ticketId: string): Promise<Ticket | undefined>;
  getTicketByQRCode(qrCode: string): Promise<Ticket | undefined>;
  getAllTickets(): Promise<Ticket[]>;
  getTicketsPaginated(page: number, limit: number, filters?: { search?: string; status?: string }): Promise<{
    tickets: Ticket[];
    total: number;
  }>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket>;
  
  // Seat operations
  getAllSeats(): Promise<Seat[]>;
  getSeat(seatNumber: string): Promise<Seat | undefined>;
  createSeat(seat: InsertSeat): Promise<Seat>;
  updateSeat(seatNumber: string, updates: Partial<Seat>): Promise<Seat>;
  
  // Security: Atomic seat assignment
  assignSeatAtomically(ticketId: string, seatNumber: string, ticketIdForSeat: string): Promise<{
    success: boolean;
    error?: string;
    ticket?: Ticket;
  }>;
  
  // Statistics
  getStats(): Promise<{
    totalTickets: number;
    assignedSeats: number;
    scannedCodes: number;
    checkedIn: number;
  }>;
}