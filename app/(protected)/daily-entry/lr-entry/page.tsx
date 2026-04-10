'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import {
  generateLRPrintHTML,
  printHTML,
  printImageDocument,
  printPodImagesBatch,
} from '@/app/services/print-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Printer, FileImage,ChevronLeft, ChevronRight } from 'lucide-react';
import useSWR, { mutate as globalMutate } from 'swr';
import { transliterateToMarathi } from '@/app/services/marathi';

interface GoodsItem {
  qty: number;
  type: string;
  nature: string;
  weight_kg: number;
  rate: number;
  amount: number;
}

interface LREntry {
  id: number;
  lr_no: string;
  lr_date: string;
  consignor_id: number;
  consignee_id: number;
  from_city: string;
  to_city: string;
  delivery_address: string;
  freight: number;
  hamali: number;
  lr_charge: number;
  advance: number;
  balance: number;
  invoice_no: string;
  truck_no: string;
  driver_name: string;
  driver_mobile: string;
  eway_no: string;
  remarks: string;
  return_status?: 'normal' | 'returned';
  return_remark?: string;
  pod_received?: boolean;
  pod_image_url?: string;
  goods_items: GoodsItem[];
  status: 'to_pay' | 'paid' | 'tbb';
  created_at: string;
}

interface Consignor {
  id: number;
  name: string;
  name_mr?: string;
  username?: string;
  password?: string;
  address: string;
  city: string;
  gst_no: string;
  mobile: string;
  contact_person: string;
}

interface Consignee {
  id: number;
  name: string;
  name_mr?: string;
  address: string;
  city: string;
  city_mr?: string;
  gst_no: string;
  mobile: string;
  contact_person: string;
}

interface City {
  id: number;
  city_name: string;
}

interface GoodsTypeMaster {
  id: number;
  type_name: string;
}

interface GoodsNatureMaster {
  id: number;
  nature_name: string;
}

interface AdminSettings {
  company_name?: string;
  company_email?: string;
  company_phone?: string;
  address?: string;
  gst_no?: string;
  logo_url?: string;
  signature_url?: string;
  transporter_qr_url?: string;
  transporter_name_font?: string;
  lr_print_format?: 'classic' | 'compact' | 'detailed';
  invoice_print_format?: 'classic' | 'compact' | 'detailed';
}

const emptyNewConsignor = {
  name: '',
  name_mr: '',
  username: '',
  password: '',
  address: '',
  city: '',
  gst_no: '',
  contact_person: '',
  mobile: '',
};

const emptyNewConsignee = {
  name: '',
  name_mr: '',
  address: '',
  city: '',
  city_mr: '',
  gst_no: '',
  contact_person: '',
  mobile: '',
};

const LAST_GOODS_TYPE_KEY = 'lr_last_goods_type';
const LAST_GOODS_NATURE_KEY = 'lr_last_goods_nature';
const MAX_GOODS_ROWS = 5;

const freightTypeOptions = [
  { value: 'to_pay' as const, label: 'To Pay', hint: 'Freight to be collected at delivery' },
  { value: 'paid' as const, label: 'Paid', hint: 'Freight already collected at booking' },
  { value: 'tbb' as const, label: 'TBB', hint: 'To be billed to party account' },
];

function normalizeInvoiceNo(value: string) {
  return value.trim().toUpperCase();
}

export default function LREntryPage() {
  const { user } = useAuth();
  const lrFormRef = useRef<HTMLFormElement | null>(null);
  const consignorInputRef = useRef<HTMLInputElement | null>(null);
  const consigneeInputRef = useRef<HTMLInputElement | null>(null);
  const invoiceInputRef = useRef<HTMLInputElement | null>(null);
  const qtyInputRef = useRef<HTMLInputElement | null>(null);
  const typeInputRef = useRef<HTMLInputElement | null>(null);
  const natureInputRef = useRef<HTMLInputElement | null>(null);
  const weightInputRef = useRef<HTMLInputElement | null>(null);
  const rateInputRef = useRef<HTMLInputElement | null>(null);

  // References and state for synced horizontal scrolling
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [tableWidth, setTableWidth] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [consignorSearch, setConsignorSearch] = useState('');
  const [consigneeSearch, setConsigneeSearch] = useState('');
  const [showNewConsignor, setShowNewConsignor] = useState(false);
  const [showNewConsignee, setShowNewConsignee] = useState(false);
  const [newConsignor, setNewConsignor] = useState(emptyNewConsignor);
  const [newConsignee, setNewConsignee] = useState(emptyNewConsignee);
  const [deliveryAtDifferent, setDeliveryAtDifferent] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');

  const [formData, setFormData] = useState({
    consignor_id: '',
    consignee_id: '',
    from_city: '',
    to_city: '',
    delivery_address: '',
    freight: '0',
    hamali: '0',
    lr_charge: '0',
    advance: '0',
    invoice_no: '',
    status: 'to_pay' as 'to_pay' | 'paid' | 'tbb',
    truck_no: '',
    driver_name: '',
    driver_mobile: '',
    eway_no: '',
    remarks: '',
    return_status: 'normal' as 'normal' | 'returned',
    return_remark: '',
    pod_received: false,
  });

  const [goodsItems, setGoodsItems] = useState<GoodsItem[]>([]);
  const [currentItem, setCurrentItem] = useState<GoodsItem>({
    qty: 0,
    type: '',
    nature: '',
    weight_kg: 0,
    rate: 0,
    amount: 0,
  });

  const [listSearch, setListSearch] = useState('');
  const [listDateFrom, setListDateFrom] = useState('');
  const [listDateTo, setListDateTo] = useState('');
  const [listConsignorId, setListConsignorId] = useState('');
  const [listConsigneeId, setListConsigneeId] = useState('');
  const [listStatus, setListStatus] = useState('');
  const [listPod, setListPod] = useState('');
  const [podPrintSelection, setPodPrintSelection] = useState<Set<number>>(new Set());

  const { data: challansForList = [] } = useSWR<
    Array<{
      challan_no: string;
      challan_date: string;
      truck_no: string;
      driver_name: string;
      driver_mobile: string;
      lr_list: Array<{ lr_no?: string }>;
    }>
  >('/api/daily-entry/challans', apiClient.get);

  const lrNoToChallanMeta = useMemo(() => {
    const map = new Map<
      string,
      {
        challan_no: string;
        challan_date: string;
        vehicle_no: string;
        driver_name: string;
        driver_mobile: string;
      }
    >();
    for (const ch of challansForList) {
      const list = Array.isArray(ch.lr_list) ? ch.lr_list : [];
      for (const item of list) {
        const lrNo = String(item?.lr_no || '').trim();
        if (!lrNo) continue;
        map.set(lrNo, {
          challan_no: ch.challan_no || '-',
          challan_date: ch.challan_date || '',
          vehicle_no: ch.truck_no || '-',
          driver_name: ch.driver_name || '-',
          driver_mobile: ch.driver_mobile || '-',
        });
      }
    }
    return map;
  }, [challansForList]);

  const lrEntriesListKey = useMemo(() => {
    const params = new URLSearchParams();
    const s = listSearch.trim();
    if (s) params.set('search', s);
    if (listDateFrom) params.set('date_from', listDateFrom);
    if (listDateTo) params.set('date_to', listDateTo);
    if (listConsignorId) params.set('consignor_id', listConsignorId);
    if (listConsigneeId) params.set('consignee_id', listConsigneeId);
    if (listStatus) params.set('status', listStatus);
    if (listPod) params.set('pod', listPod);
    const q = params.toString();
    return q ? `/api/daily-entry/lr-entries?${q}` : '/api/daily-entry/lr-entries';
  }, [listSearch, listDateFrom, listDateTo, listConsignorId, listConsigneeId, listStatus, listPod]);

  const clearListFilters = useCallback(() => {
    setListSearch('');
    setListDateFrom('');
    setListDateTo('');
    setListConsignorId('');
    setListConsigneeId('');
    setListStatus('');
    setListPod('');
  }, []);

  const { data: lrEntries = [], mutate: mutateLrEntries } = useSWR<LREntry[]>(
    lrEntriesListKey,
    apiClient.get
  );

  const listPrintablePodRows = useMemo(
    () => lrEntries.filter((e) => e.pod_image_url?.trim()),
    [lrEntries]
  );

  useEffect(() => {
    setPodPrintSelection(new Set());
  }, [lrEntriesListKey]);

  const toggleListPodSelect = useCallback((id: number, checked: boolean) => {
    setPodPrintSelection((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectAllListPods = useCallback(
    (checked: boolean) => {
      if (checked) setPodPrintSelection(new Set(listPrintablePodRows.map((e) => e.id)));
      else setPodPrintSelection(new Set());
    },
    [listPrintablePodRows]
  );

  const printSelectedListPods = useCallback(() => {
    const items = lrEntries
      .filter((e) => podPrintSelection.has(e.id) && e.pod_image_url?.trim())
      .map((e) => ({ title: `POD ${e.lr_no}`, imageUrl: e.pod_image_url! }));
    if (items.length === 0) {
      toast.error('Select at least one LR with a POD image');
      return;
    }
    if (items.length === 1) printImageDocument(items[0].title, items[0].imageUrl);
    else printPodImagesBatch(items);
  }, [lrEntries, podPrintSelection]);

  const { data: consignors = [] } = useSWR<Consignor[]>(
    '/api/masters/consignors',
    apiClient.get
  );
  const { data: consignees = [] } = useSWR<Consignee[]>(
    '/api/masters/consignees',
    apiClient.get
  );
  const { data: cities = [] } = useSWR<City[]>('/api/masters/cities', apiClient.get);
  const { data: settings } = useSWR<AdminSettings>('/api/admin/settings', apiClient.get);
  const { data: goodsTypes = [] } = useSWR<GoodsTypeMaster[]>(
    '/api/masters/goods-types',
    apiClient.get
  );
  const { data: goodsNatures = [] } = useSWR<GoodsNatureMaster[]>(
    '/api/masters/goods-natures',
    apiClient.get
  );

  const selectedConsignor = useMemo(
    () => consignors.find((item) => item.id === Number(formData.consignor_id)),
    [consignors, formData.consignor_id]
  );
  const selectedConsignee = useMemo(
    () => consignees.find((item) => item.id === Number(formData.consignee_id)),
    [consignees, formData.consignee_id]
  );

  useEffect(() => {
    const freightAuto = goodsItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    setFormData((prev) => ({ ...prev, freight: freightAuto.toFixed(2) }));
  }, [goodsItems]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const lastType = localStorage.getItem(LAST_GOODS_TYPE_KEY) || '';
    const lastNature = localStorage.getItem(LAST_GOODS_NATURE_KEY) || '';
    if (!lastType && !lastNature) return;
    setCurrentItem((prev) => ({ ...prev, type: lastType, nature: lastNature }));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LAST_GOODS_TYPE_KEY, currentItem.type || '');
    localStorage.setItem(LAST_GOODS_NATURE_KEY, currentItem.nature || '');
  }, [currentItem.type, currentItem.nature]);

  useEffect(() => {
    setFormData((prev) => {
      const nextFrom = selectedConsignor?.city || prev.from_city;
      const nextTo = selectedConsignee?.city || prev.to_city;
      const nextDelivery = deliveryAtDifferent ? prev.delivery_address : selectedConsignee?.address || '';

      if (
        prev.from_city === nextFrom &&
        prev.to_city === nextTo &&
        prev.delivery_address === nextDelivery
      ) {
        return prev;
      }

      return {
        ...prev,
        from_city: nextFrom,
        to_city: nextTo,
        delivery_address: nextDelivery,
      };
    });
  }, [selectedConsignor, selectedConsignee, deliveryAtDifferent]);

  const calculateBalance = useCallback(() => {
    const freight = parseFloat(formData.freight) || 0;
    const hamali = parseFloat(formData.hamali) || 0;
    const lrCharge = parseFloat(formData.lr_charge) || 0;
    const advance = parseFloat(formData.advance) || 0;
    return freight + hamali + lrCharge - advance;
  }, [formData.freight, formData.hamali, formData.lr_charge, formData.advance]);

  const calculateCurrentAmount = useCallback(() => {
    const qty = currentItem.qty || 0;
    const rate = currentItem.rate || 0;
    return qty * rate;
  }, [currentItem.qty, currentItem.rate]);

  const resetForNew = useCallback(() => {
    setEditingId(null);
    setConsignorSearch('');
    setConsigneeSearch('');
    setShowNewConsignor(false);
    setShowNewConsignee(false);
    setNewConsignor(emptyNewConsignor);
    setNewConsignee(emptyNewConsignee);
    setDeliveryAtDifferent(false);
    setInvoiceError('');
    setGoodsItems([]);
    const lastType =
      typeof window !== 'undefined' ? localStorage.getItem(LAST_GOODS_TYPE_KEY) || '' : '';
    const lastNature =
      typeof window !== 'undefined' ? localStorage.getItem(LAST_GOODS_NATURE_KEY) || '' : '';
    setCurrentItem({ qty: 0, type: lastType, nature: lastNature, weight_kg: 0, rate: 0, amount: 0 });
    setFormData({
      consignor_id: '',
      consignee_id: '',
      from_city: '',
      to_city: '',
      delivery_address: '',
      freight: '0',
      hamali: '0',
      lr_charge: '0',
      advance: '0',
      invoice_no: '',
      status: 'to_pay',
      truck_no: '',
      driver_name: '',
      driver_mobile: '',
      eway_no: '',
      remarks: '',
      return_status: 'normal',
      return_remark: '',
      pod_received: false,
    });
    setTimeout(() => consignorInputRef.current?.focus(), 30);
  }, []);

  const addGoodsItem = useCallback(async () => {
    if (currentItem.qty <= 0) {
      toast.error('Please enter qty');
      qtyInputRef.current?.focus();
      return;
    }
    if (!currentItem.type.trim()) {
      toast.error('Please enter goods detail');
      return;
    }
    if (!currentItem.nature.trim()) {
      toast.error('Please enter goods nature');
      natureInputRef.current?.focus();
      return;
    }
    if (currentItem.weight_kg <= 0) {
      toast.error('Please enter weight');
      weightInputRef.current?.focus();
      return;
    }
    if (currentItem.rate <= 0) {
      toast.error('Please enter rate');
      rateInputRef.current?.focus();
      return;
    }
    if (goodsItems.length >= MAX_GOODS_ROWS) {
      toast.error('Only 5 goods rows are allowed in one LR');
      return;
    }

    const typeName = currentItem.type.trim();
    const natureName = currentItem.nature.trim();
    const typeExists = goodsTypes.some(
      (item) => item.type_name.toLowerCase() === typeName.toLowerCase()
    );
    const natureExists = goodsNatures.some(
      (item) => item.nature_name.toLowerCase() === natureName.toLowerCase()
    );

    try {
      if (typeName && !typeExists) {
        await apiClient.post('/api/masters/goods-types', { type_name: typeName });
        globalMutate('/api/masters/goods-types');
      }
      if (natureName && !natureExists) {
        await apiClient.post('/api/masters/goods-natures', { nature_name: natureName });
        globalMutate('/api/masters/goods-natures');
      }
    } catch {
      // Keep LR flow resilient even if master upsert fails due race/duplication.
    }

    const amount = calculateCurrentAmount();
    setGoodsItems((prev) => [...prev, { ...currentItem, amount }]);
    setCurrentItem((prev) => ({
      qty: 0,
      type: prev.type,
      nature: prev.nature,
      weight_kg: 0,
      rate: 0,
      amount: 0,
    }));
    setTimeout(() => qtyInputRef.current?.focus(), 20);
  }, [calculateCurrentAmount, currentItem, goodsTypes, goodsNatures]);

  const handleGoodsFieldEnter = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, field: 'qty' | 'type' | 'nature' | 'weight' | 'rate') => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
      if (field === 'qty') {
        typeInputRef.current?.focus();
      } else if (field === 'type') {
        natureInputRef.current?.focus();
      } else if (field === 'nature') {
        weightInputRef.current?.focus();
      } else if (field === 'weight') {
        rateInputRef.current?.focus();
      } else {
        void addGoodsItem();
      }
    },
    [addGoodsItem]
  );

  const handleFormEnterNavigation = useCallback((e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter' || e.defaultPrevented) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (
      !(target instanceof HTMLInputElement || target instanceof HTMLSelectElement) ||
      target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const type = (target as HTMLInputElement).type;
    if (type === 'submit' || type === 'button' || type === 'file' || type === 'checkbox') return;

    e.preventDefault();
    const form = lrFormRef.current;
    if (!form) return;

    const focusables = Array.from(
      form.querySelectorAll<HTMLElement>('input, select, button, textarea')
    ).filter((el) => {
      if (el.hasAttribute('disabled')) return false;
      if (el.getAttribute('type') === 'hidden') return false;
      if (el.getAttribute('tabindex') === '-1') return false;
      if (el instanceof HTMLButtonElement) return false;
      return true;
    });

    const idx = focusables.indexOf(target);
    if (idx < 0) return;
    const next = focusables[idx + 1];
    next?.focus();
  }, []);

  const removeGoodsItem = useCallback((index: number) => {
    setGoodsItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const saveNewConsignor = useCallback(async () => {
    if (
      !newConsignor.name ||
      !newConsignor.address ||
      !newConsignor.city
    ) {
      toast.error('Name, address and city are required for new consignor');
      return;
    }
    try {
      const created = await apiClient.post<Consignor>('/api/masters/consignors', newConsignor);
      await Promise.all([
        globalMutate('/api/masters/consignors'),
        globalMutate('/api/masters/cities'),
      ]);
      setConsignorSearch(created.name);
      setFormData((prev) => ({ ...prev, consignor_id: String(created.id), from_city: created.city || prev.from_city }));
      setShowNewConsignor(false);
      setNewConsignor(emptyNewConsignor);
      toast.success('Consignor created and selected');
      setTimeout(() => consigneeInputRef.current?.focus(), 0);
    } catch {
      toast.error('Failed to create consignor');
    }
  }, [newConsignor]);

  const saveNewConsignee = useCallback(async () => {
    if (!newConsignee.name || !newConsignee.address || !newConsignee.city) {
      toast.error('Name, address and city are required for new consignee');
      return;
    }
    try {
      const created = await apiClient.post<Consignee>('/api/masters/consignees', newConsignee);
      await Promise.all([
        globalMutate('/api/masters/consignees'),
        globalMutate('/api/masters/cities'),
      ]);
      setConsigneeSearch(created.name);
      setFormData((prev) => ({ ...prev, consignee_id: String(created.id), to_city: created.city || prev.to_city }));
      setShowNewConsignee(false);
      setNewConsignee(emptyNewConsignee);
      toast.success('Consignee created and selected');
      setTimeout(() => invoiceInputRef.current?.focus(), 0);
    } catch {
      toast.error('Failed to create consignee');
    }
  }, [newConsignee]);

  const handleEdit = useCallback(
    (entry: LREntry) => {
      const consignor = consignors.find((item) => item.id === entry.consignor_id);
      const consignee = consignees.find((item) => item.id === entry.consignee_id);

      setEditingId(entry.id);
      setConsignorSearch(consignor?.name || '');
      setConsigneeSearch(consignee?.name || '');
      setFormData({
        consignor_id: String(entry.consignor_id),
        consignee_id: String(entry.consignee_id),
        from_city: entry.from_city || '',
        to_city: entry.to_city || '',
        delivery_address: entry.delivery_address || '',
        freight: String(entry.freight ?? 0),
        hamali: String(entry.hamali ?? 0),
        lr_charge: String(entry.lr_charge ?? 0),
        advance: String(entry.advance ?? 0),
        invoice_no: entry.invoice_no || '',
        status: entry.status || 'to_pay',
        truck_no: '',
        driver_name: '',
        driver_mobile: '',
        eway_no: entry.eway_no || '',
        remarks: entry.remarks || '',
        return_status: entry.return_status || 'normal',
        return_remark: entry.return_remark || '',
        pod_received: Boolean(entry.pod_received),
      });
      setDeliveryAtDifferent(
        Boolean(
          entry.delivery_address &&
            entry.delivery_address.trim() &&
            entry.delivery_address.trim() !== (consignee?.address || '').trim()
        )
      );
      setInvoiceError('');
      setGoodsItems(
        (entry.goods_items || []).map((item: any) => ({
          qty: Number(item.qty) || 0,
          type: item.type || '',
          nature: item.nature || item.description || '',
          weight_kg: Number(item.weight_kg) || 0,
          rate: Number(item.rate) || 0,
          amount: Number(item.amount) || 0,
        }))
      );
      setCurrentItem({ qty: 0, type: '', nature: '', weight_kg: 0, rate: 0, amount: 0 });
      setActiveTab('form');
      setTimeout(() => consignorInputRef.current?.focus(), 20);
    },
    [consignors, consignees]
  );

  const buildPrintPayload = useCallback(
    (entry: LREntry) => {
      const consignor = consignors.find((item) => item.id === entry.consignor_id);
      const consignee = consignees.find((item) => item.id === entry.consignee_id);

      return {
        ...entry,
        consignor: consignor?.name || '',
        consignor_name_mr: consignor?.name_mr || transliterateToMarathi(consignor?.name || ''),
        consignor_address: consignor?.address || '',
        consignor_city: consignor?.city || '',
        consignor_mobile: consignor?.mobile || '',
        consignor_gst: consignor?.gst_no || '',
        consignee: consignee?.name || '',
        consignee_name_mr: consignee?.name_mr || transliterateToMarathi(consignee?.name || ''),
        consignee_address: consignee?.address || '',
        consignee_city: consignee?.city || '',
        consignee_city_mr: consignee?.city_mr || transliterateToMarathi(consignee?.city || ''),
        from_city_mr: transliterateToMarathi(entry.from_city || ''),
        to_city_mr: consignee?.city_mr || transliterateToMarathi(entry.to_city || consignee?.city || ''),
        consignee_mobile: consignee?.mobile || '',
        consignee_gst: consignee?.gst_no || '',
        freight_type: entry.status,
        format: settings?.lr_print_format || 'classic',
        company: settings,
      };
    },
    [consignors, consignees, settings]
  );

  const handlePrint = useCallback(
    (entry: LREntry) => {
      const html = generateLRPrintHTML(buildPrintPayload(entry));
      printHTML(html);
    },
    [buildPrintPayload]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.consignor_id || !formData.consignee_id) {
        toast.error('Please select consignor and consignee');
        return;
      }
      if (goodsItems.length === 0) {
        toast.error('Please add at least one goods item');
        return;
      }
      if (goodsItems.length > MAX_GOODS_ROWS) {
        toast.error('Only 5 goods rows are allowed in one LR');
        return;
      }
      const invoiceNo = normalizeInvoiceNo(formData.invoice_no);
      if (!invoiceNo) {
        setInvoiceError('Invoice no is required');
        toast.error('Please enter invoice no');
        return;
      }
      setInvoiceError('');

      const payload = {
        consignor_id: parseInt(formData.consignor_id, 10),
        consignee_id: parseInt(formData.consignee_id, 10),
        from_city: formData.from_city,
        to_city: formData.to_city,
        delivery_address: deliveryAtDifferent
          ? formData.delivery_address.trim()
          : selectedConsignee?.address || '',
        freight: parseFloat(formData.freight) || 0,
        hamali: parseFloat(formData.hamali) || 0,
        lr_charge: parseFloat(formData.lr_charge) || 0,
        advance: parseFloat(formData.advance) || 0,
        invoice_no: invoiceNo,
        truck_no: '',
        driver_name: '',
        driver_mobile: '',
        eway_no: formData.eway_no,
        remarks: formData.remarks,
        return_status: formData.return_status,
        return_remark: formData.return_remark,
        pod_received: formData.pod_received,
        status: formData.status,
        goods_items: goodsItems,
      };

      try {
        if (editingId) {
          const updated = await apiClient.put<LREntry>(
            `/api/daily-entry/lr-entries/${editingId}`,
            payload
          );
          toast.success('L.R. updated successfully');
          mutateLrEntries();
          handlePrint(updated);
          setActiveTab('list');
          return;
        }

        const created = await apiClient.post<LREntry>('/api/daily-entry/lr-entries', payload);
        toast.success('L.R. created successfully');
        mutateLrEntries();
        handlePrint(created);

        setActiveTab('form');
        resetForNew();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save L.R.';
        if (message.toLowerCase().includes('invoice')) {
          setInvoiceError(message);
        }
        toast.error(message);
      }
    },
    [
      formData,
      goodsItems,
      editingId,
      deliveryAtDifferent,
      mutateLrEntries,
      selectedConsignee,
      handlePrint,
      resetForNew,
    ]
  );

  // Scroll Sync Logic
  const handleTopScroll = useCallback(() => {
    if (tableScrollRef.current && topScrollRef.current) {
      if (tableScrollRef.current.scrollLeft !== topScrollRef.current.scrollLeft) {
        tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      }
    }
  }, []);

  const handleTableScroll = useCallback(() => {
    if (tableScrollRef.current && topScrollRef.current) {
      if (topScrollRef.current.scrollLeft !== tableScrollRef.current.scrollLeft) {
        topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
      }
    }
  }, []);
// Function to handle smooth button scrolling
const scrollTable = useCallback((direction: 'left' | 'right') => {
  if (!tableScrollRef.current) return;

  const container = tableScrollRef.current;
  
  // Scroll by 400px, or half the visible width of the table (whichever is larger)
  const scrollAmount = Math.max(container.clientWidth / 2, 400); 
  const currentScroll = container.scrollLeft;

  const targetLeft = direction === 'left' 
    ? currentScroll - scrollAmount 
    : currentScroll + scrollAmount;

  // Use scrollTo instead of scrollBy for better browser support
  container.scrollTo({
    left: targetLeft,
    behavior: 'smooth',
  });
}, []);
  // Sync width of dummy container with actual table using ResizeObserver
  useEffect(() => {
    if (activeTab !== 'list') return;

    const tableContainer = tableScrollRef.current;
    if (!tableContainer) return;

    // Measure the exact scrollable width of the bottom wrapper
    const updateWidth = () => setTableWidth(tableContainer.scrollWidth);
    
    updateWidth();

    // Observe the actual table inside for size changes
    const tableEl = tableContainer.querySelector('table');
    if (!tableEl) return;

    const observer = new ResizeObserver(updateWidth);
    observer.observe(tableEl);

    return () => observer.disconnect();
  }, [activeTab, lrEntries]);


  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">L.R. Entry</h1>
        {activeTab === 'list' && (
          <Button
            onClick={() => {
              setActiveTab('form');
              resetForNew();
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New L.R.
          </Button>
        )}
      </div>

      {activeTab === 'form' ? (
        <form
          ref={lrFormRef}
          onSubmit={handleSubmit}
          onKeyDown={handleFormEnterNavigation}
          className="space-y-4 [&_label[data-slot=label]]:mb-1.5"
        >
          <Card>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="consignor">Consignor *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowNewConsignor((v) => !v)}>
                      {showNewConsignor ? 'Close' : 'New Consignor'}
                    </Button>
                  </div>
                  <Input
                    id="consignor"
                    ref={consignorInputRef}
                    list="consignor-options"
                    value={consignorSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setConsignorSearch(value);
                      const selected = consignors.find(
                        (item) => item.name.toLowerCase() === value.trim().toLowerCase()
                      );
                      setFormData((prev) => ({
                        ...prev,
                        consignor_id: selected ? String(selected.id) : '',
                        from_city: selected?.city || prev.from_city,
                      }));
                      if (selected) {
                        setTimeout(() => consigneeInputRef.current?.focus(), 0);
                      }
                    }}
                    placeholder="Type consignor name"
                  />
                  <datalist id="consignor-options">
                    {consignors.map((item) => (
                      <option key={item.id} value={item.name} label={`${item.city} | ${item.mobile || '-'}`} />
                    ))}
                  </datalist>
                  {selectedConsignor && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <p><b>Address:</b> {selectedConsignor.address || '-'}</p>
                      <p><b>City:</b> {selectedConsignor.city || '-'}</p>
                      <p><b>Contact:</b> {selectedConsignor.mobile || '-'}</p>
                      <p><b>GST:</b> {selectedConsignor.gst_no || '-'}</p>
                    </div>
                  )}

                  {showNewConsignor && (
                    <div className="mt-3 p-3 border rounded-md space-y-2">
                      <Input
                        placeholder="Name *"
                        value={newConsignor.name}
                        onChange={(e) =>
                          setNewConsignor({
                            ...newConsignor,
                            name: e.target.value,
                            name_mr: transliterateToMarathi(e.target.value),
                          })
                        }
                      />
                      <Input
                        placeholder="Name in Marathi"
                        value={newConsignor.name_mr}
                        onChange={(e) =>
                          setNewConsignor({ ...newConsignor, name_mr: e.target.value })
                        }
                      />
                      <Input
                        placeholder="Username (optional)"
                        value={newConsignor.username}
                        onChange={(e) =>
                          setNewConsignor({ ...newConsignor, username: e.target.value })
                        }
                      />
                      <Input
                        placeholder="Password (optional)"
                        type="password"
                        value={newConsignor.password}
                        onChange={(e) =>
                          setNewConsignor({ ...newConsignor, password: e.target.value })
                        }
                      />
                      <Input placeholder="Address *" value={newConsignor.address} onChange={(e) => setNewConsignor({ ...newConsignor, address: e.target.value })} />
                      <Input placeholder="City *" list="lr-city-options" value={newConsignor.city} onChange={(e) => setNewConsignor({ ...newConsignor, city: e.target.value })} />
                      <Input placeholder="Contact No" value={newConsignor.mobile} onChange={(e) => setNewConsignor({ ...newConsignor, mobile: e.target.value })} />
                      <Input placeholder="GST No" value={newConsignor.gst_no} onChange={(e) => setNewConsignor({ ...newConsignor, gst_no: e.target.value })} />
                      <Input placeholder="Contact Person" value={newConsignor.contact_person} onChange={(e) => setNewConsignor({ ...newConsignor, contact_person: e.target.value })} />
                      <Button type="button" className="w-full" onClick={saveNewConsignor}>Save New Consignor</Button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="consignee">Consignee *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowNewConsignee((v) => !v)}>
                      {showNewConsignee ? 'Close' : 'New Consignee'}
                    </Button>
                  </div>
                  <Input
                    id="consignee"
                    ref={consigneeInputRef}
                    list="consignee-options"
                    value={consigneeSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setConsigneeSearch(value);
                      const selected = consignees.find(
                        (item) => item.name.toLowerCase() === value.trim().toLowerCase()
                      );
                      setFormData((prev) => ({
                        ...prev,
                        consignee_id: selected ? String(selected.id) : '',
                        to_city: selected?.city || prev.to_city,
                      }));
                      if (selected) {
                        setTimeout(() => invoiceInputRef.current?.focus(), 0);
                      }
                    }}
                    placeholder="Type consignee name"
                  />
                  <datalist id="consignee-options">
                    {consignees.map((item) => (
                      <option key={item.id} value={item.name} label={`${item.city} | ${item.mobile || '-'} | ${item.name_mr || '-'}`} />
                    ))}
                  </datalist>
                  {selectedConsignee && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <p><b>Name (Marathi):</b> {selectedConsignee.name_mr || '-'}</p>
                      <p><b>City:</b> {selectedConsignee.city || '-'}</p>
                      <p><b>City (Marathi):</b> {selectedConsignee.city_mr || '-'}</p>
                      <p><b>Contact:</b> {selectedConsignee.mobile || '-'}</p>
                      <p><b>GST:</b> {selectedConsignee.gst_no || '-'}</p>
                    </div>
                  )}

                  {showNewConsignee && (
                    <div className="mt-3 p-3 border rounded-md space-y-2">
                      <Input
                        placeholder="Name *"
                        value={newConsignee.name}
                        onChange={(e) =>
                          setNewConsignee({
                            ...newConsignee,
                            name: e.target.value,
                            name_mr: transliterateToMarathi(e.target.value),
                          })
                        }
                      />
                      <Input placeholder="Name in Marathi" value={newConsignee.name_mr} onChange={(e) => setNewConsignee({ ...newConsignee, name_mr: e.target.value })} />
                      <Input placeholder="Address *" value={newConsignee.address} onChange={(e) => setNewConsignee({ ...newConsignee, address: e.target.value })} />
                      <Input
                        placeholder="City *"
                        list="lr-city-options"
                        value={newConsignee.city}
                        onChange={(e) =>
                          setNewConsignee({
                            ...newConsignee,
                            city: e.target.value,
                            city_mr: transliterateToMarathi(e.target.value),
                          })
                        }
                      />
                      <Input placeholder="City in Marathi" value={newConsignee.city_mr} onChange={(e) => setNewConsignee({ ...newConsignee, city_mr: e.target.value })} />
                      <Input placeholder="Contact No" value={newConsignee.mobile} onChange={(e) => setNewConsignee({ ...newConsignee, mobile: e.target.value })} />
                      <Input placeholder="GST No" value={newConsignee.gst_no} onChange={(e) => setNewConsignee({ ...newConsignee, gst_no: e.target.value })} />
                      <Input placeholder="Contact Person" value={newConsignee.contact_person} onChange={(e) => setNewConsignee({ ...newConsignee, contact_person: e.target.value })} />
                      <Button type="button" className="w-full" onClick={saveNewConsignee}>Save New Consignee</Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <datalist id="lr-city-options">
            {cities.map((city) => (
              <option key={city.id} value={city.city_name} />
            ))}
          </datalist>

          <Card>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-lg border bg-slate-50 p-2.5">
                  <p className="text-xs font-medium text-slate-500">From City</p>
                  <p className="mt-1 text-base font-semibold">{formData.from_city || '-'}</p>
                </div>
                <div className="rounded-lg border bg-slate-50 p-2.5">
                  <p className="text-xs font-medium text-slate-500">To City</p>
                  <p className="mt-1 text-base font-semibold">{formData.to_city || '-'}</p>
                </div>
                <div className="space-y-2 rounded-lg border p-2.5 md:col-span-2">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="delivery_at_different"
                      checked={deliveryAtDifferent}
                      onCheckedChange={(checked) => setDeliveryAtDifferent(Boolean(checked))}
                    />
                    <Label htmlFor="delivery_at_different" className="mb-0 cursor-pointer">
                      Delivery At is different from consignee address
                    </Label>
                  </div>
                  {deliveryAtDifferent ? (
                    <div>
                      <Label htmlFor="delivery_address">Delivery At Address</Label>
                      <Textarea
                        id="delivery_address"
                        value={formData.delivery_address}
                        onChange={(e) =>
                          setFormData({ ...formData, delivery_address: e.target.value })
                        }
                        placeholder="Enter alternate delivery address"
                        rows={2}
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Delivery will use consignee address: {selectedConsignee?.address || '-'}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <Label htmlFor="invoice_no">Invoice No *</Label>
                <Input
                  id="invoice_no"
                  ref={invoiceInputRef}
                  value={formData.invoice_no}
                  onChange={(e) => {
                    setInvoiceError('');
                    setFormData({ ...formData, invoice_no: normalizeInvoiceNo(e.target.value) });
                  }}
                  placeholder="Unique invoice number"
                  className={invoiceError ? 'border-red-500 focus-visible:ring-red-200' : ''}
                />
                {invoiceError ? (
                  <p className="mt-1 text-xs text-red-600">{invoiceError}</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Invoice number must be unique. Duplicate numbers will be blocked.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="eway_no">E-Way Number</Label>
                <Input
                  id="eway_no"
                  value={formData.eway_no}
                  onChange={(e) => setFormData({ ...formData, eway_no: e.target.value })}
                />
              </div>
              <div>
                <Label>Freight Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {freightTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: option.value })}
                      className={`rounded-md border px-3 py-3 text-left transition ${
                        formData.status === option.value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white hover:border-slate-400'
                      }`}
                    >
                      <div className="text-sm font-semibold">{option.label}</div>
                      <div
                        className={`mt-1 text-xs ${
                          formData.status === option.value ? 'text-slate-200' : 'text-slate-500'
                        }`}
                      >
                        {option.hint}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-muted-foreground">
                <div>Qty *</div>
                <div>Goods Name *</div>
                <div>Goods Type *</div>
                <div>Weight (Kg) *</div>
                <div>Rate *</div>
                <div>Amount</div>
                <div>Action</div>
              </div>
              <div className="grid grid-cols-7 gap-2 mb-4">
                <Input
                  ref={qtyInputRef}
                  placeholder="Qty"
                  type="number"
                  value={currentItem.qty}
                  onKeyDown={(e) => handleGoodsFieldEnter(e, 'qty')}
                  onChange={(e) => setCurrentItem({ ...currentItem, qty: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  ref={typeInputRef}
                  placeholder="Goods details"
                  list="lr-goods-type-options"
                  value={currentItem.type}
                  onKeyDown={(e) => handleGoodsFieldEnter(e, 'type')}
                  onChange={(e) => setCurrentItem({ ...currentItem, type: e.target.value })}
                />
                <Input
                  ref={natureInputRef}
                  placeholder="Goods type"
                  list="lr-goods-nature-options"
                  value={currentItem.nature}
                  onKeyDown={(e) => handleGoodsFieldEnter(e, 'nature')}
                  onChange={(e) => setCurrentItem({ ...currentItem, nature: e.target.value })}
                />
                <Input
                  ref={weightInputRef}
                  placeholder="Weight"
                  type="number"
                  value={currentItem.weight_kg}
                  onKeyDown={(e) => handleGoodsFieldEnter(e, 'weight')}
                  onChange={(e) => setCurrentItem({ ...currentItem, weight_kg: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  ref={rateInputRef}
                  placeholder="Rate"
                  type="number"
                  value={currentItem.rate}
                  onKeyDown={(e) => handleGoodsFieldEnter(e, 'rate')}
                  onChange={(e) => setCurrentItem({ ...currentItem, rate: parseFloat(e.target.value) || 0 })}
                />
                <Input placeholder="Amount" value={calculateCurrentAmount().toFixed(2)} readOnly />
                <Button type="button" onClick={() => void addGoodsItem()} className="w-full">
                  Add Row
                </Button>
              </div>
              <datalist id="lr-goods-type-options">
                {goodsTypes.map((item) => (
                  <option key={item.id} value={item.type_name} />
                ))}
              </datalist>
              <datalist id="lr-goods-nature-options">
                {goodsNatures.map((item) => (
                  <option key={item.id} value={item.nature_name} />
                ))}
              </datalist>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Goods Details</TableHead>
                      <TableHead>Goods Type</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goodsItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                          No goods rows added yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      goodsItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{idx + 1}</TableCell>
                          <TableCell>{item.qty}</TableCell>
                          <TableCell>{item.type}</TableCell>
                          <TableCell>{item.nature}</TableCell>
                          <TableCell>{item.weight_kg}</TableCell>
                          <TableCell>{`₹${item.rate.toFixed(2)}`}</TableCell>
                          <TableCell>{`₹${item.amount.toFixed(2)}`}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => removeGoodsItem(idx)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Rows will appear only after adding them. Maximum 5 goods rows are allowed in one LR.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <div>
                  <Label htmlFor="freight">Freight (Auto)</Label>
                  <Input id="freight" value={formData.freight} readOnly />
                </div>
                <div>
                  <Label htmlFor="hamali">Hamali</Label>
                  <Input id="hamali" type="number" step="0.01" value={formData.hamali} onChange={(e) => setFormData({ ...formData, hamali: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="lr_charge">L.R. Charge</Label>
                  <Input id="lr_charge" type="number" step="0.01" value={formData.lr_charge} onChange={(e) => setFormData({ ...formData, lr_charge: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="advance">Advance</Label>
                  <Input id="advance" type="number" step="0.01" value={formData.advance} onChange={(e) => setFormData({ ...formData, advance: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="balance">Balance</Label>
                  <Input
                    id="balance"
                    value={calculateBalance().toFixed(2)}
                    readOnly
                    className="bg-slate-900 font-semibold text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2 rounded-lg border p-2.5">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="return_status"
                      checked={formData.return_status === 'returned'}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          return_status: checked ? 'returned' : 'normal',
                          return_remark: checked ? formData.return_remark : '',
                        })
                      }
                    />
                    <Label htmlFor="return_status" className="mb-0 cursor-pointer">
                      LR Return
                    </Label>
                  </div>
                  <Textarea
                    value={formData.return_remark}
                    onChange={(e) =>
                      setFormData({ ...formData, return_remark: e.target.value })
                    }
                    rows={2}
                    placeholder="Return remark"
                    disabled={formData.return_status !== 'returned'}
                  />
                </div>
                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Input
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="text-red-700"
                  />
                  <p className="mt-1 text-xs text-red-600">
                    LR remarks will be highlighted in red.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">{editingId ? 'Update L.R.' : 'Create L.R.'}</Button>
            <Button type="button" variant="outline" onClick={() => { setActiveTab('list'); setEditingId(null); }}>
              Back to List
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <Card className="py-4 shadow-sm">
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-lg">List filters</CardTitle>
              <CardDescription>
                Filter by date range, consignor, consignee, freight status, POD, or free-text search (LR no, invoice, party names).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lr-list-search">Search</Label>
                  <Input
                    id="lr-list-search"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    placeholder="LR no, invoice, party…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lr-list-from">From date</Label>
                  <Input
                    id="lr-list-from"
                    type="date"
                    value={listDateFrom}
                    onChange={(e) => setListDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lr-list-to">To date</Label>
                  <Input
                    id="lr-list-to"
                    type="date"
                    value={listDateTo}
                    onChange={(e) => setListDateTo(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lr-list-pod">POD</Label>
                  <select
                    id="lr-list-pod"
                    value={listPod}
                    onChange={(e) => setListPod(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">All POD</option>
                    <option value="pending">POD pending</option>
                    <option value="received">POD received</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lr-list-consignor">Consignor</Label>
                  <select
                    id="lr-list-consignor"
                    value={listConsignorId}
                    onChange={(e) => setListConsignorId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">All consignors</option>
                    {consignors.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lr-list-consignee">Consignee</Label>
                  <select
                    id="lr-list-consignee"
                    value={listConsigneeId}
                    onChange={(e) => setListConsigneeId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">All consignees</option>
                    {consignees.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lr-list-status">LR status</Label>
                  <select
                    id="lr-list-status"
                    value={listStatus}
                    onChange={(e) => setListStatus(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">All status</option>
                    <option value="to_pay">To pay</option>
                    <option value="paid">Paid</option>
                    <option value="tbb">TBB</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="outline" className="w-full" onClick={clearListFilters}>
                    Clear filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {listPrintablePodRows.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lr-list-pod-select-all"
                  checked={
                    listPrintablePodRows.length > 0 &&
                    listPrintablePodRows.every((row) => podPrintSelection.has(row.id))
                  }
                  onCheckedChange={(v) => selectAllListPods(v === true)}
                />
                <Label htmlFor="lr-list-pod-select-all" className="text-sm font-medium cursor-pointer">
                  Select PODs ({listPrintablePodRows.length} with image)
                </Label>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={podPrintSelection.size === 0}
                onClick={printSelectedListPods}
              >
                Print selected PODs ({podPrintSelection.size})
              </Button>
            </div>
          ) : null}
{/* Scroll Buttons */}
<div className="flex justify-end gap-2 mb-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => scrollTable('left')}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Left
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => scrollTable('right')}
            >
              Right <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          {/* 1. Dummy Top Scrollbar */}
          <div
            ref={topScrollRef}
            className="overflow-x-auto rounded-t-lg border-x border-t bg-white [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full"
            style={{ scrollbarWidth: 'auto', scrollbarColor: '#94a3b8rgb(68, 71, 73)' }}
            onScroll={handleTopScroll}
          >
            {/* Added pt-[1px] to ensure the browser recognizes height and renders the scrollbar */}
            <div style={{ width: `${tableWidth}px` }} className="h-[1px] pt-[1px]" />
          </div>
          
          {/* 2. Actual Table Wrapper */}
          <div 
            ref={tableScrollRef}
            // The magic fix: [&>div]:overflow-visible prevents Shadcn from trapping the scroll
            className="overflow-x-auto rounded-b-lg border bg-white [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full [&>div]:overflow-visible"
            style={{ scrollbarWidth: 'auto', scrollbarColor: '#94a3b8 #f1f5f9' }}
            onScroll={handleTableScroll}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pr-0">POD</TableHead>
                  <TableHead>L.R. No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Consignor</TableHead>
                  <TableHead>Consignee</TableHead>
                  <TableHead>Ch. no</TableHead>
                  <TableHead>Ch. date</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Driver mob</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Freight</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>POD</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lrEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-4">
                      No L.R. entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  lrEntries.map((entry) => {
                    const ch = lrNoToChallanMeta.get(String(entry.lr_no || '').trim());
                    const chDate =
                      ch?.challan_date &&
                      !Number.isNaN(new Date(ch.challan_date).getTime())
                        ? new Date(ch.challan_date).toLocaleDateString('en-IN')
                        : '-';
                        // 1. Get the full names
                    const consignorName = consignors.find((item) => item.id === entry.consignor_id)?.name || entry.from_city || '';
                    const consigneeName = consignees.find((item) => item.id === entry.consignee_id)?.name || entry.to_city || '';
                    const totalQty = (entry.goods_items || []).reduce(
                      (sum, item) => sum + (Number(item.qty) || 0),
                      0
                    );
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="pr-0">
                          {entry.pod_image_url ? (
                            <Checkbox
                              checked={podPrintSelection.has(entry.id)}
                              onCheckedChange={(v) => toggleListPodSelect(entry.id, v === true)}
                              aria-label={`Select POD ${entry.lr_no}`}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{entry.lr_no}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {new Date(entry.lr_date).toLocaleDateString()}
                        </TableCell>
                        
                        <TableCell title={consignorName}>
                          {consignorName.length > 15 ? `${consignorName.slice(0, 15)}...` : consignorName}
                        </TableCell>
                        
                        <TableCell title={consigneeName}>
                          {consigneeName.length > 15 ? `${consigneeName.slice(0, 15)}...` : consigneeName}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{ch?.challan_no ?? '-'}</TableCell>
                        <TableCell className="whitespace-nowrap">{chDate}</TableCell>
                        <TableCell className="whitespace-nowrap">{ch?.vehicle_no ?? '-'}</TableCell>
                        <TableCell>{ch?.driver_name ?? '-'}</TableCell>
                        <TableCell className="whitespace-nowrap">{ch?.driver_mobile ?? '-'}</TableCell>
                        <TableCell>{totalQty}</TableCell>
                        <TableCell>₹{entry.freight.toFixed(2)}</TableCell>
                        <TableCell>
                          {freightTypeOptions.find((item) => item.value === entry.status)?.label || entry.status}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-semibold ${entry.pod_received ? 'text-emerald-600' : 'text-amber-600'}`}
                          >
                            {entry.pod_received ? 'Received' : 'Pending'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {entry.return_status === 'returned' ? (
                            <div className="text-xs font-semibold text-red-600">
                              Returned: {entry.return_remark || '-'}
                            </div>
                          ) : entry.remarks ? (
                            <div className="text-xs font-semibold text-red-600">{entry.remarks}</div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1" style={{ width: '150px' }}>
                            <Button size="sm" variant="ghost" className="gap-1" onClick={() => handlePrint(entry)} title="Print LR receipt">
                              <Printer className="w-4 h-4" />
                              <span className="text-xs">Print</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!entry.pod_received || !entry.pod_image_url}
                              onClick={() =>
                                printImageDocument(`POD ${entry.lr_no}`, entry.pod_image_url || '')
                              }
                              title={
                                entry.pod_received && entry.pod_image_url
                                  ? 'Print POD image'
                                  : 'POD image not available'
                              }
                            >
                              <FileImage className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(entry)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
