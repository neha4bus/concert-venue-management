import { MemStorage } from "../storage";
import { GoogleSheetsStorage } from "./google-sheets";
import type { IStorage } from "./interface";
import { logger } from "../utils/logger";

export function createStorage(): IStorage {
  const storageType = process.env.STORAGE_TYPE || 'memory';
  
  switch (storageType) {
    case 'google-sheets':
      return createGoogleSheetsStorage();
    case 'memory':
    default:
      logger.info('Using in-memory storage');
      return new MemStorage();
  }
}

function createGoogleSheetsStorage(): GoogleSheetsStorage {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!spreadsheetId || !serviceAccountEmail || !privateKey) {
    throw new Error(
      'Google Sheets storage requires GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY environment variables'
    );
  }

  logger.info('Using Google Sheets storage', { spreadsheetId });
  
  return new GoogleSheetsStorage({
    spreadsheetId,
    serviceAccountEmail,
    privateKey,
    ticketsSheetName: process.env.TICKETS_SHEET_NAME || 'Tickets',
    seatsSheetName: process.env.SEATS_SHEET_NAME || 'Seats',
  });
}

// Export the storage instance
export const storage = createStorage();