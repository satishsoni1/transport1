'use client';

import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import useSWR from 'swr';

interface PlanningRow {
  id: number;
  vehicle_no: string;
  vehicle_type: string;
  computed_status: 'available' | 'on_trip' | 'maintenance';
  current_trip_no: string | null;
  current_destination: string | null;
  next_trip_no: string | null;
  next_trip_date: string | null;
  next_from_city: string | null;
  next_to_city: string | null;
}

const STATUS_LABELS: Record<PlanningRow['computed_status'], string> = {
  available: 'Available',
  on_trip: 'On Trip',
  maintenance: 'Under Maintenance',
};

const STATUS_COLORS: Record<PlanningRow['computed_status'], string> = {
  available: 'bg-emerald-100 text-emerald-700',
  on_trip: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-red-100 text-red-700',
};

export default function VehiclePlanningPage() {
  const { user } = useAuth();
  const { data: rows = [] } = useSWR<PlanningRow[]>('/api/planning', apiClient.get);

  if (!user) return null;

  const counts = rows.reduce(
    (acc, row) => {
      acc[row.computed_status] += 1;
      return acc;
    },
    { available: 0, on_trip: 0, maintenance: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vehicle Planning</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live availability derived from Trip Management and Workshop &amp; Maintenance records —
          use this to decide which vehicle to assign to a new booking.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Available</p>
          <p className="text-2xl font-bold text-emerald-700">{counts.available}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">On Trip</p>
          <p className="text-2xl font-bold text-blue-700">{counts.on_trip}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Under Maintenance</p>
          <p className="text-2xl font-bold text-red-700">{counts.maintenance}</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Trip</TableHead>
              <TableHead>Next Planned Trip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No active vehicles found
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.vehicle_no}</TableCell>
                  <TableCell>{row.vehicle_type}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[row.computed_status]}`}>
                      {STATUS_LABELS[row.computed_status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.current_trip_no ? `${row.current_trip_no} → ${row.current_destination || ''}` : '-'}
                  </TableCell>
                  <TableCell>
                    {row.next_trip_no
                      ? `${row.next_trip_no} (${row.next_trip_date || 'no date'}): ${row.next_from_city} → ${row.next_to_city}`
                      : '-'}
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
