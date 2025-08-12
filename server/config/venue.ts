// Venue configuration - making the hardcoded layout configurable

export interface VenueConfig {
  name: string;
  rows: string[];
  seatsPerRow: number;
  seatNumberFormat: (row: string, seatIndex: number) => string;
}

export const defaultVenueConfig: VenueConfig = {
  name: "Concert Hall",
  rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
  seatsPerRow: 20,
  seatNumberFormat: (row: string, seatIndex: number) => 
    `${row}-${seatIndex.toString().padStart(2, '0')}`
};

// Alternative venue configurations
export const smallVenueConfig: VenueConfig = {
  name: "Intimate Theater",
  rows: ['A', 'B', 'C', 'D', 'E'],
  seatsPerRow: 15,
  seatNumberFormat: (row: string, seatIndex: number) => 
    `${row}${seatIndex.toString().padStart(2, '0')}`
};

export const largeVenueConfig: VenueConfig = {
  name: "Stadium",
  rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'],
  seatsPerRow: 30,
  seatNumberFormat: (row: string, seatIndex: number) => 
    `${row}-${seatIndex.toString().padStart(3, '0')}`
};

// Get venue config from environment or use default
export function getVenueConfig(): VenueConfig {
  const venueType = process.env.VENUE_TYPE || 'default';
  
  switch (venueType) {
    case 'small':
      return smallVenueConfig;
    case 'large':
      return largeVenueConfig;
    default:
      return defaultVenueConfig;
  }
}

// Generate all seats for a venue
export function generateSeats(config: VenueConfig = defaultVenueConfig) {
  const seats = [];
  
  for (const row of config.rows) {
    for (let i = 1; i <= config.seatsPerRow; i++) {
      const seatNumber = config.seatNumberFormat(row, i);
      seats.push({
        seatNumber,
        row,
        seatIndex: i.toString().padStart(2, '0'),
        isOccupied: false,
        ticketId: null
      });
    }
  }
  
  return seats;
}

// Validate seat number against venue config
export function isValidSeatNumber(seatNumber: string, config: VenueConfig = defaultVenueConfig): boolean {
  // Extract row and seat index from seat number
  const match = seatNumber.match(/^([A-Z]+)-?(\d+)$/);
  if (!match) return false;
  
  const [, row, seatIndexStr] = match;
  const seatIndex = parseInt(seatIndexStr, 10);
  
  return config.rows.includes(row) && 
         seatIndex >= 1 && 
         seatIndex <= config.seatsPerRow;
}