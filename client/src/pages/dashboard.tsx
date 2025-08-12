import { useState } from "react";
import { Music, LogOut, QrCode, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsDashboard from "@/components/stats-dashboard";
import QRScanner from "@/components/qr-scanner";
import SeatMap from "@/components/seat-map";
import TicketDetailsModal from "@/components/ticket-details-modal";
import TicketTable from "@/components/ticket-table";
import CreateTicketForm from "@/components/create-ticket-form";
import type { Ticket } from "@shared/schema";

export default function Dashboard() {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showSeatMap, setShowSeatMap] = useState(false);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const handleQRScanSuccess = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowQRScanner(false);
    setShowTicketDetails(true);
  };

  const handleAssignSeat = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowTicketDetails(false);
    setShowSeatMap(true);
  };

  const handleSeatAssigned = () => {
    setShowSeatMap(false);
    setSelectedTicket(null);
  };

  return (
    <div className="min-h-screen bg-surface-background">
      {/* Navigation Bar */}
      <nav className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Music className="text-2xl mr-3" />
              <h1 className="text-xl font-medium">Concert Venue Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm opacity-75">
                Staff: <span className="font-medium">Admin User</span>
              </span>
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-primary-dark hover:bg-opacity-80"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard Stats */}
        <StatsDashboard />

        {/* Quick Actions */}
        <div className="bg-surface rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => setShowQRScanner(true)}
              className="bg-primary hover:bg-primary-dark text-primary-foreground px-6 py-3 h-auto"
            >
              <QrCode className="mr-2" />
              Scan QR Code
            </Button>
            <Button
              onClick={() => setShowSeatMap(true)}
              className="bg-secondary hover:bg-opacity-80 text-secondary-foreground px-6 py-3 h-auto"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
              </svg>
              Assign Seats
            </Button>
            <Button
              onClick={() => setShowCreateTicket(true)}
              variant="outline"
              className="border-success text-success hover:bg-success hover:text-white px-6 py-3 h-auto"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Ticket
            </Button>
          </div>
        </div>

        {/* Ticket Management Table */}
        <TicketTable
          onAssignSeat={handleAssignSeat}
          onViewTicket={(ticket) => {
            setSelectedTicket(ticket);
            setShowTicketDetails(true);
          }}
        />
      </div>

      {/* Floating Action Button */}
      <Button
        onClick={() => setShowQRScanner(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary hover:bg-primary-dark shadow-lg hover:scale-110 transition-all"
        size="icon"
      >
        <QrCode className="text-xl" />
      </Button>

      {/* Modals */}
      <QRScanner
        open={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={handleQRScanSuccess}
      />

      <SeatMap
        open={showSeatMap}
        onClose={() => setShowSeatMap(false)}
        ticket={selectedTicket}
        onSeatAssigned={handleSeatAssigned}
      />

      <TicketDetailsModal
        open={showTicketDetails}
        onClose={() => setShowTicketDetails(false)}
        ticket={selectedTicket}
        onAssignSeat={handleAssignSeat}
      />

      <CreateTicketForm
        open={showCreateTicket}
        onClose={() => setShowCreateTicket(false)}
      />
    </div>
  );
}
