import { type Ticket, type InsertTicket, type Seat, type InsertSeat } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Ticket operations
  getTicket(id: string): Promise<Ticket | undefined>;
  getTicketByTicketId(ticketId: string): Promise<Ticket | undefined>;
  getTicketByQRCode(qrCode: string): Promise<Ticket | undefined>;
  getAllTickets(): Promise<Ticket[]>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket>;
  
  // Seat operations
  getAllSeats(): Promise<Seat[]>;
  getSeat(seatNumber: string): Promise<Seat | undefined>;
  createSeat(seat: InsertSeat): Promise<Seat>;
  updateSeat(seatNumber: string, updates: Partial<Seat>): Promise<Seat>;
  
  // Statistics
  getStats(): Promise<{
    totalTickets: number;
    assignedSeats: number;
    scannedCodes: number;
    checkedIn: number;
  }>;
}

export class MemStorage implements IStorage {
  private tickets: Map<string, Ticket> = new Map();
  private seats: Map<string, Seat> = new Map();

  constructor() {
    this.initializeSeats();
  }

  private initializeSeats() {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    rows.forEach(row => {
      for (let i = 1; i <= 20; i++) {
        const seatNumber = `${row}-${i.toString().padStart(2, '0')}`;
        const seat: Seat = {
          id: randomUUID(),
          seatNumber,
          row,
          seatIndex: i.toString().padStart(2, '0'),
          isOccupied: false,
          ticketId: null
        };
        this.seats.set(seatNumber, seat);
      }
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
