import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Keyboard } from "lucide-react";
import type { Ticket, Seat } from "@shared/schema";

interface SeatMapProps {
  open: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onSeatAssigned: () => void;
}

export default function SeatMap({ open, onClose, ticket, onSeatAssigned }: SeatMapProps) {
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [manualSeatInput, setManualSeatInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: seats, isLoading } = useQuery<Seat[]>({
    queryKey: ["/api/seats"],
    enabled: open,
  });

  const assignSeatMutation = useMutation({
    mutationFn: async (seatNumber: string) => {
      if (!ticket) throw new Error("No ticket selected");
      const response = await apiRequest(
        "POST",
        `/api/tickets/${ticket.id}/assign-seat`,
        { seatNumber }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Seat Assigned Successfully",
        description: `Seat ${selectedSeat} has been assigned to ${ticket?.guestName}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      onSeatAssigned();
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign seat",
        variant: "destructive",
      });
    },
  });

  const handleSeatClick = (seat: Seat) => {
    if (seat.isOccupied) return;
    setSelectedSeat(seat.seatNumber);
  };

  const handleConfirmAssignment = () => {
    if (!selectedSeat) {
      toast({
        title: "No Seat Selected",
        description: "Please select a seat first",
        variant: "destructive",
      });
      return;
    }
    assignSeatMutation.mutate(selectedSeat);
  };

  const handleManualAssignment = () => {
    if (!manualSeatInput.trim()) {
      toast({
        title: "No Seat Number Entered",
        description: "Please enter a seat number (e.g., A-01, B-15)",
        variant: "destructive",
      });
      return;
    }

    const seatNumber = manualSeatInput.trim().toUpperCase();
    
    // Check if seat exists and is available
    const seat = seats?.find(s => s.seatNumber === seatNumber);
    if (!seat) {
      toast({
        title: "Invalid Seat Number",
        description: `Seat ${seatNumber} does not exist. Valid seats are A-01 to J-20.`,
        variant: "destructive",
      });
      return;
    }

    if (seat.isOccupied) {
      toast({
        title: "Seat Unavailable",
        description: `Seat ${seatNumber} is already occupied.`,
        variant: "destructive",
      });
      return;
    }

    assignSeatMutation.mutate(seatNumber);
  };

  const handleClose = () => {
    setSelectedSeat(null);
    setManualSeatInput("");
    onClose();
  };

  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seat Assignment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stage */}
          <div className="text-center">
            <div className="bg-gray-800 text-white py-2 px-4 rounded-lg mb-4 inline-block">
              🎵 STAGE
            </div>
          </div>

          {/* Seat Map */}
          {isLoading ? (
            <div className="text-center py-8">Loading seats...</div>
          ) : (
            <div className="inline-block bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mx-auto">
              {rows.map((row) => (
                <div key={row} className="flex justify-center mb-2">
                  <span className="w-8 text-sm font-medium text-muted-foreground flex items-center justify-center">
                    {row}
                  </span>
                  
                  {/* First 10 seats */}
                  {Array.from({ length: 10 }).map((_, index) => {
                    const seatNumber = `${row}-${(index + 1).toString().padStart(2, '0')}`;
                    const seat = seats?.find((s: Seat) => s.seatNumber === seatNumber);
                    const isSelected = selectedSeat === seatNumber;
                    
                    return (
                      <button
                        key={seatNumber}
                        className={`seat w-6 h-6 mx-1 rounded text-xs flex items-center justify-center text-white font-medium ${
                          seat?.isOccupied
                            ? 'occupied'
                            : isSelected
                            ? 'selected'
                            : 'available'
                        }`}
                        onClick={() => seat && handleSeatClick(seat)}
                        disabled={seat?.isOccupied}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                  
                  {/* Aisle */}
                  <div className="w-4"></div>
                  
                  {/* Last 10 seats */}
                  {Array.from({ length: 10 }).map((_, index) => {
                    const seatIndex = index + 11;
                    const seatNumber = `${row}-${seatIndex.toString().padStart(2, '0')}`;
                    const seat = seats?.find((s: Seat) => s.seatNumber === seatNumber);
                    const isSelected = selectedSeat === seatNumber;
                    
                    return (
                      <button
                        key={seatNumber}
                        className={`seat w-6 h-6 mx-1 rounded text-xs flex items-center justify-center text-white font-medium ${
                          seat?.isOccupied
                            ? 'occupied'
                            : isSelected
                            ? 'selected'
                            : 'available'
                        }`}
                        onClick={() => seat && handleSeatClick(seat)}
                        disabled={seat?.isOccupied}
                      >
                        {seatIndex}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-success rounded mr-2"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-error rounded mr-2"></div>
              <span>Occupied</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-secondary rounded mr-2"></div>
              <span>Selected</span>
            </div>
          </div>

          {/* Assignment Controls */}
          {ticket && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Assigning seat for:</p>
                  <p className="text-lg">{ticket.guestName}</p>
                  <p className="text-sm text-muted-foreground">
                    Ticket: {ticket.ticketId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Selected Seat:</p>
                  <p className="text-2xl font-bold">
                    {selectedSeat || "None"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Manual Seat Entry */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Or enter seat number manually:
                </Label>
              </div>
              <div className="flex gap-2">
                <Input
                  value={manualSeatInput}
                  onChange={(e) => setManualSeatInput(e.target.value)}
                  placeholder="Enter seat number (e.g., A-01, B-15)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleManualAssignment();
                    }
                  }}
                />
                <Button
                  onClick={handleManualAssignment}
                  disabled={assignSeatMutation.isPending}
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"
                >
                  Assign
                </Button>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Valid seats: A-01 to J-20 (10 rows, 20 seats each)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleConfirmAssignment}
              disabled={!selectedSeat || assignSeatMutation.isPending}
              className="flex-1 bg-primary hover:bg-primary-dark"
            >
              <Check className="w-4 h-4 mr-2" />
              {assignSeatMutation.isPending ? "Assigning..." : "Confirm Visual Selection"}
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
