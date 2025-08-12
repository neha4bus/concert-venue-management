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
        errors: [] as Array<{ row: number; error: string; data: any }>
      };

      // Process each record
      for (let i = 0; i < records.length; i++) {
        try {
          const record = records[i] as { guestName?: string; email?: string; [key: string]: any };
          
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
          
          // Create ticket
          await storage.createTicket({
            guestName: record.guestName.trim(),
            email: record.email.trim(),
            ticketId,
            qrCode,
            status: "pending",
            seatNumber: null
          });

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

  const httpServer = createServer(app);
  return httpServer;
}
