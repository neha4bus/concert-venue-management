import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Download, AlertCircle } from "lucide-react";

interface ImportTicketsFormProps {
  open: boolean;
  onClose: () => void;
}

export default function ImportTicketsForm({ open, onClose }: ImportTicketsFormProps) {
  const [csvData, setCsvData] = useState("");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [importMethod, setImportMethod] = useState<"csv" | "url">("csv");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importTicketsMutation = useMutation({
    mutationFn: async (data: { csvData?: string; googleSheetUrl?: string }) => {
      const response = await apiRequest("POST", "/api/tickets/import", data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Import Successful",
        description: `Successfully imported ${result.imported} tickets. ${result.errors?.length || 0} errors occurred.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Import Failed",
        description: "Please check your data format and try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCsvData(text);
      };
      reader.readAsText(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
    }
  };

  const handleImport = () => {
    if (importMethod === "csv" && !csvData.trim()) {
      toast({
        title: "No Data",
        description: "Please provide CSV data or upload a file.",
        variant: "destructive",
      });
      return;
    }

    if (importMethod === "url" && !googleSheetUrl.trim()) {
      toast({
        title: "No URL",
        description: "Please provide a Google Sheets URL.",
        variant: "destructive",
      });
      return;
    }

    importTicketsMutation.mutate(
      importMethod === "csv" 
        ? { csvData } 
        : { googleSheetUrl }
    );
  };

  const handleClose = () => {
    setCsvData("");
    setGoogleSheetUrl("");
    setImportMethod("csv");
    onClose();
  };

  const downloadTemplate = () => {
    const template = "guestName,email\nJohn Doe,john@example.com\nJane Smith,jane@example.com";
    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ticket_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Tickets
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Import Method Selection */}
          <div className="space-y-3">
            <Label>Import Method</Label>
            <div className="flex gap-4">
              <Button
                variant={importMethod === "csv" ? "default" : "outline"}
                onClick={() => setImportMethod("csv")}
                className="flex-1"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                CSV Upload
              </Button>
              <Button
                variant={importMethod === "url" ? "default" : "outline"}
                onClick={() => setImportMethod("url")}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Google Sheets URL
              </Button>
            </div>
          </div>

          {/* Template Download */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">CSV Format Required</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Columns: guestName, email (header row required)
                </p>
              </div>
              <Button
                onClick={downloadTemplate}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"
              >
                <Download className="w-4 h-4 mr-1" />
                Template
              </Button>
            </div>
          </div>

          {/* CSV Upload */}
          {importMethod === "csv" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Upload CSV File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="csv-data">Or Paste CSV Data</Label>
                <Textarea
                  id="csv-data"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="guestName,email&#10;John Doe,john@example.com&#10;Jane Smith,jane@example.com"
                  rows={8}
                  className="mt-2 font-mono text-sm"
                />
              </div>
            </div>
          )}

          {/* Google Sheets URL */}
          {importMethod === "url" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="sheet-url">Google Sheets URL</Label>
                <Input
                  id="sheet-url"
                  value={googleSheetUrl}
                  onChange={(e) => setGoogleSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="mt-2"
                />
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">Sheet Requirements</p>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                      <li>• Sheet must be publicly accessible (sharing: "Anyone with the link")</li>
                      <li>• First row must contain headers: guestName, email</li>
                      <li>• URL should be the shareable link from Google Sheets</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleImport}
              disabled={importTicketsMutation.isPending}
              className="flex-1 bg-primary hover:bg-primary-dark"
            >
              {importTicketsMutation.isPending ? "Importing..." : "Import Tickets"}
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}