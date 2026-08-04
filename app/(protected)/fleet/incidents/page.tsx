'use client';

import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import useSWR from 'swr';

interface Incident {
  id: number;
  incident_date: string;
  description: string;
  status: 'open' | 'reviewed' | 'closed';
  vehicle_no: string | null;
  driver_name: string | null;
}

const STATUS_LABELS: Record<Incident['status'], string> = {
  open: 'Open',
  reviewed: 'Reviewed',
  closed: 'Closed',
};

const STATUS_COLORS: Record<Incident['status'], string> = {
  open: 'bg-red-100 text-red-700',
  reviewed: 'bg-amber-100 text-amber-700',
  closed: 'bg-emerald-100 text-emerald-700',
};

export default function IncidentsPage() {
  const { user } = useAuth();
  const { data: incidents = [], mutate } = useSWR<Incident[]>('/api/fleet/incidents', apiClient.get);

  const handleStatusChange = async (incident: Incident, status: Incident['status']) => {
    try {
      await apiClient.put(`/api/fleet/incidents/${incident.id}`, { status });
      toast.success(`Marked as ${STATUS_LABELS[status]}`);
      mutate();
    } catch {
      toast.error('Failed to update incident');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Incident Reports</h1>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No incidents reported
                </TableCell>
              </TableRow>
            ) : (
              incidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell>{incident.incident_date}</TableCell>
                  <TableCell>{incident.vehicle_no || '-'}</TableCell>
                  <TableCell>{incident.driver_name || '-'}</TableCell>
                  <TableCell className="max-w-md">{incident.description}</TableCell>
                  <TableCell>
                    <Select
                      value={incident.status}
                      onValueChange={(value) => handleStatusChange(incident, value as Incident['status'])}
                    >
                      <SelectTrigger className={`h-7 w-28 border-0 text-xs font-medium ${STATUS_COLORS[incident.status]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
