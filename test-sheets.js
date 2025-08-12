import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

async function testGoogleSheets() {
  try {
    console.log('Testing Google Sheets connection...');
    console.log('Spreadsheet ID:', process.env.GOOGLE_SHEETS_ID);
    console.log('Service Account Email:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    console.log('Private Key (first 50 chars):', process.env.GOOGLE_PRIVATE_KEY?.substring(0, 50) + '...');

    // Initialize Google Auth
    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Test authentication
    console.log('Testing authentication...');
    await auth.authorize();
    console.log('✅ Authentication successful!');

    // Test spreadsheet access
    console.log('Testing spreadsheet access...');
    const response = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    });

    console.log('✅ Spreadsheet access successful!');
    console.log('Spreadsheet title:', response.data.properties?.title);
    console.log('Available sheets:');
    response.data.sheets?.forEach(sheet => {
      console.log(`  - ${sheet.properties?.title}`);
    });

    // Test writing data
    console.log('Testing write access...');
    const firstSheetName = response.data.sheets?.[0]?.properties?.title || 'Sheet1';
    console.log('Using sheet:', firstSheetName);
    
    const testData = [['Test', 'Data', new Date().toISOString()]];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `${firstSheetName}!A1:C1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: testData,
      },
    });

    console.log('✅ Write access successful!');
    console.log('🎉 All tests passed! Google Sheets integration is working.');

  } catch (error) {
    console.error('❌ Error testing Google Sheets:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testGoogleSheets();