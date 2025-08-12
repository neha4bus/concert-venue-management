import QRCode from 'qrcode';
import { logger } from './logger';

export interface QRCodeOptions {
  size?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export async function generateQRCode(data: string, options: QRCodeOptions = {}): Promise<string> {
  try {
    const qrOptions = {
      width: options.size || 200,
      margin: options.margin || 2,
      color: {
        dark: options.color?.dark || '#000000',
        light: options.color?.light || '#FFFFFF',
      },
      errorCorrectionLevel: 'M' as const,
    };

    const qrCodeDataUrl = await QRCode.toDataURL(data, qrOptions);
    return qrCodeDataUrl;
  } catch (error) {
    logger.error('Error generating QR code', { data }, error as Error);
    throw new Error('Failed to generate QR code');
  }
}

export async function generateQRCodeBuffer(data: string, options: QRCodeOptions = {}): Promise<Buffer> {
  try {
    const qrOptions = {
      width: options.size || 200,
      margin: options.margin || 2,
      color: {
        dark: options.color?.dark || '#000000',
        light: options.color?.light || '#FFFFFF',
      },
      errorCorrectionLevel: 'M' as const,
    };

    const buffer = await QRCode.toBuffer(data, qrOptions);
    return buffer;
  } catch (error) {
    logger.error('Error generating QR code buffer', { data }, error as Error);
    throw new Error('Failed to generate QR code buffer');
  }
}