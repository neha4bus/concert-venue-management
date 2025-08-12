import dotenv from 'dotenv';
import { storage } from './server/storage/index.js';

dotenv.config();

async function testCreateTicket() {
  try {
    console.log('Testing ticket creation...');
    console.log('Storage type:', process.env.STORAGE_TYPE);
    
    // Create a test ticket
    const testTicket = {
      guestName: 'John Doe',
      email: 'john@example.com',
      ticketId: `TKT-2024-${Date.now()}-001`,
      qrCode: 'data:image/png;base64,test-qr-code',
      status: 'pending'
    };

    console.log('Creating ticket:', testTicket);
    const createdTicket = await storage.createTicket(testTicket);
    console.log('✅ Ticket created successfully:', createdTicket);

    // Get all tickets
    const allTickets = await storage.getAllTickets();
    console.log('📋 Total tickets:', allTickets.length);
    
    if (allTickets.length > 0) {
      console.log('First ticket:', allTickets[0]);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCreateTicket();