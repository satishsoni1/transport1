import { NextResponse } from 'next/server';
import { ensureSchema, parseJsonField, sql } from '@/lib/db';
import { requireConsignor } from '@/lib/consignor-auth';

type ReceiptItem = {
  invoice_no?: string;
  invoice_amount?: number;
  amount_received?: number;
};

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { consignor, response } = await requireConsignor(request);
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const search = String(searchParams.get('search') || '').trim().toLowerCase();
    const dateFrom = String(searchParams.get('date_from') || '').trim();
    const dateTo = String(searchParams.get('date_to') || '').trim();
    const balance = String(searchParams.get('balance') || '').trim();

    const { rows: invoiceRows } = await sql`
      SELECT id, invoice_no, invoice_date, party_name, total_amount, gst_amount, net_amount, status
      FROM invoices
      WHERE consignor_id = ${consignor.id}
      ORDER BY invoice_date::date DESC, id DESC
    `;

    const { rows: receiptRows } = await sql`
      SELECT id, receipt_no, receipt_date, mode, bank_name, cheque_no, cheque_date, remarks, total_amount, status, items
      FROM receipts
      WHERE consignor_id = ${consignor.id}
      ORDER BY receipt_date::date DESC, id DESC
    `;

    const receiptDetails = receiptRows.map((row) => ({
      ...row,
      items: parseJsonField<ReceiptItem[]>(row.items, []),
    }));

    const receivedByInvoice = new Map<string, number>();
    for (const receipt of receiptDetails) {
      for (const item of receipt.items) {
        const invoiceNo = String(item.invoice_no || '').trim();
        if (!invoiceNo) continue;
        const amountReceived = Number(item.amount_received) || 0;
        receivedByInvoice.set(
          invoiceNo,
          (receivedByInvoice.get(invoiceNo) || 0) + amountReceived
        );
      }
    }

    let invoices = invoiceRows.map((row) => {
      const netAmount = Number(row.net_amount) || 0;
      const receivedAmount = receivedByInvoice.get(String(row.invoice_no || '')) || 0;
      const balanceAmount = netAmount - receivedAmount;
      return {
        ...row,
        total_amount: Number(row.total_amount) || 0,
        gst_amount: Number(row.gst_amount) || 0,
        net_amount: netAmount,
        received_amount: receivedAmount,
        balance_amount: balanceAmount,
      };
    });

    if (search) {
      invoices = invoices.filter((item) =>
        [item.invoice_no, item.party_name]
          .some((value) => String(value || '').toLowerCase().includes(search))
      );
    }

    if (dateFrom) {
      invoices = invoices.filter(
        (item) => new Date(item.invoice_date) >= new Date(dateFrom)
      );
    }

    if (dateTo) {
      invoices = invoices.filter(
        (item) => new Date(item.invoice_date) <= new Date(`${dateTo}T23:59:59`)
      );
    }

    if (balance === 'pending') {
      invoices = invoices.filter((item) => item.balance_amount > 0.009);
    }

    if (balance === 'cleared') {
      invoices = invoices.filter((item) => item.balance_amount <= 0.009);
    }

    const matchedInvoiceNos = new Set(invoices.map((item) => String(item.invoice_no || '')));
    const receipts = receiptDetails.filter((receipt) => {
      if (!search && !dateFrom && !dateTo) return true;
      const matchesSearch =
        !search ||
        String(receipt.receipt_no || '').toLowerCase().includes(search) ||
        receipt.items.some((item) =>
          String(item.invoice_no || '').toLowerCase().includes(search)
        );
      const receiptDate = new Date(receipt.receipt_date);
      const matchesFrom = !dateFrom || receiptDate >= new Date(dateFrom);
      const matchesTo = !dateTo || receiptDate <= new Date(`${dateTo}T23:59:59`);
      const matchesInvoice =
        matchedInvoiceNos.size === 0 ||
        receipt.items.some((item) => matchedInvoiceNos.has(String(item.invoice_no || '')));

      return matchesSearch && matchesFrom && matchesTo && matchesInvoice;
    });

    const summary = invoices.reduce(
      (acc, item) => {
        acc.total_invoiced += item.net_amount;
        acc.total_received += item.received_amount;
        acc.total_balance += item.balance_amount;
        return acc;
      },
      { total_invoiced: 0, total_received: 0, total_balance: 0 }
    );

    return NextResponse.json(
      {
        summary,
        invoices,
        receipts: receipts.map((receipt) => ({
          ...receipt,
          total_amount: Number(receipt.total_amount) || 0,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching consignor ledger', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
