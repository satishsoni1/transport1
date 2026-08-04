'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import useSWR from 'swr';

interface AttendanceRow {
  user_id: number;
  first_name: string;
  last_name: string;
  role: string;
  attendance_id: number | null;
  status: 'present' | 'absent' | 'half_day' | 'leave' | null;
  remarks: string | null;
}

interface LeaveRequest {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  half_day: 'Half Day',
  leave: 'Leave',
};

const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-700',
  half_day: 'bg-amber-100 text-amber-700',
  leave: 'bg-blue-100 text-blue-700',
};

function AttendanceTab() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data: rows = [], mutate } = useSWR<AttendanceRow[]>(`/api/hr/attendance?date=${date}`, apiClient.get);

  const handleMark = async (row: AttendanceRow, status: string) => {
    try {
      await apiClient.post('/api/hr/attendance', { user_id: row.user_id, attendance_date: date, status });
      mutate();
    } catch {
      toast.error('Failed to mark attendance');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="attendance_date">Date</Label>
        <Input id="attendance_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48" />
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-4">No staff found</TableCell></TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.user_id}>
                  <TableCell className="font-medium">{row.first_name} {row.last_name}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>
                    <Select value={row.status || ''} onValueChange={(value) => handleMark(row, value)}>
                      <SelectTrigger className={`h-7 w-32 border-0 text-xs font-medium ${row.status ? ATTENDANCE_STATUS_COLORS[row.status] : 'bg-slate-100 text-slate-500'}`}>
                        <SelectValue placeholder="Not marked" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function LeaveTab() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ user_id: '', leave_type: 'casual', from_date: '', to_date: '', reason: '' });
  const { data: leaveRequests = [], mutate } = useSWR<LeaveRequest[]>('/api/hr/leave', apiClient.get);
  const { data: attendanceRows = [] } = useSWR<AttendanceRow[]>(`/api/hr/attendance?date=${new Date().toISOString().slice(0, 10)}`, apiClient.get);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) setFormData({ user_id: '', leave_type: 'casual', from_date: '', to_date: '', reason: '' });
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.user_id || !formData.from_date || !formData.to_date) {
        toast.error('Staff member, from date, and to date are required');
        return;
      }
      try {
        await apiClient.post('/api/hr/leave', { ...formData, user_id: Number(formData.user_id) });
        toast.success('Leave request added');
        mutate();
        handleOpenChange(false);
      } catch {
        toast.error('Failed to add leave request');
      }
    },
    [formData, mutate]
  );

  const handleStatusChange = async (request: LeaveRequest, status: LeaveRequest['status']) => {
    try {
      await apiClient.put(`/api/hr/leave/${request.id}`, { status });
      toast.success(`Marked ${status}`);
      mutate();
    } catch {
      toast.error('Failed to update leave request');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Add Leave Request</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Leave Request</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Staff Member</Label>
                <Select value={formData.user_id} onValueChange={(value) => setFormData({ ...formData, user_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                  <SelectContent>
                    {attendanceRows.map((row) => (
                      <SelectItem key={row.user_id} value={String(row.user_id)}>{row.first_name} {row.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from_date">From Date</Label>
                  <Input id="from_date" type="date" value={formData.from_date} onChange={(e) => setFormData({ ...formData, from_date: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="to_date">To Date</Label>
                  <Input id="to_date" type="date" value={formData.to_date} onChange={(e) => setFormData({ ...formData, to_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaveRequests.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-4">No leave requests found</TableCell></TableRow>
            ) : (
              leaveRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.first_name} {request.last_name}</TableCell>
                  <TableCell className="capitalize">{request.leave_type}</TableCell>
                  <TableCell>{request.from_date}</TableCell>
                  <TableCell>{request.to_date}</TableCell>
                  <TableCell>
                    <Select value={request.status} onValueChange={(value) => handleStatusChange(request, value as LeaveRequest['status'])}>
                      <SelectTrigger className="h-7 w-28 border-0 text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function HrPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">HR</h1>
      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance"><AttendanceTab /></TabsContent>
        <TabsContent value="leave"><LeaveTab /></TabsContent>
      </Tabs>
    </div>
  );
}
