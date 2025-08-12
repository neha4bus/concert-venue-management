import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, User, Calendar, Mail, Ticket as TicketIcon, Printer, User2 } from "lucide-react";
import type { Ticket } from "@shared/schema";

interface TicketDetailsModalProps {
  open: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onAssignSeat: (ticket: Ticket) => void;
}

export default function TicketDetailsModal({
  open,
  onClose,
  ticket,
  onAssignSeat,
}: TicketDetailsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!ticket) throw new Error("No ticket selected");
      const response = await apiRequest("POST", `/api/tickets/${ticket.id}/checkin`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Check-in Successful",
        description: `${ticket?.guestName} has been checked in successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Check-in Failed",
        description: error.message || "Failed to check in ticket",
        variant: "destructive",
      });
    },
  });

  if (!ticket) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-warning bg-opacity-20 text-warning border-warning">
            <Clock className="w-3 h-3 mr-1" />
            Awaiting Seat Assignment
          </Badge>
        );
      case "assigned":
        return (
          <Badge variant="secondary" className="bg-primary bg-opacity-20 text-primary border-primary">
            <User2 className="w-3 h-3 mr-1" />
            Seat Assigned
          </Badge>
        );
      case "checked-in":
        return (
          <Badge variant="secondary" className="bg-success bg-opacity-20 text-success border-success">
            <CheckCircle className="w-3 h-3 mr-1" />
            Checked In
          </Badge>
        );
      default:
        return null;
    }
  };

  const handlePrint = () => {
    // In a real implementation, this would generate and print a proper ticket
    toast({
      title: "Print Function",
      description: "Print functionality would be implemented here",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ticket Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Validation Status */}
          <div className="flex items-center p-4 bg-success bg-opacity-10 border border-success border-opacity-30 rounded-lg">
            <CheckCircle className="text-success text-2xl mr-3 w-8 h-8" />
            <div>
              <p className="font-medium text-success">Valid Ticket</p>
              <p className="text-sm text-muted-foreground">QR code verified successfully</p>
            </div>
          </div>

          {/* Ticket Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-muted-foreground mb-1">
                <TicketIcon className="w-4 h-4" />
                Ticket ID
              </label>
              <p className="text-lg font-mono">{ticket.ticketId}</p>
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                Purchase Date
              </label>
              <p>{new Date(ticket.purchaseDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-muted-foreground mb-1">
              <User className="w-4 h-4" />
              Guest Name
            </label>
            <p className="text-lg">{ticket.guestName}</p>
          </div>

          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-muted-foreground mb-1">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <p>{ticket.email}</p>
          </div>

          {ticket.seatNumber && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1">
                Assigned Seat
              </label>
              <p className="text-lg font-bold">{ticket.seatNumber}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1">
              Current Status
            </label>
            <div>{getStatusBadge(ticket.status)}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          {ticket.status === "pending" && (
            <Button
              onClick={() => onAssignSeat(ticket)}
              className="flex-1 bg-primary hover:bg-primary-dark"
            >
              <User2 className="w-4 h-4 mr-2" />
              Assign Seat
            </Button>
          )}
          {ticket.status === "assigned" && (
            <Button
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
              className="flex-1 bg-success hover:bg-success/80"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {checkInMutation.isPending ? "Checking In..." : "Check In"}
            </Button>
          )}
          <Button
            onClick={handlePrint}
            variant="outline"
            className="flex-1"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Ticket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
