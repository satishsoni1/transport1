'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { RefreshCw, ExternalLink } from 'lucide-react';
import useSWR from 'swr';

interface VehicleLocation {
  vehicle_id: number;
  vehicle_no: string;
  gps_device_id: string;
  latitude: number | null;
  longitude: number | null;
  speed_kmph: number | null;
  heading: number | null;
  recorded_at: string | null;
}

function timeAgo(isoDate: string | null) {
  if (!isoDate) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function GpsTrackingPage() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { data: locations = [], mutate } = useSWR<VehicleLocation[]>('/api/gps/locations', apiClient.get);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await apiClient.post<{ updated: number; total: number; errors: string[] }>(
        '/api/gps/refresh',
        {}
      );
      if (result.updated > 0) {
        toast.success(`Updated ${result.updated} of ${result.total} vehicles`);
      } else if (result.errors.length > 0) {
        toast.error(result.errors[0]);
      } else {
        toast.error('No vehicles with a GPS Device ID set');
      }
      mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh locations');
    } finally {
      setRefreshing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">GPS Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live positions for vehicles with a GPS Device ID set (Vehicles Master) and GPS tracking
            configured in Settings &gt; Integrations.
          </p>
        </div>
        <Button className="gap-2" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Locations'}
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Device ID</TableHead>
              <TableHead>Speed</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Map</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No vehicles with a GPS Device ID set. Add one in Vehicles Master.
                </TableCell>
              </TableRow>
            ) : (
              locations.map((loc) => (
                <TableRow key={loc.vehicle_id}>
                  <TableCell className="font-medium">{loc.vehicle_no}</TableCell>
                  <TableCell>{loc.gps_device_id}</TableCell>
                  <TableCell>{loc.speed_kmph != null ? `${loc.speed_kmph} km/h` : '-'}</TableCell>
                  <TableCell>{timeAgo(loc.recorded_at)}</TableCell>
                  <TableCell>
                    {loc.latitude != null && loc.longitude != null ? (
                      <a
                        href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      '-'
                    )}
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
