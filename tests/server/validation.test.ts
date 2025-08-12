// Validation utility tests

import { describe, it, expect } from 'vitest';
import { 
  validateSeatNumber, 
  validateEmail, 
  validateTicketId,
  sanitizeString,
  sanitizeEmail,
  sanitizeCSVField
} from '../../shared/validation';

describe('Validation Utilities', () => {
  describe('validateSeatNumber', () => {
    it('should validate correct seat numbers', () => {
      expect(validateSeatNumber('A-01')).toBe(true);
      expect(validateSeatNumber('J-20')).toBe(true);
      expect(validateSeatNumber('E-15')).toBe(true);
    });

    it('should reject invalid seat numbers', () => {
      expect(validateSeatNumber('K-01')).toBe(false); // Invalid row
      expect(validateSeatNumber('A-21')).toBe(false); // Invalid seat number
      expect(validateSeatNumber('A-00')).toBe(false); // Invalid seat number
      expect(validateSeatNumber('A1')).toBe(false);   // Wrong format
      expect(validateSeatNumber('')).toBe(false);     // Empty
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('test+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validateTicketId', () => {
    it('should validate correct ticket IDs', () => {
      expect(validateTicketId('TKT-2024-123456-001')).toBe(true);
      expect(validateTicketId('TKT-2024-999999-999')).toBe(true);
    });

    it('should reject invalid ticket IDs', () => {
      expect(validateTicketId('TKT-24-123456-001')).toBe(false);   // Wrong year format
      expect(validateTicketId('TKT-2024-12345-001')).toBe(false);  // Wrong timestamp format
      expect(validateTicketId('TKT-2024-123456-1')).toBe(false);   // Wrong sequence format
      expect(validateTicketId('TICKET-2024-123456-001')).toBe(false); // Wrong prefix
      expect(validateTicketId('')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should trim and limit string length', () => {
      expect(sanitizeString('  hello  ', 10)).toBe('hello');
      expect(sanitizeString('very long string', 5)).toBe('very ');
      expect(sanitizeString('normal', 100)).toBe('normal');
    });
  });

  describe('sanitizeEmail', () => {
    it('should normalize email addresses', () => {
      expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
      expect(sanitizeEmail('User@Domain.Org')).toBe('user@domain.org');
    });
  });

  describe('sanitizeCSVField', () => {
    it('should remove CSV injection characters', () => {
      expect(sanitizeCSVField('=cmd')).toBe('cmd');
      expect(sanitizeCSVField('+cmd')).toBe('cmd');
      expect(sanitizeCSVField('-cmd')).toBe('cmd');
      expect(sanitizeCSVField('@cmd')).toBe('cmd');
      expect(sanitizeCSVField('normal text')).toBe('normal text');
    });
  });
});