import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTicketSchema } from "@shared/schema";
import QRCode from "qrcode";
import { z } from "zod";

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

  const httpServer = createServer(app);
  return httpServer;
}
