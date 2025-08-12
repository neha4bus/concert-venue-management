// Test setup and utilities

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Mock environment variables for tests
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'ERROR'; // Reduce log noise in tests
});

// Clean up after all tests
afterAll(() => {
  // Cleanup code here
});

// Reset state before each test
beforeEach(() => {
  // Reset any global state
});

// Cleanup after each test
afterEach(() => {
  // Cleanup code here
});

// Test utilities
export function createMockTicket(overrides = {}) {
  return {
    id: 'test-id',
    ticketId: 'TKT-2024-123456-001',
    guestName: 'Test User',
    email: 'test@example.com',
    seatNumber: null,
    qrCode: 'data:image/png;base64,test',
    status: 'pending',
    purchaseDate: new Date(),
    assignedAt: null,
    checkedInAt: null,
    ...overrides
  };
}

export function createMockSeat(overrides = {}) {
  return {
    id: 'test-seat-id',
    seatNumber: 'A-01',
    row: 'A',
    seatIndex: '01',
    isOccupied: false,
    ticketId: null,
    ...overrides
  };
}

export function createMockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    ...overrides
  };
}

export function createMockResponse() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis()
  };
  return res;
}