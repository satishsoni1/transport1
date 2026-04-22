'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import useSWR from 'swr';

interface Consignor {
  id: number;
  name: string;
}

interface RouteRow {
  id: number;
  route_name: string;
  cities: string[];
}

interface CityRate {
  city_name: string;
  rate_10kg: string;
  rate_20kg: string;
  rate_30kg: string;
  rate_40kg: string;
  rate_50kg: string;
  rate_above_50kg: string;
}

interface SavedRate {
  city_name: string;
  rate_10kg: number;
  rate_20kg: number;
  rate_30kg: number;
  rate_40kg: number;
  rate_50kg: number;
  rate_above_50kg: number;
}

const WEIGHT_COLS: { key: keyof CityRate; label: string }[] = [
  { key: 'rate_10kg', label: '10 kg' },
  { key: 'rate_20kg', label: '20 kg' },
  { key: 'rate_30kg', label: '30 kg' },
  { key: 'rate_40kg', label: '40 kg' },
  { key: 'rate_50kg', label: '50 kg' },
  { key: 'rate_above_50kg', label: '50 kg+' },
];

export default function FreightRatesPage() {
  const { user } = useAuth();
  const [selectedConsignorId, setSelectedConsignorId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [cityRates, setCityRates] = useState<CityRate[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { data: consignors = [] } = useSWR<Consignor[]>('/api/masters/consignors', apiClient.get);
  const { data: routes = [] } = useSWR<RouteRow[]>('/api/masters/routes', apiClient.get);

  const selectedRoute = routes.find((r) => String(r.id) === selectedRouteId);

  const loadRates = useCallback(async () => {
    if (!selectedConsignorId || !selectedRouteId || !selectedRoute) return;

    try {
      const saved = await apiClient.get<SavedRate[]>(
        `/api/masters/freight-rates/bulk?consignor_id=${selectedConsignorId}&route_id=${selectedRouteId}`
      );
      const savedMap = new Map<string, SavedRate>(
        (saved || []).map((r) => [r.city_name, r])
      );

      const cities: string[] = Array.isArray(selectedRoute.cities) ? selectedRoute.cities : [];
      const rows: CityRate[] = cities.map((city) => {
        const existing = savedMap.get(city);
        return {
          city_name: city,
          rate_10kg: existing ? String(existing.rate_10kg || '') : '',
          rate_20kg: existing ? String(existing.rate_20kg || '') : '',
          rate_30kg: existing ? String(existing.rate_30kg || '') : '',
          rate_40kg: existing ? String(existing.rate_40kg || '') : '',
          rate_50kg: existing ? String(existing.rate_50kg || '') : '',
          rate_above_50kg: existing ? String(existing.rate_above_50kg || '') : '',
        };
      });
      setCityRates(rows);
      setLoaded(true);
    } catch {
      toast.error('Failed to load rates');
    }
  }, [selectedConsignorId, selectedRouteId, selectedRoute]);

  const updateRate = (cityIndex: number, field: keyof CityRate, value: string) => {
    setCityRates((prev) =>
      prev.map((row, idx) => (idx === cityIndex ? { ...row, [field]: value } : row))
    );
  };

  const handleSave = useCallback(async () => {
    if (!selectedConsignorId || !selectedRouteId) {
      toast.error('Select a consignor and route first');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/api/masters/freight-rates/bulk', {
        consignor_id: Number(selectedConsignorId),
        route_id: Number(selectedRouteId),
        rates: cityRates.map((r) => ({
          city_name: r.city_name,
          rate_10kg: Number(r.rate_10kg) || 0,
          rate_20kg: Number(r.rate_20kg) || 0,
          rate_30kg: Number(r.rate_30kg) || 0,
          rate_40kg: Number(r.rate_40kg) || 0,
          rate_50kg: Number(r.rate_50kg) || 0,
          rate_above_50kg: Number(r.rate_above_50kg) || 0,
        })),
      });
      toast.success('Freight rates saved successfully');
    } catch {
      toast.error('Failed to save freight rates');
    } finally {
      setSaving(false);
    }
  }, [selectedConsignorId, selectedRouteId, cityRates]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Freight Rates Master</h1>

      {/* Selection Panel */}
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Select Consignor & Route</CardTitle>
          <CardDescription>Choose a consignor and route to view and edit city-wise freight rates.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3 items-end">
            <div>
              <Label htmlFor="consignor-select">Consignor</Label>
              <select
                id="consignor-select"
                value={selectedConsignorId}
                onChange={(e) => {
                  setSelectedConsignorId(e.target.value);
                  setSelectedRouteId('');
                  setCityRates([]);
                  setLoaded(false);
                }}
                className="mt-1 h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
              >
                <option value="">— Select Consignor —</option>
                {consignors.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="route-select">Route</Label>
              <select
                id="route-select"
                value={selectedRouteId}
                onChange={(e) => {
                  setSelectedRouteId(e.target.value);
                  setCityRates([]);
                  setLoaded(false);
                }}
                className="mt-1 h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                disabled={!selectedConsignorId}
              >
                <option value="">— Select Route —</option>
                {routes.map((r) => (
                  <option key={r.id} value={String(r.id)}>{r.route_name}</option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              onClick={() => void loadRates()}
              disabled={!selectedConsignorId || !selectedRouteId}
              className="h-10"
            >
              Load Rates
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rate Grid */}
      {loaded && cityRates.length > 0 && (
        <Card className="shadow-md">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                City Rates — {selectedRoute?.route_name}
              </CardTitle>
              <CardDescription>Enter freight rate (₹) for each weight slab per city.</CardDescription>
            </div>
            <Button onClick={() => void handleSave()} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save All Rates'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border-b px-3 py-2 text-left font-semibold text-slate-700 min-w-[140px]">
                      City Name
                    </th>
                    {WEIGHT_COLS.map((col) => (
                      <th key={col.key} className="border-b px-3 py-2 text-center font-semibold text-slate-700 min-w-[90px]">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cityRates.map((row, idx) => (
                    <tr key={row.city_name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border-b px-3 py-1.5 font-medium text-slate-900">{row.city_name}</td>
                      {WEIGHT_COLS.map((col) => (
                        <td key={col.key} className="border-b px-2 py-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={row[col.key]}
                            onChange={(e) => updateRate(idx, col.key, e.target.value)}
                            className="h-8 w-full text-center text-sm"
                            placeholder="0"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex justify-end">
              <Button onClick={() => void handleSave()} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save All Rates'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loaded && cityRates.length === 0 && (
        <Card className="shadow-sm">
          <CardContent className="py-8 text-center text-slate-500">
            No cities found for the selected route. Add cities to this route in Routes Master first.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
