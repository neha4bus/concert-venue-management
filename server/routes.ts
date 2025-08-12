import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTicketSchema } from "@shared/schema";
import QRCode from "qrcode";
import { z } from "zod";
import { parse } from "csv-parse/sync";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all tickets
  app.get("/api/tickets", async (req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // Create new ticket
  app.post("/api/tickets", async (req, res) => {
    try {
      const ticketData = insertTicketSchema.parse(req.body);
      
      // Generate unique ticket ID
      const ticketId = `TKT-2024-${String(Date.now()).slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      // Generate QR code
      const qrCode = await QRCode.toDataURL(ticketId);
      
      const ticket = await storage.createTicket({
        ...ticketData,
        ticketId,
        qrCode
      });
      
      res.json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid ticket data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create ticket" });
      }
    }
  });

  // Scan QR code (validate ticket)
  app.post("/api/tickets/scan", async (req, res) => {
    try {
      const { qrData } = req.body;
      
      if (!qrData) {
        return res.status(400).json({ message: "QR data is required" });
      }

      // Try to find ticket by QR code first
      let ticket = await storage.getTicketByQRCode(qrData);
      
      // If not found by QR code, try by ticket ID
      if (!ticket) {
        ticket = await storage.getTicketByTicketId(qrData);
      }

      if (!ticket) {
        return res.status(404).json({ message: "Invalid QR code or ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: "Failed to scan QR code" });
    }
  });

  // Assign seat to ticket
  app.post("/api/tickets/:id/assign-seat", async (req, res) => {
    try {
      const { id } = req.params;
      const { seatNumber } = req.body;

      if (!seatNumber) {
        return res.status(400).json({ message: "Seat number is required" });
      }

      const ticket = await storage.getTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const seat = await storage.getSeat(seatNumber);
      if (!seat) {
        return res.status(404).json({ message: "Seat not found" });
      }

      if (seat.isOccupied) {
        return res.status(400).json({ message: "Seat is already occupied" });
      }

      // Update seat
      await storage.updateSeat(seatNumber, {
        isOccupied: true,
        ticketId: ticket.ticketId
      });

      // Update ticket
      const updatedTicket = await storage.updateTicket(id, {
        seatNumber,
        status: "assigned",
        assignedAt: new Date()
      });

      res.json(updatedTicket);
    } catch (error) {
      res.status(500).json({ message: "Failed to assign seat" });
    }
  });

  // Check in ticket
  app.post("/api/tickets/:id/checkin", async (req, res) => {
    try {
      const { id } = req.params;
      
      const ticket = await storage.getTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      if (ticket.status === "checked-in") {
        return res.status(400).json({ message: "Ticket already checked in" });
      }

      const updatedTicket = await storage.updateTicket(id, {
        status: "checked-in",
        checkedInAt: new Date()
      });

      res.json(updatedTicket);
    } catch (error) {
      res.status(500).json({ message: "Failed to check in ticket" });
    }
  });

  // Get all seats
  app.get("/api/seats", async (req, res) => {
    try {
      const seats = await storage.getAllSeats();
      res.json(seats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch seats" });
    }
  });

  // Get stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Import tickets from CSV or Google Sheets
  app.post("/api/tickets/import", async (req, res) => {
    try {
      const { csvData, googleSheetUrl } = req.body;
      let importData = csvData;

      // If Google Sheets URL is provided, fetch the CSV data
      if (googleSheetUrl && !csvData) {
        try {
          // Convert Google Sheets URL to CSV export URL
          let csvUrl = googleSheetUrl;
          if (googleSheetUrl.includes('/edit')) {
            csvUrl = googleSheetUrl.replace('/edit#gid=', '/export?format=csv&gid=').replace('/edit?usp=sharing', '/export?format=csv');
            if (!csvUrl.includes('export')) {
              csvUrl = googleSheetUrl.replace('/edit', '/export?format=csv');
            }
          }

          const fetch = (await import('node-fetch')).default;
          const response = await fetch(csvUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch Google Sheets data: ${response.statusText}`);
          }
          importData = await response.text();
        } catch (fetchError) {
          return res.status(400).json({ 
            message: "Failed to fetch Google Sheets data. Please ensure the sheet is publicly accessible.",
            error: fetchError instanceof Error ? fetchError.message : "Unknown error"
          });
        }
      }

      if (!importData) {
        return res.status(400).json({ message: "No data provided for import" });
      }

      // Parse CSV data
      const records = parse(importData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      const results = {
        imported: 0,
        seatsAssigned: 0,
        errors: [] as Array<{ row: number; error: string; data: any }>
      };

      // Get all seats to validate manual seat assignments
      const allSeats = await storage.getAllSeats();
      const seatMap = new Map(allSeats.map(seat => [seat.seatNumber, seat]));

      // Process each record
      for (let i = 0; i < records.length; i++) {
        try {
          const record = records[i] as { guestName?: string; email?: string; seatNumber?: string; [key: string]: any };
          
          // Validate required fields
          if (!record.guestName || !record.email) {
            results.errors.push({
              row: i + 2, // +2 because CSV rows start from 1 and we have header
              error: "Missing required fields (guestName, email)",
              data: record
            });
            continue;
          }

          // Generate unique ticket ID
          const ticketId = `TKT-2024-${String(Date.now()).slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
          
          // Generate QR code
          const qrCode = await QRCode.toDataURL(ticketId);
          
          // Determine seat assignment from CSV data
          let seatNumber = null;
          let status = "pending";
          
          if (record.seatNumber && record.seatNumber.trim()) {
            const requestedSeat = record.seatNumber.trim();
            const seat = seatMap.get(requestedSeat);
            
            if (!seat) {
              results.errors.push({
                row: i + 2,
                error: `Invalid seat number: ${requestedSeat}`,
                data: record
              });
              continue;
            }
            
            if (seat.isOccupied) {
              results.errors.push({
                row: i + 2,
                error: `Seat ${requestedSeat} is already occupied`,
                data: record
              });
              continue;
            }
            
            seatNumber = requestedSeat;
            status = "assigned";
            
            // Update the seat as occupied
            await storage.updateSeat(seatNumber, {
              isOccupied: true,
              ticketId
            });
            
            results.seatsAssigned++;
          }
          
          // Create ticket
          const ticket = await storage.createTicket({
            guestName: record.guestName.trim(),
            email: record.email.trim(),
            ticketId,
            qrCode,
            status,
            seatNumber
          });

          // If seat was assigned, update ticket with assignment timestamp
          if (seatNumber) {
            await storage.updateTicket(ticket.id, {
              assignedAt: new Date()
            });
          }

          results.imported++;
        } catch (error) {
          results.errors.push({
            row: i + 2,
            error: error instanceof Error ? error.message : "Unknown error",
            data: records[i]
          });
        }
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to import tickets",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Bulk assign seats to all unassigned tickets
  app.post("/api/tickets/bulk-assign-seats", async (req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      const unassignedTickets = tickets.filter(ticket => ticket.status === "pending");
      
      if (unassignedTickets.length === 0) {
        return res.json({ message: "No unassigned tickets found", assigned: 0 });
      }

      const allSeats = await storage.getAllSeats();
      const availableSeats = allSeats
        .filter(seat => !seat.isOccupied)
        .map(seat => seat.seatNumber)
        .sort();

      if (availableSeats.length === 0) {
        return res.status(400).json({ message: "No available seats" });
      }

      let assigned = 0;
      const maxAssignments = Math.min(unassignedTickets.length, availableSeats.length);

      for (let i = 0; i < maxAssignments; i++) {
        const ticket = unassignedTickets[i];
        const seatNumber = availableSeats[i];

        // Update seat
        await storage.updateSeat(seatNumber, {
          isOccupied: true,
          ticketId: ticket.ticketId
        });

        // Update ticket
        await storage.updateTicket(ticket.id, {
          seatNumber,
          status: "assigned",
          assignedAt: new Date()
        });

        assigned++;
      }

      res.json({ 
        message: `Successfully assigned ${assigned} seats`,
        assigned,
        remaining: unassignedTickets.length - assigned
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to bulk assign seats",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
