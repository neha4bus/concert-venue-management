# Concert Venue Manager

## Overview

Concert Venue Manager is a full-stack web application for managing concert ticket sales, seat assignments, and venue check-ins. The system provides a comprehensive dashboard for venue staff to handle ticket operations including QR code scanning, seat management, and guest check-ins. Built with modern web technologies, it features a React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration.

## Features

- **Ticket Management**: Create, view, and manage concert tickets with unique IDs
- **QR Code Integration**: Generate and scan QR codes for ticket validation
- **Seat Assignment**: Interactive seat map with real-time availability
- **CSV Import**: Bulk ticket import from CSV files or Google Sheets
- **Check-in System**: Guest check-in functionality with status tracking
- **Dashboard Analytics**: Real-time statistics for venue operations
- **Security**: Rate limiting, input validation, and secure data handling

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API endpoints for ticket operations
- **Middleware**: Custom logging middleware for API request tracking
- **Development**: Hot reload with Vite integration in development mode

### Data Layer
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Storage Pattern**: Repository pattern with in-memory fallback for development
- **Data Models**: Tickets and Seats with relationship management

### Key Features
- **Ticket Management**: Create, view, and manage concert tickets with unique IDs
- **QR Code Integration**: Generate and scan QR codes for ticket validation
- **Manual Seat Assignment**: CSV/Google Sheets import with optional seat pre-assignment
- **Interactive Seat Map**: Visual seat map for venue management and real-time editing
- **Check-in System**: Guest check-in functionality with status tracking
- **Dashboard Analytics**: Real-time statistics for venue operations
- **Bulk Import**: Support for CSV upload and Google Sheets URL import with seat validation

### Authentication & Security
- **Session Management**: Express sessions with PostgreSQL store (connect-pg-simple)
- **Data Validation**: Zod schemas for runtime type checking
- **Error Handling**: Centralized error handling with proper HTTP status codes

## External Dependencies

### Database & ORM
- **Neon Database**: PostgreSQL serverless database provider (@neondatabase/serverless)
- **Drizzle ORM**: Type-safe database toolkit (drizzle-orm, drizzle-zod)

### UI & Styling
- **Radix UI**: Unstyled, accessible UI primitives (@radix-ui/react-*)
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography

### Utilities & Tools
- **QRCode**: QR code generation library
- **date-fns**: Date utility library
- **clsx**: Conditional className utility
- **class-variance-authority**: Component variant management

### Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Static type checking
- **ESBuild**: JavaScript bundler for production builds
- **TSX**: TypeScript execution for development

### Development Tools
- **Vite**: Fast build tool and development server with HMR
- **TypeScript**: Full type safety across the application

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd concert-venue-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and other configuration
   ```

4. **Run database migrations** (if using PostgreSQL)
   ```bash
   npm run db:push
   ```

## Development

**Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

**Other available scripts:**
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type check with TypeScript
- `npm test` - Run tests
- `npm run lint` - Lint code

## Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set environment variables**
   - `DATABASE_URL` - PostgreSQL connection string
   - `NODE_ENV=production`
   - `PORT` - Server port (default: 5000)

3. **Start the production server**
   ```bash
   npm start
   ```

## Environment Variables

- `DATABASE_URL` - PostgreSQL database connection string
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000)
- `LOG_LEVEL` - Logging level (ERROR/WARN/INFO/DEBUG)
- `VENUE_TYPE` - Venue configuration (default/small/large)