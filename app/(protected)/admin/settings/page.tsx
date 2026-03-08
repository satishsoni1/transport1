'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AdminSettings {
  id: number;
  company_name: string;
  company_email: string;
  company_phone: string;
  address: string;
  gst_no: string;
  logo_url: string;
  signature_url: string;
  transporter_qr_url: string;
  default_gst_rate: number;
  financial_year_start: string;
  timezone: string;
  updated_at: string;
}

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { data, mutate, isLoading } = useSWR<AdminSettings>(
    '/api/admin/settings',
    apiClient.get
  );

  const [formData, setFormData] = useState({
    company_name: '',
    company_email: '',
    company_phone: '',
    address: '',
    gst_no: '',
    logo_url: '',
    signature_url: '',
    transporter_qr_url: '',
    default_gst_rate: '18',
    financial_year_start: '04-01',
    timezone: 'Asia/Kolkata',
  });

  useEffect(() => {
    if (!data) return;
    setFormData({
      company_name: data.company_name || '',
      company_email: data.company_email || '',
      company_phone: data.company_phone || '',
      address: data.address || '',
      gst_no: data.gst_no || '',
      logo_url: data.logo_url || '',
      signature_url: data.signature_url || '',
      transporter_qr_url: data.transporter_qr_url || '',
      default_gst_rate: String(data.default_gst_rate ?? 18),
      financial_year_start: data.financial_year_start || '04-01',
      timezone: data.timezone || 'Asia/Kolkata',
    });
  }, [data]);

  const handleSave = useCallback(async () => {
    try {
      await apiClient.put('/api/admin/settings', {
        ...formData,
        default_gst_rate: parseFloat(formData.default_gst_rate) || 0,
        updated_by: user?.email || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'system',
      });
      toast.success('Settings updated successfully');
      mutate();
    } catch {
      toast.error('Failed to update settings');
    }
  }, [formData, mutate, user]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Administration Settings</h1>
        <Button onClick={handleSave} disabled={isLoading}>
          Save Settings
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="company_email">Company Email</Label>
            <Input
              id="company_email"
              value={formData.company_email}
              onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="company_phone">Company Phone</Label>
            <Input
              id="company_phone"
              value={formData.company_phone}
              onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="gst_no">GST No</Label>
            <Input
              id="gst_no"
              value={formData.gst_no}
              onChange={(e) => setFormData({ ...formData, gst_no: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="signature_url">Authorized Signature URL</Label>
            <Input
              id="signature_url"
              value={formData.signature_url}
              onChange={(e) =>
                setFormData({ ...formData, signature_url: e.target.value })
              }
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="transporter_qr_url">Transporter QR URL (optional)</Label>
            <Input
              id="transporter_qr_url"
              value={formData.transporter_qr_url}
              onChange={(e) =>
                setFormData({ ...formData, transporter_qr_url: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Defaults</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="default_gst_rate">Default GST %</Label>
            <Input
              id="default_gst_rate"
              type="number"
              value={formData.default_gst_rate}
              onChange={(e) => setFormData({ ...formData, default_gst_rate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="financial_year_start">Financial Year Start (MM-DD)</Label>
            <Input
              id="financial_year_start"
              value={formData.financial_year_start}
              onChange={(e) =>
                setFormData({ ...formData, financial_year_start: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
