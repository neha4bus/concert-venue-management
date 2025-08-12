import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TicketIcon, Users, QrCode, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsDashboard() {
  const { data: stats, isLoading } = useQuery<{
    totalTickets: number;
    assignedSeats: number;
    scannedCodes: number;
    checkedIn: number;
  }>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-surface">
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Total Tickets",
      value: stats?.totalTickets || 0,
      icon: TicketIcon,
      bgColor: "bg-success bg-opacity-10",
      iconColor: "text-success",
    },
    {
      title: "Seats Assigned",
      value: stats?.assignedSeats || 0,
      icon: Users,
      bgColor: "bg-warning bg-opacity-10",
      iconColor: "text-warning",
    },
    {
      title: "QR Scanned",
      value: stats?.scannedCodes || 0,
      icon: QrCode,
      bgColor: "bg-primary bg-opacity-10",
      iconColor: "text-primary",
    },
    {
      title: "Checked In",
      value: stats?.checkedIn || 0,
      icon: CheckCircle,
      bgColor: "bg-success bg-opacity-10",
      iconColor: "text-success",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="bg-surface shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`${stat.bgColor} p-3 rounded-full`}>
                  <Icon className={`${stat.iconColor} text-xl w-6 h-6`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
