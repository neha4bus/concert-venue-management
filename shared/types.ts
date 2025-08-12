// Comprehensive type definitions for the application

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface PaginatedResponse<T> {
  tickets: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ImportResult {
  imported: number;
  seatsAssigned: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}

export interface BulkAssignResult {
  message: string;
  assigned: number;
  remaining: number;
}

export interface SeatAssignmentResult {
  success: boolean;
  error?: string;
  ticket?: import('./schema').Ticket;
}

export interface StatsData {
  totalTickets: number;
  assignedSeats: number;
  scannedCodes: number;
  checkedIn: number;
}

// Form types
export interface CreateTicketForm {
  guestName: string;
  email: string;
}

export interface ImportTicketsForm {
  csvData?: string;
  googleSheetUrl?: string;
  importMethod: 'csv' | 'url';
}

// Component prop types
export interface ModalProps {
  open: boolean;
  onClose: () => void;
}

export interface TicketActionProps {
  ticket: import('./schema').Ticket;
  onAssignSeat: (ticket: import('./schema').Ticket) => void;
  onViewTicket: (ticket: import('./schema').Ticket) => void;
}

// API endpoint types
export type TicketStatus = 'pending' | 'assigned' | 'checked-in';

export interface TicketFilters {
  search?: string;
  status?: TicketStatus | 'all';
  page?: number;
  limit?: number;
}

// Error types
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code?: string;
}

export interface ApiError {
  message: string;
  status: number;
  details?: ValidationErrorDetail[];
  stack?: string;
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Venue configuration types (for future extensibility)
export interface VenueConfig {
  name: string;
  rows: string[];
  seatsPerRow: number;
  seatNumberFormat: string; // e.g., "{row}-{seat:02d}"
}

export interface SeatLayout {
  rows: Array<{
    id: string;
    label: string;
    seats: Array<{
      id: string;
      number: string;
      isAvailable: boolean;
      isSelected?: boolean;
    }>;
  }>;
}