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
  lr_prefix: string;
  invoice_prefix: string;
  lr_print_format: 'classic' | 'compact' | 'detailed';
  invoice_print_format: 'classic' | 'compact' | 'detailed';
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
    lr_prefix: '',
    invoice_prefix: '',
    lr_print_format: 'classic',
    invoice_print_format: 'classic',
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
      lr_prefix: data.lr_prefix || '',
      invoice_prefix: data.invoice_prefix || '',
      lr_print_format: data.lr_print_format || 'classic',
      invoice_print_format: data.invoice_print_format || 'classic',
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

  const handleFileUpload = useCallback(
    (field: 'logo_url' | 'signature_url' | 'transporter_qr_url', file: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        setFormData((prev) => ({ ...prev, [field]: result }));
      };
      reader.readAsDataURL(file);
    },
    []
  );

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
          <div className="space-y-2">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
            />
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload('logo_url', e.target.files?.[0] || null)}
            />
            {formData.logo_url ? (
              <img src={formData.logo_url} alt="Logo" className="h-12 w-auto border rounded p-1" />
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="signature_url">Authorized Signature URL</Label>
            <Input
              id="signature_url"
              value={formData.signature_url}
              onChange={(e) =>
                setFormData({ ...formData, signature_url: e.target.value })
              }
            />
            <Input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleFileUpload('signature_url', e.target.files?.[0] || null)
              }
            />
            {formData.signature_url ? (
              <img
                src={formData.signature_url}
                alt="Signature"
                className="h-12 w-auto border rounded p-1"
              />
            ) : null}
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="transporter_qr_url">Transporter QR URL (optional)</Label>
            <Input
              id="transporter_qr_url"
              value={formData.transporter_qr_url}
              onChange={(e) =>
                setFormData({ ...formData, transporter_qr_url: e.target.value })
              }
            />
            <Input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleFileUpload('transporter_qr_url', e.target.files?.[0] || null)
              }
            />
            {formData.transporter_qr_url ? (
              <img
                src={formData.transporter_qr_url}
                alt="Transport QR"
                className="h-16 w-16 border rounded p-1"
              />
            ) : null}
          </div>
          <div>
            <Label htmlFor="lr_prefix">LR Prefix (optional)</Label>
            <Input
              id="lr_prefix"
              value={formData.lr_prefix}
              onChange={(e) => setFormData({ ...formData, lr_prefix: e.target.value.toUpperCase() })}
              placeholder="LR"
            />
          </div>
          <div>
            <Label htmlFor="invoice_prefix">Invoice Prefix (optional)</Label>
            <Input
              id="invoice_prefix"
              value={formData.invoice_prefix}
              onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value.toUpperCase() })}
              placeholder="INV"
            />
          </div>
          <div>
            <Label htmlFor="lr_print_format">LR Print Format</Label>
            <select
              id="lr_print_format"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={formData.lr_print_format}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  lr_print_format: e.target.value as 'classic' | 'compact' | 'detailed',
                })
              }
            >
              <option value="classic">Classic</option>
              <option value="compact">Compact</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>
          <div>
            <Label htmlFor="invoice_print_format">Invoice Print Format</Label>
            <select
              id="invoice_print_format"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={formData.invoice_print_format}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  invoice_print_format: e.target.value as 'classic' | 'compact' | 'detailed',
                })
              }
            >
              <option value="classic">Classic</option>
              <option value="compact">Compact</option>
              <option value="detailed">Detailed</option>
            </select>
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
