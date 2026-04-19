'use client';

import jsQR from 'jsqr';
import { useCallback, useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ImageUp, LoaderCircle, Upload } from 'lucide-react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface LREntry {
  id: number;
  lr_no: string;
  from_city?: string;
  to_city?: string;
  pod_received?: boolean;
  pod_image_url?: string;
}

function normalizeScanValue(value: string) {
  const trimmed = value.trim();
  const prefixedMatch = trimmed.match(/LR\s*[:\-]\s*([A-Z0-9/_-]+)/i);
  if (prefixedMatch?.[1]) return prefixedMatch[1].trim();
  try {
    const parsed = new URL(trimmed);
    return (
      parsed.searchParams.get('lr_no') ||
      parsed.searchParams.get('lrNo') ||
      parsed.searchParams.get('lr') ||
      parsed.pathname.split('/').filter(Boolean).pop() ||
      trimmed
    ).trim();
  } catch {
    return trimmed;
  }
}

export default function PodUploadPage() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lrNo, setLrNo] = useState('');
  const [podImageUrl, setPodImageUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: lrs = [], mutate } = useSWR<LREntry[]>('/api/daily-entry/lr-entries', apiClient.get);
  const selectedLR = lrs.find((item) => item.lr_no.toUpperCase() === lrNo.trim().toUpperCase());

  const scanQrImageFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setScanning(true);
    try {
      const imageUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = imageUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Unable to read image'));
      });
      const canvas = canvasRef.current || document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to process QR image');
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });
      URL.revokeObjectURL(imageUrl);
      if (!code?.data) throw new Error('QR code not found');
      setLrNo(normalizeScanValue(code.data));
      toast.success('LR QR scanned');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to scan QR');
    } finally {
      setScanning(false);
    }
  }, []);

  const handlePodFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPodImageUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lrNo.trim() || !podImageUrl) {
      toast.error('LR number and POD image are required');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/api/daily-entry/pod-upload', {
        lr_no: normalizeScanValue(lrNo),
        pod_image_url: podImageUrl,
        remarks,
        uploaded_by: user?.email || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      });
      toast.success('POD uploaded');
      setPodImageUrl('');
      setRemarks('');
      mutate();
    } catch {
      toast.error('Failed to upload POD');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">POD Upload</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Search LR and Upload POD</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="pod_lr_no">LR No *</Label>
                <Input id="pod_lr_no" list="pod-lr-options" value={lrNo} onChange={(e) => setLrNo(normalizeScanValue(e.target.value))} />
                <datalist id="pod-lr-options">
                  {lrs.map((item) => <option key={item.id} value={item.lr_no} />)}
                </datalist>
              </div>
              <div>
                <Label htmlFor="pod_qr_image">Scan LR QR Image</Label>
                <Input id="pod_qr_image" type="file" accept="image/*" onChange={(e) => { void scanQrImageFile(e.target.files?.[0] || null); e.currentTarget.value = ''; }} />
              </div>
              <div className="flex items-end">
                <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                  {scanning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
                  {selectedLR ? `${selectedLR.from_city || '-'} to ${selectedLR.to_city || '-'}` : 'Search or scan LR'}
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="pod_file">POD Image *</Label>
                <Input id="pod_file" type="file" accept="image/*,.pdf" onChange={(e) => handlePodFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <Label htmlFor="pod_camera">Camera POD Image</Label>
                <Input id="pod_camera" type="file" accept="image/*" capture="environment" onChange={(e) => handlePodFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            {podImageUrl ? <img src={podImageUrl} alt="POD preview" className="max-h-64 rounded-md border object-contain" /> : null}
            <div>
              <Label htmlFor="pod_remarks">Remark</Label>
              <Textarea id="pod_remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </CardContent>
        </Card>
        <Button type="submit" disabled={saving} className="gap-2"><Upload className="h-4 w-4" /> {saving ? 'Uploading...' : 'Upload POD'}</Button>
      </form>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
