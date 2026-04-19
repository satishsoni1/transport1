import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const lrNo = String(body.lr_no || '').trim();
    const podImageUrl = String(body.pod_image_url || '').trim();
    const remarks = String(body.remarks || '').trim();

    if (!lrNo || !podImageUrl) {
      return NextResponse.json(
        { success: false, error: 'LR number and POD image are required' },
        { status: 400 }
      );
    }

    const { rows: existingRows } = await sql`
      SELECT *
      FROM lr_entries
      WHERE UPPER(BTRIM(lr_no)) = UPPER(BTRIM(${lrNo}))
      LIMIT 1
    `;
    if (!existingRows.length) {
      return NextResponse.json({ success: false, error: 'LR not found' }, { status: 404 });
    }

    const existing = existingRows[0];
    const mergedRemark = [String(existing.remarks || '').trim(), remarks].filter(Boolean).join(' | ');

    const { rows } = await sql`
      UPDATE lr_entries
      SET
        pod_received = TRUE,
        pod_image_url = ${podImageUrl},
        pod_received_at = NOW(),
        pod_received_by_driver_name = ${String(body.uploaded_by || 'Transport')},
        remarks = ${mergedRemark}
      WHERE id = ${existing.id}
      RETURNING *
    `;

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error uploading transport POD', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
