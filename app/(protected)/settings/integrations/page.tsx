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
import { CreditCard, FileCheck2, MapPinned, Sparkles } from 'lucide-react';

interface IntegrationSettings {
  payment: {
    enabled: boolean;
    key_id: string;
    key_secret: string;
    webhook_secret: string;
  };
  gst: {
    environment: string;
    api_base_url: string;
    client_id: string;
    client_secret: string;
    gstin: string;
    eway_bill_enabled: boolean;
    einvoice_enabled: boolean;
  };
  gps: {
    enabled: boolean;
    api_base_url: string;
    client_id: string;
    client_secret: string;
  };
  ai: {
    enabled: boolean;
    api_key: string;
    chat_model: string;
    vision_model: string;
  };
}

const EMPTY: IntegrationSettings = {
  payment: { enabled: false, key_id: '', key_secret: '', webhook_secret: '' },
  gst: {
    environment: 'sandbox',
    api_base_url: '',
    client_id: '',
    client_secret: '',
    gstin: '',
    eway_bill_enabled: false,
    einvoice_enabled: false,
  },
  gps: { enabled: false, api_base_url: '', client_id: '', client_secret: '' },
  ai: { enabled: false, api_key: '', chat_model: 'llama-3.3-70b-versatile', vision_model: 'meta-llama/llama-4-scout-17b-16e-instruct' },
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

export default function IntegrationsSettingsPage() {
  const { data, isLoading } = useSWR<IntegrationSettings>('/api/settings/integrations', apiClient.get);
  const [form, setForm] = useState<IntegrationSettings>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/api/settings/integrations', form);
      toast.success('Integration settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Off by default. Add your own provider credentials to enable online payments, GST e-way
          bill/e-invoice generation, and live GPS tracking.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Payment Gateway (Razorpay)</CardTitle>
          <CardDescription>Lets consignors pay invoices online from the consignor portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row label="Enable online payments" checked={form.payment.enabled} onChange={(v) => setForm({ ...form, payment: { ...form.payment, enabled: v } })} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rzp_key_id">Key ID</Label>
              <Input id="rzp_key_id" value={form.payment.key_id} onChange={(e) => setForm({ ...form, payment: { ...form.payment, key_id: e.target.value } })} />
            </div>
            <div>
              <Label htmlFor="rzp_key_secret">Key Secret</Label>
              <Input
                id="rzp_key_secret"
                type="password"
                placeholder={form.payment.key_secret ? 'Leave unchanged to keep existing' : ''}
                value={form.payment.key_secret}
                onChange={(e) => setForm({ ...form, payment: { ...form.payment, key_secret: e.target.value } })}
              />
            </div>
            <div>
              <Label htmlFor="rzp_webhook_secret">Webhook Secret</Label>
              <Input
                id="rzp_webhook_secret"
                type="password"
                placeholder={form.payment.webhook_secret ? 'Leave unchanged to keep existing' : ''}
                value={form.payment.webhook_secret}
                onChange={(e) => setForm({ ...form, payment: { ...form.payment, webhook_secret: e.target.value } })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Register <code>{typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/webhook</code> with the{' '}
            <code>payment.captured</code> event in your Razorpay Dashboard webhooks, using the same Webhook Secret entered above.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" /> GST E-Way Bill / E-Invoice (Masters India)</CardTitle>
          <CardDescription>
            Verify the API base URL and endpoint paths against your Masters India developer account before relying on this for real filings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Row label="Enable e-way bill generation" checked={form.gst.eway_bill_enabled} onChange={(v) => setForm({ ...form, gst: { ...form.gst, eway_bill_enabled: v } })} />
            <Row label="Enable e-invoice generation" checked={form.gst.einvoice_enabled} onChange={(v) => setForm({ ...form, gst: { ...form.gst, einvoice_enabled: v } })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gst_gstin">Your Company GSTIN</Label>
              <Input id="gst_gstin" value={form.gst.gstin} onChange={(e) => setForm({ ...form, gst: { ...form.gst, gstin: e.target.value } })} />
            </div>
            <div>
              <Label htmlFor="gst_api_base_url">API Base URL</Label>
              <Input id="gst_api_base_url" placeholder="https://api.mastersindia.co" value={form.gst.api_base_url} onChange={(e) => setForm({ ...form, gst: { ...form.gst, api_base_url: e.target.value } })} />
            </div>
            <div>
              <Label htmlFor="gst_client_id">Client ID</Label>
              <Input id="gst_client_id" value={form.gst.client_id} onChange={(e) => setForm({ ...form, gst: { ...form.gst, client_id: e.target.value } })} />
            </div>
            <div>
              <Label htmlFor="gst_client_secret">Client Secret</Label>
              <Input
                id="gst_client_secret"
                type="password"
                placeholder={form.gst.client_secret ? 'Leave unchanged to keep existing' : ''}
                value={form.gst.client_secret}
                onChange={(e) => setForm({ ...form, gst: { ...form.gst, client_secret: e.target.value } })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPinned className="h-5 w-5" /> GPS Tracking (MapmyIndia / Mappls)</CardTitle>
          <CardDescription>
            Also set each vehicle&apos;s GPS Device ID in Vehicles Master so its position can be looked up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row label="Enable GPS tracking" checked={form.gps.enabled} onChange={(v) => setForm({ ...form, gps: { ...form.gps, enabled: v } })} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gps_api_base_url">API Base URL</Label>
              <Input id="gps_api_base_url" placeholder="https://apis.mappls.com" value={form.gps.api_base_url} onChange={(e) => setForm({ ...form, gps: { ...form.gps, api_base_url: e.target.value } })} />
            </div>
            <div>
              <Label htmlFor="gps_client_id">Client ID</Label>
              <Input id="gps_client_id" value={form.gps.client_id} onChange={(e) => setForm({ ...form, gps: { ...form.gps, client_id: e.target.value } })} />
            </div>
            <div>
              <Label htmlFor="gps_client_secret">Client Secret</Label>
              <Input
                id="gps_client_secret"
                type="password"
                placeholder={form.gps.client_secret ? 'Leave unchanged to keep existing' : ''}
                value={form.gps.client_secret}
                onChange={(e) => setForm({ ...form, gps: { ...form.gps, client_secret: e.target.value } })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> AI Assistant (Groq)</CardTitle>
          <CardDescription>
            Powers the in-app chat assistant and AI document scanning (driver license / vehicle RC).
            Get a free API key at <code>console.groq.com</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row label="Enable AI Assistant" checked={form.ai.enabled} onChange={(v) => setForm({ ...form, ai: { ...form.ai, enabled: v } })} />
          <div>
            <Label htmlFor="ai_api_key">Groq API Key</Label>
            <Input
              id="ai_api_key"
              type="password"
              placeholder={form.ai.api_key ? 'Leave unchanged to keep existing' : 'gsk_...'}
              value={form.ai.api_key}
              onChange={(e) => setForm({ ...form, ai: { ...form.ai, api_key: e.target.value } })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ai_chat_model">Chat Model</Label>
              <Input id="ai_chat_model" value={form.ai.chat_model} onChange={(e) => setForm({ ...form, ai: { ...form.ai, chat_model: e.target.value } })} />
            </div>
            <div>
              <Label htmlFor="ai_vision_model">Vision Model (for OCR)</Label>
              <Input id="ai_vision_model" value={form.ai.vision_model} onChange={(e) => setForm({ ...form, ai: { ...form.ai, vision_model: e.target.value } })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
      </div>
    </div>
  );
}
