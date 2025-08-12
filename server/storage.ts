import { type Ticket, type InsertTicket, type Seat, type InsertSeat } from "@shared/schema";
import { randomUUID } from "crypto";
import { getVenueConfig, generateSeats } from "./config/venue";
import type { IStorage } from "./storage/interface";

export class MemStorage implements IStorage {
  private tickets: Map<string, Ticket> = new Map();
  private seats: Map<string, Seat> = new Map();
  private operationLocks: Map<string, Promise<any>> = new Map(); // For atomic operations

  constructor() {
    this.initializeSeats();
  }

  private initializeSeats() {
    const venueConfig = getVenueConfig();
    const seatData = generateSeats(venueConfig);
    
    seatData.forEach(seatInfo => {
      const seat: Seat = {
        id: randomUUID(),
        seatNumber: seatInfo.seatNumber,
        row: seatInfo.row,
        seatIndex: seatInfo.seatIndex,
        isOccupied: false,
        ticketId: null
      };
      this.seats.set(seat.seatNumber, seat);
    });
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    return this.tickets.get(id);
  }

  async getTicketByTicketId(ticketId: string): Promise<Ticket | undefined> {
    return Array.from(this.tickets.values()).find(ticket => ticket.ticketId === ticketId);
  }

  async getTicketByQRCode(qrCode: string): Promise<Ticket | undefined> {
    return Array.from(this.tickets.values()).find(ticket => ticket.qrCode === qrCode);
  }

  async getAllTickets(): Promise<Ticket[]> {
    return Array.from(this.tickets.values());
  }

  async getTicketsPaginated(page: number, limit: number, filters?: { search?: string; status?: string }): Promise<{
    tickets: Ticket[];
    total: number;
  }> {
    let tickets = Array.from(this.tickets.values());
    
    // Apply filters
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      tickets = tickets.filter(ticket => 
        ticket.guestName.toLowerCase().includes(searchLower) ||
        ticket.email.toLowerCase().includes(searchLower) ||
        ticket.ticketId.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters?.status && filters.status !== 'all') {
      tickets = tickets.filter(ticket => ticket.status === filters.status);
    }
    
    // Sort by creation date (newest first)
    tickets.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
    
    const total = tickets.length;
    const startIndex = (page - 1) * limit;
    const paginatedTickets = tickets.slice(startIndex, startIndex + limit);
    
    return {
      tickets: paginatedTickets,
      total
    };
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const id = randomUUID();
    const ticket: Ticket = {
      ...insertTicket,
      id,
      status: insertTicket.status || "pending",
      seatNumber: insertTicket.seatNumber || null,
      purchaseDate: new Date(),
      assignedAt: null,
      checkedInAt: null
    };
    this.tickets.set(id, ticket);
    return ticket;
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket> {
    const existingTicket = this.tickets.get(id);
    if (!existingTicket) {
      throw new Error('Ticket not found');
    }

    const updatedTicket = { ...existingTicket, ...updates };
    this.tickets.set(id, updatedTicket);
    return updatedTicket;
  }

  async getAllSeats(): Promise<Seat[]> {
    return Array.from(this.seats.values());
  }

  async getSeat(seatNumber: string): Promise<Seat | undefined> {
    return this.seats.get(seatNumber);
  }

  async createSeat(insertSeat: InsertSeat): Promise<Seat> {
    const id = randomUUID();
    const seat: Seat = { 
      ...insertSeat, 
      id,
      isOccupied: insertSeat.isOccupied || false,
      ticketId: insertSeat.ticketId || null
    };
    this.seats.set(seat.seatNumber, seat);
    return seat;
  }

  async updateSeat(seatNumber: string, updates: Partial<Seat>): Promise<Seat> {
    const existingSeat = this.seats.get(seatNumber);
    if (!existingSeat) {
      throw new Error('Seat not found');
    }

    const updatedSeat = { ...existingSeat, ...updates };
    this.seats.set(seatNumber, updatedSeat);
    return updatedSeat;
  }

  // Security: Atomic seat assignment to prevent race conditions
  async assignSeatAtomically(ticketId: string, seatNumber: string, ticketIdForSeat: string): Promise<{
    success: boolean;
    error?: string;
    ticket?: Ticket;
  }> {
    const lockKey = `seat-${seatNumber}`;
    
    // Wait for any existing operation on this seat to complete
    if (this.operationLocks.has(lockKey)) {
      await this.operationLocks.get(lockKey);
    }
    
    // Create a new operation lock
    const operation = this._performSeatAssignment(ticketId, seatNumber, ticketIdForSeat);
    this.operationLocks.set(lockKey, operation);
    
    try {
      const result = await operation;
      return result;
    } finally {
      // Clean up the lock
      this.operationLocks.delete(lockKey);
    }
  }
  
  private async _performSeatAssignment(ticketId: string, seatNumber: string, ticketIdForSeat: string): Promise<{
    success: boolean;
    error?: string;
    ticket?: Ticket;
  }> {
    // Check if ticket exists
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }
    
    // Check if seat exists
    const seat = this.seats.get(seatNumber);
    if (!seat) {
      return { success: false, error: "Seat not found" };
    }
    
    // Check if seat is already occupied
    if (seat.isOccupied) {
      return { success: false, error: "Seat is already occupied" };
    }
    
    // Check if ticket already has a seat assigned
    if (ticket.seatNumber) {
      return { success: false, error: "Ticket already has a seat assigned" };
    }
    
    // Perform atomic update
    try {
      // Update seat
      const updatedSeat = { ...seat, isOccupied: true, ticketId: ticketIdForSeat };
      this.seats.set(seatNumber, updatedSeat);
      
      // Update ticket
      const updatedTicket = { 
        ...ticket, 
        seatNumber, 
        status: "assigned" as const, 
        assignedAt: new Date() 
      };
      this.tickets.set(ticketId, updatedTicket);
      
      return { success: true, ticket: updatedTicket };
    } catch (error) {
      // Rollback on error
      this.seats.set(seatNumber, seat);
      this.tickets.set(ticketId, ticket);
      return { success: false, error: "Failed to assign seat due to internal error" };
    }
  }

  async getStats() {
    const tickets = Array.from(this.tickets.values());
    const seats = Array.from(this.seats.values());
    
    return {
      totalTickets: tickets.length,
      assignedSeats: seats.filter(seat => seat.isOccupied).length,
      scannedCodes: tickets.filter(ticket => ticket.status !== 'pending').length,
      checkedIn: tickets.filter(ticket => ticket.status === 'checked-in').length
    };
  }
}

export const storage = new MemStorage();
