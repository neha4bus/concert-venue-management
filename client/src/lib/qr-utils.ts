import QRCode from "qrcode";

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

export function parseQRCode(data: string): { isValid: boolean; ticketId?: string } {
  // Simple validation - in a real app, this would be more sophisticated
  if (data.startsWith('TKT-')) {
    return { isValid: true, ticketId: data };
  }
  
  return { isValid: false };
}
