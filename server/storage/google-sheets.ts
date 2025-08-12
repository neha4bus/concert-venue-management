import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { type Ticket, type InsertTicket, type Seat, type InsertSeat } from "@shared/schema";
import { randomUUID } from "crypto";
import { logger } from "../utils/logger";
import type { IStorage } from "./interface";

interface GoogleSheetsConfig {
  spreadsheetId: string;
  serviceAccountEmail: string;
  privateKey: string;
  ticketsSheetName?: string;
  seatsSheetName?: string;
}

export class GoogleSheetsStorage implements IStorage {
  private sheets: any;
  private spreadsheetId: string;
  private ticketsSheetName: string;
  private seatsSheetName: string;
  private auth: JWT;

  constructor(config: GoogleSheetsConfig) {
    this.spreadsheetId = config.spreadsheetId;
    this.ticketsSheetName = config.ticketsSheetName || 'Tickets';
    this.seatsSheetName = config.seatsSheetName || 'Seats';

    // Initialize Google Auth
    this.auth = new JWT({
      email: config.serviceAccountEmail,
      key: config.privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    
    this.initializeSheets();
  }

  private async initializeSheets() {
    try {
      // Check if sheets exist, create if they don't
      await this.ensureSheetExists(this.ticketsSheetName, [
        'ID', 'Ticket ID', 'Guest Name', 'Email', 'Seat Number', 'QR Code', 
        'Status', 'Purchase Date', 'Assigned At', 'Checked In At'
      ]);

      await this.ensureSheetExists(this.seatsSheetName, [
        'ID', 'Seat Number', 'Row', 'Seat Index', 'Is Occupied', 'Ticket ID'
      ]);

      // Initialize seats if empty
      await this.initializeSeatsIfEmpty();
      
      logger.info('Google Sheets storage initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets storage', {}, error as Error);
      throw error;
    }
  }

  private async ensureSheetExists(sheetName: string, headers: string[]) {
    try {
      // Try to get the sheet
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = response.data.sheets?.find((s: any) => s.properties.title === sheetName);
      
      if (!sheet) {
        // Create the sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            }],
          },
        });

        // Add headers
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A1:${String.fromCharCode(64 + headers.length)}1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [headers],
          },
        });

        logger.info(`Created sheet: ${sheetName}`);
      }
    } catch (error) {
      logger.error(`Failed to ensure sheet exists: ${sheetName}`, {}, error as Error);
      throw error;
    }
  }

  private async initializeSeatsIfEmpty() {
    try {
      // Check if seats sheet has data
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.seatsSheetName}!A2:A2`,
      });

      if (!response.data.values || response.data.values.length === 0) {
        // Initialize seats
        const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        const seatData = [];

        for (const row of rows) {
          for (let i = 1; i <= 20; i++) {
            const seatNumber = `${row}-${i.toString().padStart(2, '0')}`;
            seatData.push([
              randomUUID(),
              seatNumber,
              row,
              i.toString().padStart(2, '0'),
              'FALSE',
              ''
            ]);
          }
        }

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${this.seatsSheetName}!A2:F${seatData.length + 1}`,
          valueInputOption: 'RAW',
          requestBody: {
            values: seatData,
          },
        });

        logger.info('Initialized seats in Google Sheets');
      }
    } catch (error) {
      logger.error('Failed to initialize seats', {}, error as Error);
    }
  }

  // Ticket operations
  async getTicket(id: string): Promise<Ticket | undefined> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.ticketsSheetName}!A:J`,
      });

      const rows = response.data.values || [];
      const ticketRow = rows.find((row: any[]) => row[0] === id);
      
      if (!ticketRow) return undefined;

      return this.rowToTicket(ticketRow);
    } catch (error) {
      logger.error('Failed to get ticket', { id }, error as Error);
      throw error;
    }
  }

  async getTicketByTicketId(ticketId: string): Promise<Ticket | undefined> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.ticketsSheetName}!A:J`,
      });

      const rows = response.data.values || [];
      const ticketRow = rows.find((row: any[]) => row[1] === ticketId);
      
      if (!ticketRow) return undefined;

      return this.rowToTicket(ticketRow);
    } catch (error) {
      logger.error('Failed to get ticket by ticket ID', { ticketId }, error as Error);
      throw error;
    }
  }

  async getTicketByQRCode(qrCode: string): Promise<Ticket | undefined> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.ticketsSheetName}!A:J`,
      });

      const rows = response.data.values || [];
      const ticketRow = rows.find((row: any[]) => row[5] === qrCode);
      
      if (!ticketRow) return undefined;

      return this.rowToTicket(ticketRow);
    } catch (error) {
      logger.error('Failed to get ticket by QR code', {}, error as Error);
      throw error;
    }
  }

  async getAllTickets(): Promise<Ticket[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.ticketsSheetName}!A2:J`,
      });

      const rows = response.data.values || [];
      return rows.map((row: any[]) => this.rowToTicket(row));
    } catch (error) {
      logger.error('Failed to get all tickets', {}, error as Error);
      throw error;
    }
  }

  async getTicketsPaginated(page: number, limit: number, filters?: { search?: string; status?: string }): Promise<{
    tickets: Ticket[];
    total: number;
  }> {
    const allTickets = await this.getAllTickets();
    
    // Apply filters
    let filteredTickets = allTickets;
    
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.guestName.toLowerCase().includes(searchLower) ||
        ticket.email.toLowerCase().includes(searchLower) ||
        ticket.ticketId.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters?.status && filters.status !== 'all') {
      filteredTickets = filteredTickets.filter(ticket => ticket.status === filters.status);
    }
    
    // Sort by creation date (newest first)
    filteredTickets.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
    
    const total = filteredTickets.length;
    const startIndex = (page - 1) * limit;
    const paginatedTickets = filteredTickets.slice(startIndex, startIndex + limit);
    
    return {
      tickets: paginatedTickets,
      total
    };
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    try {
      const id = randomUUID();
      const newTicket: Ticket = {
        ...ticket,
        id,
        status: ticket.status || "pending",
        seatNumber: ticket.seatNumber || null,
        purchaseDate: new Date(),
        assignedAt: null,
        checkedInAt: null
      };

      const row = this.ticketToRow(newTicket);
      
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.ticketsSheetName}!A:J`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [row],
        },
      });

      logger.info('Created ticket in Google Sheets', { ticketId: newTicket.ticketId });
      return newTicket;
    } catch (error) {
      logger.error('Failed to create ticket', { ticket }, error as Error);
      throw error;
    }
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket> {
    try {
      // Get current ticket
      const currentTicket = await this.getTicket(id);
      if (!currentTicket) {
        throw new Error('Ticket not found');
      }

      const updatedTicket = { ...currentTicket, ...updates };

      // Find the row index
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.ticketsSheetName}!A:J`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row: any[]) => row[0] === id);
      
      if (rowIndex === -1) {
        throw new Error('Ticket not found in sheet');
      }

      const row = this.ticketToRow(updatedTicket);
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.ticketsSheetName}!A${rowIndex + 1}:J${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [row],
        },
      });

      logger.info('Updated ticket in Google Sheets', { ticketId: updatedTicket.ticketId });
      return updatedTicket;
    } catch (error) {
      logger.error('Failed to update ticket', { id, updates }, error as Error);
      throw error;
    }
  }

  // Seat operations
  async getAllSeats(): Promise<Seat[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.seatsSheetName}!A2:F`,
      });

      const rows = response.data.values || [];
      return rows.map((row: any[]) => this.rowToSeat(row));
    } catch (error) {
      logger.error('Failed to get all seats', {}, error as Error);
      throw error;
    }
  }

  async getSeat(seatNumber: string): Promise<Seat | undefined> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.seatsSheetName}!A:F`,
      });

      const rows = response.data.values || [];
      const seatRow = rows.find((row: any[]) => row[1] === seatNumber);
      
      if (!seatRow) return undefined;

      return this.rowToSeat(seatRow);
    } catch (error) {
      logger.error('Failed to get seat', { seatNumber }, error as Error);
      throw error;
    }
  }

  async createSeat(seat: InsertSeat): Promise<Seat> {
    try {
      const id = randomUUID();
      const newSeat: Seat = { 
        ...seat, 
        id,
        isOccupied: seat.isOccupied || false,
        ticketId: seat.ticketId || null
      };

      const row = this.seatToRow(newSeat);
      
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.seatsSheetName}!A:F`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [row],
        },
      });

      return newSeat;
    } catch (error) {
      logger.error('Failed to create seat', { seat }, error as Error);
      throw error;
    }
  }

  async updateSeat(seatNumber: string, updates: Partial<Seat>): Promise<Seat> {
    try {
      // Get current seat
      const currentSeat = await this.getSeat(seatNumber);
      if (!currentSeat) {
        throw new Error('Seat not found');
      }

      const updatedSeat = { ...currentSeat, ...updates };

      // Find the row index
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.seatsSheetName}!A:F`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row: any[]) => row[1] === seatNumber);
      
      if (rowIndex === -1) {
        throw new Error('Seat not found in sheet');
      }

      const row = this.seatToRow(updatedSeat);
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.seatsSheetName}!A${rowIndex + 1}:F${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [row],
        },
      });

      return updatedSeat;
    } catch (error) {
      logger.error('Failed to update seat', { seatNumber, updates }, error as Error);
      throw error;
    }
  }

  // Atomic seat assignment
  async assignSeatAtomically(ticketId: string, seatNumber: string, ticketIdForSeat: string): Promise<{
    success: boolean;
    error?: string;
    ticket?: Ticket;
  }> {
    try {
      // Get ticket and seat
      const ticket = await this.getTicket(ticketId);
      const seat = await this.getSeat(seatNumber);

      if (!ticket) {
        return { success: false, error: "Ticket not found" };
      }

      if (!seat) {
        return { success: false, error: "Seat not found" };
      }

      if (seat.isOccupied) {
        return { success: false, error: "Seat is already occupied" };
      }

      if (ticket.seatNumber) {
        return { success: false, error: "Ticket already has a seat assigned" };
      }

      // Update seat
      await this.updateSeat(seatNumber, {
        isOccupied: true,
        ticketId: ticketIdForSeat
      });

      // Update ticket
      const updatedTicket = await this.updateTicket(ticketId, {
        seatNumber,
        status: "assigned",
        assignedAt: new Date()
      });

      return { success: true, ticket: updatedTicket };
    } catch (error) {
      logger.error('Failed to assign seat atomically', { ticketId, seatNumber }, error as Error);
      return { success: false, error: "Failed to assign seat due to internal error" };
    }
  }

  async getStats() {
    try {
      const [tickets, seats] = await Promise.all([
        this.getAllTickets(),
        this.getAllSeats()
      ]);
      
      return {
        totalTickets: tickets.length,
        assignedSeats: seats.filter(seat => seat.isOccupied).length,
        scannedCodes: tickets.filter(ticket => ticket.status !== 'pending').length,
        checkedIn: tickets.filter(ticket => ticket.status === 'checked-in').length
      };
    } catch (error) {
      logger.error('Failed to get stats', {}, error as Error);
      throw error;
    }
  }

  // Helper methods
  private rowToTicket(row: any[]): Ticket {
    return {
      id: row[0] || '',
      ticketId: row[1] || '',
      guestName: row[2] || '',
      email: row[3] || '',
      seatNumber: row[4] || null,
      qrCode: row[5] || '',
      status: row[6] || 'pending',
      purchaseDate: row[7] ? new Date(row[7]) : new Date(),
      assignedAt: row[8] ? new Date(row[8]) : null,
      checkedInAt: row[9] ? new Date(row[9]) : null,
    };
  }

  private ticketToRow(ticket: Ticket): any[] {
    return [
      ticket.id,
      ticket.ticketId,
      ticket.guestName,
      ticket.email,
      ticket.seatNumber || '',
      ticket.qrCode,
      ticket.status,
      ticket.purchaseDate.toISOString(),
      ticket.assignedAt ? ticket.assignedAt.toISOString() : '',
      ticket.checkedInAt ? ticket.checkedInAt.toISOString() : '',
    ];
  }

  private rowToSeat(row: any[]): Seat {
    return {
      id: row[0] || '',
      seatNumber: row[1] || '',
      row: row[2] || '',
      seatIndex: row[3] || '',
      isOccupied: row[4] === 'TRUE' || row[4] === true,
      ticketId: row[5] || null,
    };
  }

  private seatToRow(seat: Seat): any[] {
    return [
      seat.id,
      seat.seatNumber,
      seat.row,
      seat.seatIndex,
      seat.isOccupied ? 'TRUE' : 'FALSE',
      seat.ticketId || '',
    ];
  }
}