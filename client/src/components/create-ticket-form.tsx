import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { createTicketSchema } from "@shared/schema";
import { z } from "zod";

interface CreateTicketFormProps {
  open: boolean;
  onClose: () => void;
}

const formSchema = createTicketSchema.pick({
  guestName: true,
  email: true,
});

type FormData = z.infer<typeof formSchema>;

export default function CreateTicketForm({ open, onClose }: CreateTicketFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestName: "",
      email: "",
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/tickets", {
        ...data,
        status: "pending",
      });
      return response.json();
    },
    onSuccess: (ticket) => {
      toast({
        title: "Ticket Created Successfully",
        description: `Ticket ${ticket.ticketId} created for ${ticket.guestName}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      form.reset();
      onClose();
    },
    onError: () => {
      toast({
        title: "Failed to Create Ticket",
        description: "Please check the information and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: FormData) => {
    createTicketMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New Ticket
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="guestName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter guest full name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="guest@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                disabled={createTicketMutation.isPending}
                className="flex-1 bg-primary hover:bg-primary-dark"
              >
                {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
              </Button>
              <Button
                type="button"
                onClick={handleClose}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}