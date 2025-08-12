import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, X, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Ticket } from "@shared/schema";

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (ticket: Ticket) => void;
}

export default function QRScanner({ open, onClose, onScanSuccess }: QRScannerProps) {
  const [manualInput, setManualInput] = useState("");
  const { toast } = useToast();

  const scanMutation = useMutation({
    mutationFn: async (qrData: string) => {
      const response = await apiRequest("POST", "/api/tickets/scan", { qrData });
      return response.json();
    },
    onSuccess: (ticket: Ticket) => {
      toast({
        title: "QR Code Scanned Successfully",
        description: `Found ticket for ${ticket.guestName}`,
      });
      onScanSuccess(ticket);
    },
    onError: () => {
      toast({
        title: "Invalid QR Code",
        description: "Could not find a valid ticket for this QR code.",
        variant: "destructive",
      });
    },
  });

  const handleManualScan = () => {
    if (!manualInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a ticket ID or QR code data.",
        variant: "destructive",
      });
      return;
    }
    scanMutation.mutate(manualInput.trim());
  };

  const handleClose = () => {
    setManualInput("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Scan QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Scanner Frame */}
          <div className="text-center">
            <div className="qr-scanner-frame">
              <div className="scanner-corner tl"></div>
              <div className="scanner-corner tr"></div>
              <div className="scanner-corner bl"></div>
              <div className="scanner-corner br"></div>
              <div className="flex items-center justify-center h-full">
                <Camera className="text-4xl text-primary opacity-50 w-12 h-12" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Position the QR code within the frame
            </p>
          </div>

          {/* Manual Input Option */}
          <div className="border-t pt-4">
            <Label htmlFor="manual-input">Or enter ticket ID manually:</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="manual-input"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter ticket ID (e.g., TKT-2024-001-089)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleManualScan();
                  }
                }}
              />
              <Button
                onClick={handleManualScan}
                disabled={scanMutation.isPending}
                className="bg-primary hover:bg-primary-dark"
              >
                Scan
              </Button>
            </div>
          </div>

          {/* Camera Permission Note */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <p>Camera access required for QR scanning (not implemented in demo)</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
