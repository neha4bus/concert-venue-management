import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage/index";
import { createTicketSchema } from "@shared/schema";
import { generateQRCode } from "./utils/qr-generator";
import { z } from "zod";
import { parse } from "csv-parse/sync";
import { logger } from "./utils/logger";
import { asyncHandler, ValidationError, NotFoundError, ConflictError } from "./utils/errors";

// Security: CSV sanitization function
function sanitizeCSVData(csvData: string): string {
  // Remove potential CSV injection payloads
  return csvData
    .split('\n')
    .map(line => {
      // Remove lines that start with dangerous characters
      if (line.trim().match(/^[=+\-@]/)) {
        return line.replace(/^[=+\-@]+/, '');
      }
      return line;
    })
    .join('\n')
    .trim();
}

// Security: Validate Google Sheets URL
function validateGoogleSheetsUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Must be from Google Docs domain
    if (!parsedUrl.hostname.endsWith('docs.google.com')) {
      return false;
    }
    
    // Must be a spreadsheets URL
    if (!parsedUrl.pathname.includes('/spreadsheets/d/')) {
      return false;
    }
    
    // Must have a valid spreadsheet ID pattern
    const spreadsheetIdMatch = parsedUrl.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!spreadsheetIdMatch || spreadsheetIdMatch[1].length < 10) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// Security: Convert Google Sheets URL to CSV export URL safely
function convertToCSVUrl(googleSheetUrl: string): string {
  const url = new URL(googleSheetUrl);
  const spreadsheetIdMatch = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  
  if (!spreadsheetIdMatch) {
    throw new Error('Invalid Google Sheets URL format');
  }
  
  const spreadsheetId = spreadsheetIdMatch[1];
  
  // Extract gid if present
  let gid = '0'; // default sheet
  const gidMatch = url.hash.match(/gid=([0-9]+)/) || url.search.match(/gid=([0-9]+)/);
  if (gidMatch) {
    gid = gidMatch[1];
  }
  
  // Construct safe CSV export URL
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

// Security: Simple rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security: Rate limiting middleware
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: any, res: any, next: any) => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    Array.from(rateLimitStore.entries()).forEach(([key, value]) => {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    });
    
    const clientData = rateLimitStore.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      // First request or window expired
      rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs });
      next();
    } else if (clientData.count < maxRequests) {
      // Within limit
      clientData.count++;
      next();
    } else {
      // Rate limit exceeded
      res.status(429).json({ 
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all tickets with pagination
  app.get("/api/tickets", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const search = (req.query.search as string) || '';
      const status = (req.query.status as string) || '';
      
      const allTickets = await storage.getAllTickets();
      
      // Filter tickets based on search and status
      let filteredTickets = allTickets;
      
      if (search) {
        const searchLower = search.toLowerCase();
        filteredTickets = filteredTickets.filter(ticket => 
          ticket.guestName.toLowerCase().includes(searchLower) ||
          ticket.email.toLowerCase().includes(searchLower) ||
          ticket.ticketId.toLowerCase().includes(searchLower)
        );
      }
      
      if (status && status !== 'all') {
        filteredTickets = filteredTickets.filter(ticket => ticket.status === status);
      }
      
      // Sort by creation date (newest first)
      filteredTickets.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
      
      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTickets = filteredTickets.slice(startIndex, endIndex);
      
      res.json({
        tickets: paginatedTickets,
        pagination: {
          page,
          limit,
          total: filteredTickets.length,
          totalPages: Math.ceil(filteredTickets.length / limit),
          hasNext: endIndex < filteredTickets.length,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      logger.error('Failed to fetch tickets', { query: req.query }, error as Error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // Create new ticket
  app.post("/api/tickets", rateLimit(10, 60000), async (req, res) => { // Rate limit: 10 tickets per minute
    try {
      // Debug: Log the incoming request body
      logger.info('Incoming ticket creation request', { body: req.body });
      
      const ticketData = createTicketSchema.parse(req.body);
      
      // Security: Additional validation
      if (!ticketData.guestName || ticketData.guestName.trim().length === 0) {
        return res.status(400).json({ message: "Guest name is required" });
      }
      
      if (!ticketData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ticketData.email)) {
        return res.status(400).json({ message: "Valid email address is required" });
      }
      
      // Security: Sanitize input
      const sanitizedData = {
        ...ticketData,
        guestName: ticketData.guestName.trim().substring(0, 100), // Limit length
        email: ticketData.email.trim().toLowerCase().substring(0, 255) // Limit length and normalize
      };
      
      // Generate unique ticket ID
      const ticketId = `TKT-2024-${String(Date.now()).slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      // Generate QR code
      const qrCode = await generateQRCode(ticketId);
      
      const ticket = await storage.createTicket({
        ...sanitizedData,
        ticketId,
        qrCode
      });
      
      res.json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid ticket data", errors: error.errors });
      } else {
        logger.error('Ticket creation error', { body: req.body }, error as Error);
        res.status(500).json({ message: "Failed to create ticket" });
      }
    }
  });

  // Scan QR code (validate ticket)
  app.post("/api/tickets/scan", rateLimit(30, 60000), async (req, res) => { // Rate limit: 30 scans per minute
    try {
      const { qrData } = req.body;
      
      if (!qrData || typeof qrData !== 'string') {
        return res.status(400).json({ message: "Valid QR data is required" });
      }

      // Security: Sanitize and validate QR data
      const sanitizedQrData = qrData.trim().substring(0, 500); // Limit length
      
      if (sanitizedQrData.length === 0) {
        return res.status(400).json({ message: "QR data cannot be empty" });
      }

      // Try to find ticket by QR code first
      let ticket = await storage.getTicketByQRCode(sanitizedQrData);
      
      // If not found by QR code, try by ticket ID (only if it looks like a ticket ID)
      if (!ticket && /^TKT-\d{4}-\d{6}-\d{3}$/.test(sanitizedQrData)) {
        ticket = await storage.getTicketByTicketId(sanitizedQrData);
      }

      if (!ticket) {
        return res.status(404).json({ message: "Invalid QR code or ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      logger.error('QR scan error', { qrData: req.body.qrData }, error as Error);
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

      // Security: Validate seat number format
      if (!/^[A-J]-([01][0-9]|20)$/.test(seatNumber)) {
        return res.status(400).json({ message: "Invalid seat number format. Use format like A-01 to J-20" });
      }

      const ticket = await storage.getTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Security: Atomic seat assignment to prevent race conditions
      const result = await storage.assignSeatAtomically(id, seatNumber, ticket.ticketId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json(result.ticket);
    } catch (error) {
      logger.error('Seat assignment error', { ticketId: req.params.id, seatNumber: req.body.seatNumber }, error as Error);
      res.status(500).json({ message: "Failed to assign seat" });
    }
  });

  // Check in ticket
  app.post("/api/tickets/:id/checkin", rateLimit(20, 60000), async (req, res) => { // Rate limit: 20 checkins per minute
    try {
      const { id } = req.params;
      
      // Security: Validate ticket ID format
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({ message: "Valid ticket ID is required" });
      }
      
      const sanitizedId = id.trim();
      
      const ticket = await storage.getTicket(sanitizedId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      if (ticket.status === "checked-in") {
        return res.status(400).json({ message: "Ticket already checked in" });
      }

      if (ticket.status === "pending") {
        return res.status(400).json({ message: "Cannot check in ticket without assigned seat" });
      }

      const updatedTicket = await storage.updateTicket(sanitizedId, {
        status: "checked-in",
        checkedInAt: new Date()
      });

      res.json(updatedTicket);
    } catch (error) {
      logger.error('Check-in error', { ticketId: req.params.id }, error as Error);
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
  app.post("/api/tickets/import", rateLimit(5, 60000), async (req, res) => { // Rate limit: 5 requests per minute
    try {
      const { csvData, googleSheetUrl } = req.body;
      let importData = csvData;

      // Security: Validate input parameters
      if (!csvData && !googleSheetUrl) {
        return res.status(400).json({ message: "Either csvData or googleSheetUrl must be provided" });
      }

      if (csvData && googleSheetUrl) {
        return res.status(400).json({ message: "Provide either csvData or googleSheetUrl, not both" });
      }

      // If Google Sheets URL is provided, fetch the CSV data
      if (googleSheetUrl && !csvData) {
        try {
          // Security: Validate Google Sheets URL
          if (!validateGoogleSheetsUrl(googleSheetUrl)) {
            return res.status(400).json({ 
              message: "Invalid Google Sheets URL. Must be a valid Google Sheets document URL." 
            });
          }

          // Security: Convert to safe CSV export URL
          const csvUrl = convertToCSVUrl(googleSheetUrl);

          const fetch = (await import('node-fetch')).default;
          const response = await fetch(csvUrl, {
            headers: {
              'User-Agent': 'Concert-Venue-Manager/1.0'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch Google Sheets data: ${response.statusText}`);
          }
          
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('text/csv')) {
            throw new Error('Response is not CSV format');
          }
          
          importData = await response.text();
          
          // Security: Limit file size (1MB max)
          if (importData.length > 1024 * 1024) {
            return res.status(400).json({ 
              message: "CSV data too large. Maximum size is 1MB." 
            });
          }
          
        } catch (fetchError) {
          return res.status(400).json({ 
            message: "Failed to fetch Google Sheets data. Please ensure the sheet is publicly accessible and properly formatted.",
            error: fetchError instanceof Error ? fetchError.message : "Unknown error"
          });
        }
      }

      if (!importData || typeof importData !== 'string') {
        return res.status(400).json({ message: "Invalid or empty CSV data provided" });
      }

      // Security: Sanitize CSV data
      importData = sanitizeCSVData(importData);

      // Security: Limit number of lines (1000 max)
      const lineCount = importData.split('\n').length;
      if (lineCount > 1000) {
        return res.status(400).json({ 
          message: "Too many rows in CSV. Maximum is 1000 rows." 
        });
      }

      // Parse CSV data with security options
      const records = parse(importData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        max_record_size: 1024, // Limit record size
        relax_quotes: false, // Strict quote handling
        escape: '"' // Proper escape handling
      });

      const results = {
        imported: 0,
        seatsAssigned: 0,
        errors: [] as Array<{ row: number; error: string; data: any }>
      };

      // Get all seats to validate manual seat assignments
      const allSeats = await storage.getAllSeats();
      const seatMap = new Map(allSeats.map(seat => [seat.seatNumber, seat]));

      // Security: Validate CSV structure
      if (records.length === 0) {
        return res.status(400).json({ message: "CSV file is empty or has no valid records" });
      }

      // Security: Check required columns exist
      const firstRecord = records[0] as any;
      if (!firstRecord.hasOwnProperty('guestName') || !firstRecord.hasOwnProperty('email')) {
        return res.status(400).json({ 
          message: "CSV must contain 'guestName' and 'email' columns" 
        });
      }

      // Process each record
      for (let i = 0; i < records.length; i++) {
        try {
          const record = records[i] as { guestName?: string; email?: string; seatNumber?: string; [key: string]: any };
          
          // Security: Validate and sanitize required fields
          if (!record.guestName || typeof record.guestName !== 'string' || record.guestName.trim().length === 0) {
            results.errors.push({
              row: i + 2, // +2 because CSV rows start from 1 and we have header
              error: "Missing or invalid guestName",
              data: record
            });
            continue;
          }
          
          if (!record.email || typeof record.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email.trim())) {
            results.errors.push({
              row: i + 2,
              error: "Missing or invalid email address",
              data: record
            });
            continue;
          }

          // Security: Sanitize input data
          const sanitizedGuestName = record.guestName.trim().substring(0, 100);
          const sanitizedEmail = record.email.trim().toLowerCase().substring(0, 255);

          // Generate unique ticket ID
          const ticketId = `TKT-2024-${String(Date.now()).slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
          
          // Generate QR code
          const qrCode = await generateQRCode(ticketId);
          
          // Determine seat assignment from CSV data
          let seatNumber = null;
          let status = "pending";
          
          if (record.seatNumber && typeof record.seatNumber === 'string' && record.seatNumber.trim()) {
            const requestedSeat = record.seatNumber.trim().toUpperCase();
            
            // Security: Validate seat number format
            if (!/^[A-J]-([01][0-9]|20)$/.test(requestedSeat)) {
              results.errors.push({
                row: i + 2,
                error: `Invalid seat number format: ${requestedSeat}. Use format like A-01 to J-20`,
                data: record
              });
              continue;
            }
            
            const seat = seatMap.get(requestedSeat);
            
            if (!seat) {
              results.errors.push({
                row: i + 2,
                error: `Seat not found: ${requestedSeat}`,
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
            guestName: sanitizedGuestName,
            email: sanitizedEmail,
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
  app.post("/api/tickets/bulk-assign-seats", rateLimit(2, 300000), async (req, res) => { // Rate limit: 2 requests per 5 minutes
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
