'use client';

import jsQR from 'jsqr';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Camera, Plus, ScanLine, Trash2, Edit2, Printer, ImageUp, LoaderCircle, X } from 'lucide-react';
import useSWR from 'swr';
import { transliterateToMarathi } from '@/app/services/marathi';
import {
  generateInvoicePrintHTML,
  printHTML,
  type CompanyPrintData,
} from '@/app/services/print-service';

interface InvoiceItem {
  description: string;
  lr_no: string;
  lr_date?: string;
  city?: string;
  invoice_no?: string;
  consignee?: string;
  qty: number;
  rate: number;
  amount: number;
}

interface AdditionalCharge {
  charge_name: string;
  remark: string;
  amount: number;
}

interface Consignor {
  id: number;
  name: string;
}

interface LREntryApi {
  id: number;
  lr_no: string;
  lr_date: string;
  consignor_id: number;
  to_city?: string;
  invoice_no?: string;
  freight: number;
  status: 'to_pay' | 'paid' | 'tbb';
  pod_received?: boolean;
  return_status?: 'normal' | 'returned';
  goods_items: Array<{ description?: string; qty?: number; rate?: number }>;
}

interface Invoice {
  id: number;
  invoice_no: string;
  invoice_date: string;
  party_name: string;
  consignor_id: number;
  gst_percentage: number;
  remarks: string;
  items: InvoiceItem[];
  additional_charges?: AdditionalCharge[];
  total_amount: number;
  gst_amount: number;
  net_amount: number;
  status: 'draft' | 'issued' | 'paid';
  created_by?: string;
  created_at: string;
}

interface AdminSettings extends CompanyPrintData {
  default_gst_rate?: number;
}

function normalizeLrNo(value: string) {
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

export default function InvoicePage() {
  const { user } = useAuth();
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const invoiceCameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const invoiceCameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const invoiceCameraStreamRef = useRef<MediaStream | null>(null);
  const invoiceCameraFrameRef = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [consignorSearch, setConsignorSearch] = useState('');
  const [qrScanning, setQrScanning] = useState(false);
  const [invoiceCameraOpen, setInvoiceCameraOpen] = useState(false);
  const [invoiceCameraStarting, setInvoiceCameraStarting] = useState(false);
  const [invoiceCameraError, setInvoiceCameraError] = useState('');
  const [lrDateFilter, setLrDateFilter] = useState({
    from_date: '',
    to_date: '',
    freight_type: 'to_pay',
  });

  const [formData, setFormData] = useState({
    consignor_id: '',
    party_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    gst_percentage: '18',
    remarks: '',
  });

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [currentItem, setCurrentItem] = useState<InvoiceItem>({
    description: '',
    lr_no: '',
    lr_date: '',
    city: '',
    invoice_no: '',
    consignee: '',
    qty: 0,
    rate: 0,
    amount: 0,
  });
  const [currentCharge, setCurrentCharge] = useState<AdditionalCharge>({
    charge_name: '',
    remark: '',
    amount: 0,
  });

  const { data: invoices = [], mutate } = useSWR<Invoice[]>(
    '/api/daily-entry/invoices',
    apiClient.get
  );
  const { data: consignors = [] } = useSWR<Consignor[]>(
    '/api/masters/consignors',
    apiClient.get
  );
  const { data: lrEntries = [] } = useSWR<LREntryApi[]>(
    '/api/daily-entry/lr-entries',
    apiClient.get
  );
  const { data: settings } = useSWR<AdminSettings>(
    '/api/admin/settings',
    apiClient.get
  );
  const { data: freightRateMap } = useSWR<Record<string, {
    rate_10kg: number; rate_20kg: number; rate_30kg: number;
    rate_40kg: number; rate_50kg: number; rate_above_50kg: number;
  }>>(
    formData.consignor_id
      ? `/api/masters/freight-rates/lookup?consignor_id=${formData.consignor_id}`
      : null,
    apiClient.get
  );

  useEffect(() => {
    if (editingId) return;
    if (settings?.default_gst_rate === undefined) return;
    setFormData((prev) => ({
      ...prev,
      gst_percentage: String(settings.default_gst_rate ?? 18),
    }));
  }, [editingId, settings?.default_gst_rate]);

  const calculateTotals = useCallback(() => {
    const itemsTotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const chargesTotal = additionalCharges.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );
    const subtotal = itemsTotal + chargesTotal;
    const gstPercent = parseFloat(formData.gst_percentage) || 0;
    const gstAmount = (subtotal * gstPercent) / 100;
    return {
      itemsTotal,
      chargesTotal,
      subtotal,
      gstAmount,
      netAmount: subtotal + gstAmount,
    };
  }, [invoiceItems, additionalCharges, formData.gst_percentage]);

  const availableLREntries = lrEntries.filter(
    (entry) => {
      const lrDate = entry.lr_date ? new Date(entry.lr_date) : null;
      const fromDate = lrDateFilter.from_date ? new Date(lrDateFilter.from_date) : null;
      const toDate = lrDateFilter.to_date ? new Date(lrDateFilter.to_date) : null;
      const matchesFrom = !fromDate || (lrDate && lrDate >= fromDate);
      const matchesTo =
        !toDate ||
        (lrDate &&
          lrDate <= new Date(`${lrDateFilter.to_date}T23:59:59`));

      const usedInAnotherInvoice = invoices.some(
        (invoice) =>
          invoice.id !== editingId &&
          (invoice.items || []).some((item) => item.lr_no === entry.lr_no)
      );

      return (
      String(entry.consignor_id) === formData.consignor_id &&
      (!lrDateFilter.freight_type || entry.status === lrDateFilter.freight_type) &&
      entry.return_status !== 'returned' &&
      !usedInAnotherInvoice &&
      !invoiceItems.some((item) => item.lr_no === entry.lr_no) &&
      matchesFrom &&
      matchesTo
      );
    }
  );

  const addInvoiceItem = useCallback(() => {
    if (!currentItem.lr_no) {
      toast.error('Please select L.R. No');
      return;
    }
    if (!currentItem.description) {
      toast.error('Description is required');
      return;
    }
    if (currentItem.qty <= 0 || currentItem.rate < 0) {
      toast.error('Qty/Rate must be valid');
      return;
    }
    if (invoiceItems.some((item) => item.lr_no === currentItem.lr_no)) {
      toast.error('This L.R. is already added');
      return;
    }

    const duplicateInvoice = invoices.find(
      (invoice) =>
        invoice.id !== editingId &&
        (invoice.items || []).some((item) => item.lr_no === currentItem.lr_no)
    );
    if (duplicateInvoice) {
      toast.error(`This L.R. is already used in invoice ${duplicateInvoice.invoice_no}`);
      return;
    }

    setInvoiceItems([
      ...invoiceItems,
      {
        ...currentItem,
        amount: currentItem.qty * currentItem.rate,
      },
    ]);
    setCurrentItem({
      description: '',
      lr_no: '',
      lr_date: '',
      city: '',
      invoice_no: '',
      consignee: '',
      qty: 0,
      rate: 0,
      amount: 0,
    });
    toast.success('Item added');
  }, [currentItem, invoiceItems, invoices, editingId]);

  const buildInvoiceItemFromLR = useCallback((entry: LREntryApi): InvoiceItem => {
    const qty = (entry.goods_items || []).reduce(
      (sum, item) => sum + (Number(item.qty) || 0),
      0
    );
    const firstDescription =
      entry.goods_items.find((item) => item.description)?.description || 'Goods from LR';
    const lrFreight = Number(entry.freight) || 0;

    // Try rate master: pick rate band based on total weight if available
    let rate = qty > 0 ? lrFreight / qty : lrFreight;
    if (freightRateMap && entry.to_city) {
      const band = freightRateMap[entry.to_city.toLowerCase()];
      if (band) {
        const totalWeight = (entry.goods_items || []).reduce(
          (s, item) => s + (Number((item as any).weight_kg) || 0), 0
        );
        const bandRate =
          totalWeight <= 10 ? band.rate_10kg :
          totalWeight <= 20 ? band.rate_20kg :
          totalWeight <= 30 ? band.rate_30kg :
          totalWeight <= 40 ? band.rate_40kg :
          totalWeight <= 50 ? band.rate_50kg :
          band.rate_above_50kg;
        if (bandRate > 0) {
          rate = bandRate;
        }
      }
    }

    const finalQty = qty || 1;
    return {
      lr_no: entry.lr_no,
      lr_date: entry.lr_date || '',
      city: entry.to_city || '',
      invoice_no: entry.invoice_no || '',
      consignee: firstDescription,
      description: firstDescription,
      qty: finalQty,
      rate,
      amount: finalQty * rate,
    };
  }, [freightRateMap]);

  const scanQrImageFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setQrScanning(true);
    try {
      const imageUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = imageUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Unable to read image'));
      });
      const canvas = qrCanvasRef.current || document.createElement('canvas');
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
      const scannedNo = normalizeLrNo(code.data);
      const entry = availableLREntries.find((item) => item.lr_no === scannedNo);
      if (!entry) {
        toast.error(`L.R. ${scannedNo} not found or not available`);
        return;
      }
      if (invoiceItems.some((item) => item.lr_no === scannedNo)) {
        toast.error('This L.R. is already added');
        return;
      }
      setInvoiceItems((prev) => [...prev, buildInvoiceItemFromLR(entry)]);
      toast.success(`L.R. ${scannedNo} added to invoice`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to scan QR');
    } finally {
      setQrScanning(false);
    }
  }, [availableLREntries, invoiceItems, buildInvoiceItemFromLR]);

  const stopInvoiceCamera = useCallback(() => {
    if (invoiceCameraFrameRef.current) { cancelAnimationFrame(invoiceCameraFrameRef.current); invoiceCameraFrameRef.current = null; }
    if (invoiceCameraStreamRef.current) { invoiceCameraStreamRef.current.getTracks().forEach((t) => t.stop()); invoiceCameraStreamRef.current = null; }
    if (invoiceCameraVideoRef.current) invoiceCameraVideoRef.current.srcObject = null;
    setInvoiceCameraOpen(false);
    setInvoiceCameraStarting(false);
  }, []);

  // Keep the scan handler in a ref so the scan loop always uses the latest LR list
  const addLRToInvoiceRef = useRef<(lrNo: string) => void>(() => {});
  useEffect(() => {
    addLRToInvoiceRef.current = (lrNo: string) => {
      const entry = availableLREntries.find((item) => item.lr_no === lrNo);
      if (!entry) { toast.error(`L.R. ${lrNo} not found or not available`); return; }
      if (invoiceItems.some((item) => item.lr_no === lrNo)) { toast.error('L.R. already added'); return; }
      setInvoiceItems((prev) => [...prev, buildInvoiceItemFromLR(entry)]);
      toast.success(`L.R. ${lrNo} added to invoice`);
    };
  }, [availableLREntries, invoiceItems, buildInvoiceItemFromLR]);

  const startInvoiceCamera = useCallback(async () => {
    if (!formData.consignor_id) { toast.error('Select consignor first'); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setInvoiceCameraError('Camera not available.'); return; }
    setInvoiceCameraError('');
    setInvoiceCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      invoiceCameraStreamRef.current = stream;
      setInvoiceCameraOpen(true); // video element mounts after re-render → useEffect below attaches stream
    } catch (err) {
      setInvoiceCameraError(err instanceof Error ? err.message : 'Unable to start camera');
    } finally {
      setInvoiceCameraStarting(false);
    }
  }, [formData.consignor_id]);

  // After invoiceCameraOpen=true the video element is in the DOM — attach stream and start scan loop
  useEffect(() => {
    if (!invoiceCameraOpen) return;
    const video = invoiceCameraVideoRef.current;
    const canvas = invoiceCameraCanvasRef.current;
    const stream = invoiceCameraStreamRef.current;
    if (!video || !canvas || !stream) return;

    video.srcObject = stream;
    void video.play().catch(() => {});

    let frameId: number;
    let stopped = false;

    const scanFrame = () => {
      if (stopped) return;
      const v = invoiceCameraVideoRef.current;
      const c = invoiceCameraCanvasRef.current;
      if (!v || !c || v.readyState < 2 || !v.videoWidth || !v.videoHeight) {
        frameId = requestAnimationFrame(scanFrame);
        return;
      }
      const ctx = c.getContext('2d');
      if (!ctx) { frameId = requestAnimationFrame(scanFrame); return; }
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      ctx.drawImage(v, 0, 0, c.width, c.height);
      try {
        const imageData = ctx.getImageData(0, 0, c.width, c.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
        if (code?.data) {
          const lrNo = normalizeLrNo(code.data);
          stopInvoiceCamera();
          addLRToInvoiceRef.current(lrNo);
          return;
        }
      } catch { /* continue scanning */ }
      frameId = requestAnimationFrame(scanFrame);
    };

    frameId = requestAnimationFrame(scanFrame);
    invoiceCameraFrameRef.current = frameId;

    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      invoiceCameraFrameRef.current = null;
    };
  }, [invoiceCameraOpen, stopInvoiceCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (invoiceCameraFrameRef.current) cancelAnimationFrame(invoiceCameraFrameRef.current);
      if (invoiceCameraStreamRef.current) invoiceCameraStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const addFilteredLrs = useCallback(() => {
    if (!formData.consignor_id) {
      toast.error('Select consignor first');
      return;
    }
    if (availableLREntries.length === 0) {
      toast.error('No filtered LR available');
      return;
    }
    setInvoiceItems((prev) => [...prev, ...availableLREntries.map(buildInvoiceItemFromLR)]);
    toast.success(`${availableLREntries.length} LR added to invoice`);
  }, [availableLREntries, buildInvoiceItemFromLR, formData.consignor_id]);

  const addAdditionalCharge = useCallback(() => {
    if (!currentCharge.charge_name.trim()) {
      toast.error('Charge name is required');
      return;
    }
    if ((Number(currentCharge.amount) || 0) <= 0) {
      toast.error('Charge amount must be greater than zero');
      return;
    }

    setAdditionalCharges((prev) => [
      ...prev,
      {
        charge_name: currentCharge.charge_name.trim(),
        remark: currentCharge.remark.trim(),
        amount: Number(currentCharge.amount) || 0,
      },
    ]);
    setCurrentCharge({ charge_name: '', remark: '', amount: 0 });
    toast.success('Additional charge added');
  }, [currentCharge]);

  const removeAdditionalCharge = useCallback((index: number) => {
    setAdditionalCharges((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeInvoiceItem = useCallback(
    (index: number) => {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    },
    [invoiceItems]
  );

  const handleEdit = useCallback(
    (invoice: Invoice) => {
      const consignor = consignors.find((item) => item.id === invoice.consignor_id);
      setEditingId(invoice.id);
      setConsignorSearch(consignor?.name || '');
      setFormData({
        consignor_id: String(invoice.consignor_id),
        party_name: invoice.party_name || '',
        invoice_date: invoice.invoice_date
          ? String(invoice.invoice_date).split('T')[0]
          : '',
        gst_percentage: String(invoice.gst_percentage ?? 0),
        remarks: invoice.remarks || '',
      });
      setInvoiceItems(
        (invoice.items || []).map((item) => ({
          description: item.description || '',
          lr_no: item.lr_no || '',
          lr_date: item.lr_date || '',
          city: item.city || '',
          invoice_no: item.invoice_no || '',
          consignee: item.consignee || '',
          qty: Number(item.qty) || 0,
          rate: Number(item.rate) || 0,
          amount: Number(item.amount) || 0,
        }))
      );
      setAdditionalCharges(
        (invoice.additional_charges || []).map((item) => ({
          charge_name: item.charge_name || '',
          remark: item.remark || '',
          amount: Number(item.amount) || 0,
        }))
      );
      setCurrentItem({
        description: '',
        lr_no: '',
        lr_date: '',
        city: '',
        invoice_no: '',
        consignee: '',
        qty: 0,
        rate: 0,
        amount: 0,
      });
      setCurrentCharge({ charge_name: '', remark: '', amount: 0 });
      setActiveTab('form');
    },
    [consignors]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.consignor_id || !formData.party_name) {
        toast.error('Please fill required fields');
        return;
      }

      if (invoiceItems.length === 0) {
        toast.error('Please add at least one invoice item');
        return;
      }

      try {
        const totals = calculateTotals();
        const payload = {
          consignor_id: parseInt(formData.consignor_id, 10),
          party_name: formData.party_name,
          invoice_date: formData.invoice_date,
          gst_percentage: parseFloat(formData.gst_percentage),
          remarks: formData.remarks,
          items: invoiceItems,
          additional_charges: additionalCharges,
          total_amount: totals.subtotal,
          gst_amount: totals.gstAmount,
          net_amount: totals.netAmount,
          created_by: user?.email || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        };

        if (editingId) {
          await apiClient.put(`/api/daily-entry/invoices/${editingId}`, payload);
          toast.success('Invoice updated successfully');
        } else {
          await apiClient.post('/api/daily-entry/invoices', payload);
          toast.success('Invoice created successfully');
        }

        mutate();
        setActiveTab('list');
        setEditingId(null);
        setInvoiceItems([]);
        setAdditionalCharges([]);
        setCurrentItem({
          description: '',
          lr_no: '',
          lr_date: '',
          city: '',
          invoice_no: '',
          consignee: '',
          qty: 0,
          rate: 0,
          amount: 0,
        });
        setCurrentCharge({ charge_name: '', remark: '', amount: 0 });
      } catch (error) {
        toast.error('Failed to save invoice');
      }
    },
    [editingId, formData, invoiceItems, additionalCharges, calculateTotals, mutate]
  );

  const handlePrint = useCallback(
    (invoice: Invoice) => {
      try {
        const consignor = consignors.find((item) => item.id === invoice.consignor_id);
        const html = generateInvoicePrintHTML({
          ...invoice,
          party_name_mr: consignor?.name ? transliterateToMarathi(consignor.name) : transliterateToMarathi(invoice.party_name || ''),
          format: settings?.invoice_print_format || 'classic',
          company: settings,
        });
        printHTML(html);
      } catch (error) {
        toast.error('Failed to print invoice');
      }
    },
    [consignors, settings]
  );

  const totals = calculateTotals();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Invoice Management</h1>
        {activeTab === 'list' && (
          <Button
            onClick={() => {
              setActiveTab('form');
              setEditingId(null);
              setInvoiceItems([]);
              setAdditionalCharges([]);
              setConsignorSearch('');
              setLrDateFilter({ from_date: '', to_date: '', freight_type: 'to_pay' });
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        )}
      </div>

      {activeTab === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="consignor_name">Consignor *</Label>
                  <Input
                    id="consignor_name"
                    list="consignor-options"
                    value={consignorSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setConsignorSearch(value);
                      const selected = consignors.find(
                        (item) => item.name.toLowerCase() === value.trim().toLowerCase()
                      );
                      setFormData({
                        ...formData,
                        consignor_id: selected ? String(selected.id) : '',
                        party_name: selected ? selected.name : formData.party_name,
                      });
                      setInvoiceItems([]);
                      setAdditionalCharges([]);
                      setLrDateFilter({ from_date: '', to_date: '', freight_type: 'to_pay' });
                      setCurrentItem({
                        description: '',
                        lr_no: '',
                        lr_date: '',
                        city: '',
                        invoice_no: '',
                        consignee: '',
                        qty: 0,
                        rate: 0,
                        amount: 0,
                      });
                    }}
                    placeholder="Type consignor name"
                  />
                  <datalist id="consignor-options">
                    {consignors.map((item) => (
                      <option key={item.id} value={item.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="party_name">Party Name *</Label>
                  <Input
                    id="party_name"
                    value={formData.party_name}
                    onChange={(e) =>
                      setFormData({ ...formData, party_name: e.target.value })
                    }
                    placeholder="Enter party name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="invoice_date">Invoice Date *</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoice_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="gst_percentage">GST Percentage %</Label>
                  <Input
                    id="gst_percentage"
                    type="number"
                    step="0.01"
                    value={formData.gst_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gst_percentage: e.target.value,
                      })
                    }
                    placeholder="18"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="lr_from_date">LR From Date</Label>
                  <Input
                    id="lr_from_date"
                    type="date"
                    value={lrDateFilter.from_date}
                    onChange={(e) =>
                      setLrDateFilter((prev) => ({ ...prev, from_date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="lr_to_date">LR To Date</Label>
                  <Input
                    id="lr_to_date"
                    type="date"
                    value={lrDateFilter.to_date}
                    onChange={(e) =>
                      setLrDateFilter((prev) => ({ ...prev, to_date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="lr_freight_type">Freight Type</Label>
                  <select
                    id="lr_freight_type"
                    value={lrDateFilter.freight_type}
                    onChange={(e) =>
                      setLrDateFilter((prev) => ({ ...prev, freight_type: e.target.value }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="to_pay">To Pay</option>
                    <option value="">All LR Status</option>
                    <option value="paid">Paid</option>
                    <option value="tbb">TBB</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label>Available LRs</Label>
                  <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {formData.consignor_id
                      ? `${availableLREntries.length} LR found for selected consignor`
                      : 'Select consignor first to search LR'}
                  </div>
                </div>
                <div>
                  <Label>&nbsp;</Label>
                  <Button type="button" onClick={addFilteredLrs} className="w-full">
                    Get LR
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { void scanQrImageFile(e.target.files?.[0] || null); e.currentTarget.value = ''; }}
                  className="flex-1"
                />
                <div className="flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
                  {qrScanning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
                  Scan LR QR
                </div>
                <Button
                  type="button"
                  variant={invoiceCameraOpen ? 'destructive' : 'outline'}
                  className="gap-1 shrink-0"
                  onClick={() => { if (invoiceCameraOpen) { stopInvoiceCamera(); } else { void startInvoiceCamera(); } }}
                  disabled={invoiceCameraStarting}
                >
                  {invoiceCameraStarting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : invoiceCameraOpen ? <><X className="h-4 w-4" />Stop</> : <><Camera className="h-4 w-4" />Camera</>}
                </Button>
                <canvas ref={qrCanvasRef} className="hidden" />
                <canvas ref={invoiceCameraCanvasRef} className="hidden" />
              </div>
              {invoiceCameraOpen && (
                <div className="mb-2 overflow-hidden rounded-lg border bg-black">
                  <div className="relative aspect-video w-full max-w-sm">
                    <video ref={invoiceCameraVideoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="h-32 w-32 rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-black/40 px-2 py-1 text-center text-xs text-white">
                      <ScanLine className="mr-1 inline h-3 w-3" />Align LR QR inside the box
                    </div>
                  </div>
                </div>
              )}
              {invoiceCameraError && (
                <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{invoiceCameraError}</div>
              )}
              <div className="overflow-x-auto"><div className="min-w-[480px] grid grid-cols-6 gap-2 mb-4">
                <Input
                  placeholder="L.R. No"
                  list="invoice-lr-options"
                  value={currentItem.lr_no}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    const entry = availableLREntries.find((item) => item.lr_no === value);
                    if (!entry) {
                      setCurrentItem({ ...currentItem, lr_no: value });
                      return;
                    }
                    setCurrentItem(buildInvoiceItemFromLR(entry));
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInvoiceItem(); } }}
                />
                <datalist id="invoice-lr-options">
                  {availableLREntries.map((item) => (
                    <option key={item.id} value={item.lr_no} />
                  ))}
                </datalist>
                <Input
                  placeholder="Description"
                  value={currentItem.description}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      description: e.target.value,
                    })
                  }
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInvoiceItem(); } }}
                  className="col-span-2"
                />
                <Input
                  placeholder="Qty"
                  type="number"
                  value={currentItem.qty}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      qty: parseFloat(e.target.value) || 0,
                    })
                  }
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInvoiceItem(); } }}
                />
                <Input
                  placeholder="Rate"
                  type="number"
                  value={currentItem.rate}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInvoiceItem(); } }}
                />
                <Button type="button" onClick={addInvoiceItem} className="w-full">
                  Add
                </Button>
              </div></div>

              {invoiceItems.length > 0 && (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>L.R. No</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.lr_no}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.qty}</TableCell>
                          <TableCell>₹{item.rate.toFixed(2)}</TableCell>
                          <TableCell>₹{item.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeInvoiceItem(idx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-md">
                    <div>
                      <p className="text-sm text-gray-600">Items Total</p>
                      <p className="text-lg font-semibold">
                        ₹{totals.itemsTotal.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Additional Charges</p>
                      <p className="text-lg font-semibold">
                        ₹{totals.chargesTotal.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Subtotal</p>
                      <p className="text-lg font-semibold">
                        ₹{totals.subtotal.toFixed(2)}
                      </p>
                    </div>
                    <div className="md:col-span-1">
                      <p className="text-sm text-gray-600">
                        GST ({formData.gst_percentage}%)
                      </p>
                      <p className="text-lg font-semibold">
                        ₹{totals.gstAmount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Net Amount</p>
                      <p className="text-lg font-bold text-blue-600">
                        ₹{totals.netAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Charges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <Input
                  placeholder="Charge Name"
                  value={currentCharge.charge_name}
                  onChange={(e) =>
                    setCurrentCharge((prev) => ({ ...prev, charge_name: e.target.value }))
                  }
                />
                <Input
                  placeholder="Remark"
                  value={currentCharge.remark}
                  onChange={(e) =>
                    setCurrentCharge((prev) => ({ ...prev, remark: e.target.value }))
                  }
                />
                <Input
                  placeholder="Amount"
                  type="number"
                  value={currentCharge.amount}
                  onChange={(e) =>
                    setCurrentCharge((prev) => ({
                      ...prev,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
                <Button type="button" onClick={addAdditionalCharge}>
                  Add Charge
                </Button>
              </div>

              {additionalCharges.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Charge</TableHead>
                      <TableHead>Remark</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {additionalCharges.map((charge, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{charge.charge_name}</TableCell>
                        <TableCell>{charge.remark || '-'}</TableCell>
                        <TableCell>₹{charge.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeAdditionalCharge(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No additional charges added yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Input
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  placeholder="Any additional remarks"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {editingId ? 'Update Invoice' : 'Create Invoice'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActiveTab('list');
                setEditingId(null);
                setInvoiceItems([]);
                setAdditionalCharges([]);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Party Name</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Net Amount</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_no}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{invoice.party_name}</TableCell>
                    <TableCell>₹{invoice.total_amount.toFixed(2)}</TableCell>
                    <TableCell>₹{invoice.net_amount.toFixed(2)}</TableCell>
                    <TableCell>{invoice.created_by || '-'}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : invoice.status === 'issued'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePrint(invoice)}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(invoice)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
