import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, User2, Printer, Download, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Ticket } from "@shared/schema";

interface TicketTableProps {
  onViewTicket: (ticket: Ticket) => void;
  onAssignSeat: (ticket: Ticket) => void;
}

export default function TicketTable({ onViewTicket, onAssignSeat }: TicketTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  const filteredTickets = tickets?.filter((ticket: Ticket) => {
    const matchesSearch = 
      ticket.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticketId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-warning bg-opacity-20 text-warning">
            Pending
          </Badge>
        );
      case "assigned":
        return (
          <Badge variant="secondary" className="bg-primary bg-opacity-20 text-primary">
            Assigned
          </Badge>
        );
      case "checked-in":
        return (
          <Badge variant="secondary" className="bg-success bg-opacity-20 text-success">
            Checked In
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-surface shadow">
        <CardHeader>
          <CardTitle>Recent Ticket Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-surface shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Ticket Activity</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="w-4 h-4 mr-1" />
              Send Emails
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
          <Input
            placeholder="Search by name, email, or ticket ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending Assignment</SelectItem>
              <SelectItem value="assigned">Seat Assigned</SelectItem>
              <SelectItem value="checked-in">Checked In</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Seat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {tickets?.length === 0 ? "No tickets found" : "No tickets match your search criteria"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket: Ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{ticket.guestName}</p>
                        <p className="text-sm text-muted-foreground">{ticket.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{ticket.ticketId}</span>
                    </TableCell>
                    <TableCell>
                      {ticket.seatNumber ? (
                        <span className="font-medium">{ticket.seatNumber}</span>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(ticket.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewTicket(ticket)}
                          className="text-primary hover:text-primary-dark"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {ticket.status === "pending" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAssignSeat(ticket)}
                            className="text-secondary hover:text-secondary/80"
                          >
                            <User2 className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAssignSeat(ticket)}
                            className="text-secondary hover:text-secondary/80"
                          >
                            <User2 className="w-4 h-4" />
                          </Button>
                        )}

                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {filteredTickets.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{filteredTickets.length}</span> of{" "}
              <span className="font-medium">{tickets?.length || 0}</span> tickets
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
