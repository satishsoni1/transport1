'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, MessageCircle, Send } from 'lucide-react';

interface NotificationSettings {
  email_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  whatsapp_enabled: boolean;
  whatsapp_phone_number_id: string;
  whatsapp_access_token: string;
  notify_lr_created: boolean;
  notify_invoice_created: boolean;
  notify_receipt_created: boolean;
  notify_challan_created: boolean;
  notify_consignor: boolean;
  notify_consignee: boolean;
  notify_compliance_expiry: boolean;
}

const EMPTY: NotificationSettings = {
  email_enabled: false,
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  smtp_from_email: '',
  smtp_from_name: '',
  whatsapp_enabled: false,
  whatsapp_phone_number_id: '',
  whatsapp_access_token: '',
  notify_lr_created: false,
  notify_invoice_created: false,
  notify_receipt_created: false,
  notify_challan_created: false,
  notify_consignor: true,
  notify_consignee: true,
  notify_compliance_expiry: false,
};

function Row({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function NotificationSettingsPage() {
  const { data, mutate, isLoading } = useSWR<NotificationSettings>('/api/settings/notifications', apiClient.get);
  const [form, setForm] = useState<NotificationSettings>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testWhatsAppNumber, setTestWhatsAppNumber] = useState('');

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/api/settings/notifications', form);
      toast.success('Notification settings saved');
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const result = await apiClient.post<{ message: string }>('/api/settings/notifications/test-email', {});
      toast.success(result.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!testWhatsAppNumber.trim()) {
      toast.error('Enter a mobile number to send the test to');
      return;
    }
    setTestingWhatsApp(true);
    try {
      const result = await apiClient.post<{ message: string }>('/api/settings/notifications/test-whatsapp', {
        mobile: testWhatsAppNumber.trim(),
      });
      toast.success(result.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send test WhatsApp message');
    } finally {
      setTestingWhatsApp(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Off and blank by default. Configure your own email and WhatsApp credentials to notify consignors/consignees when documents are created.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email (SMTP)</CardTitle>
          <CardDescription>Use your own SMTP account (e.g. your business email or a Gmail App Password).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row label="Enable email notifications" checked={form.email_enabled} onChange={(v) => setForm({ ...form, email_enabled: v })} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smtp_host">SMTP Host</Label>
              <Input id="smtp_host" placeholder="smtp.gmail.com" value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="smtp_port">SMTP Port</Label>
              <Input id="smtp_port" type="number" value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: Number(e.target.value) || 587 })} />
            </div>
            <div>
              <Label htmlFor="smtp_username">SMTP Username</Label>
              <Input id="smtp_username" value={form.smtp_username} onChange={(e) => setForm({ ...form, smtp_username: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="smtp_password">SMTP Password</Label>
              <Input id="smtp_password" type="password" placeholder={form.smtp_password ? 'Leave unchanged to keep existing' : ''} value={form.smtp_password} onChange={(e) => setForm({ ...form, smtp_password: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="smtp_from_email">From Email</Label>
              <Input id="smtp_from_email" placeholder="noreply@yourcompany.com" value={form.smtp_from_email} onChange={(e) => setForm({ ...form, smtp_from_email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="smtp_from_name">From Name</Label>
              <Input id="smtp_from_name" placeholder="Your Transport Co." value={form.smtp_from_name} onChange={(e) => setForm({ ...form, smtp_from_name: e.target.value })} />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleTestEmail} disabled={testingEmail}>
            <Send className="h-3.5 w-3.5" />
            {testingEmail ? 'Sending...' : 'Send test email'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /> WhatsApp (Meta Cloud API)</CardTitle>
          <CardDescription>Needs a WhatsApp Business phone number and permanent access token from Meta for Developers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row label="Enable WhatsApp notifications" checked={form.whatsapp_enabled} onChange={(v) => setForm({ ...form, whatsapp_enabled: v })} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="whatsapp_phone_number_id">Phone Number ID</Label>
              <Input id="whatsapp_phone_number_id" value={form.whatsapp_phone_number_id} onChange={(e) => setForm({ ...form, whatsapp_phone_number_id: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="whatsapp_access_token">Access Token</Label>
              <Input id="whatsapp_access_token" type="password" placeholder={form.whatsapp_access_token ? 'Leave unchanged to keep existing' : ''} value={form.whatsapp_access_token} onChange={(e) => setForm({ ...form, whatsapp_access_token: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Meta only allows free-form text outside an approved template within a 24-hour window that the customer opened. For reliable delivery in production, set up an approved message template in Meta for Developers.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Mobile number to test (e.g. 9876543210)"
              value={testWhatsAppNumber}
              onChange={(e) => setTestWhatsAppNumber(e.target.value)}
              className="max-w-xs"
            />
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleTestWhatsApp} disabled={testingWhatsApp}>
              <Send className="h-3.5 w-3.5" />
              {testingWhatsApp ? 'Sending...' : 'Send test WhatsApp'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>When to notify</CardTitle>
          <CardDescription>Choose which document events send a notification, and to whom.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Row label="L.R. created" checked={form.notify_lr_created} onChange={(v) => setForm({ ...form, notify_lr_created: v })} />
            <Row label="Invoice created" checked={form.notify_invoice_created} onChange={(v) => setForm({ ...form, notify_invoice_created: v })} />
            <Row label="Receipt recorded" checked={form.notify_receipt_created} onChange={(v) => setForm({ ...form, notify_receipt_created: v })} />
            <Row label="Challan created" checked={form.notify_challan_created} onChange={(v) => setForm({ ...form, notify_challan_created: v })} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Row label="Notify consignor" hint="Bill-to party" checked={form.notify_consignor} onChange={(v) => setForm({ ...form, notify_consignor: v })} />
            <Row label="Notify consignee" hint="Delivery party" checked={form.notify_consignee} onChange={(v) => setForm({ ...form, notify_consignee: v })} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Row
              label="Compliance expiry alerts"
              hint="Enables the 'Email This List' button on the Compliance page"
              checked={form.notify_compliance_expiry}
              onChange={(v) => setForm({ ...form, notify_compliance_expiry: v })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
      </div>
    </div>
  );
}
