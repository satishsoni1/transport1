'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type ProfileResponse = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  platform_role: string;
  status: string;
};

type UpdateProfileResponse = {
  success: boolean;
  token: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    platformRole?: string;
    transportId?: number | null;
    transportName?: string | null;
    transportSlug?: string | null;
    subscription?: {
      plan?: string | null;
      status?: 'none' | 'active' | 'near_expiry' | 'expired';
      startDate?: string | null;
      endDate?: string | null;
      daysRemaining?: number | null;
      warningDays?: number;
      message?: string | null;
    };
  };
  message: string;
};

export default function ProfilePage() {
  const { user, updateSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const data = await apiClient.get<ProfileResponse>('/api/account/profile');
        if (!active) return;
        setFormData((prev) => ({
          ...prev,
          email: data.email || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
        }));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.email.trim() || !formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('Please fill username, first name and last name');
      return;
    }

    if (formData.new_password || formData.confirm_password) {
      if (!formData.current_password) {
        toast.error('Enter current password to set a new password');
        return;
      }
      if (formData.new_password !== formData.confirm_password) {
        toast.error('New password and confirm password do not match');
        return;
      }
    }

    setSaving(true);
    try {
      const response = await apiClient.put<UpdateProfileResponse, typeof formData>(
        '/api/account/profile',
        formData
      );
      updateSession({ token: response.token, user: response.user });
      setFormData((prev) => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: '',
      }));
      toast.success(response.message || 'Profile updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Update your login username, password, and account details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="email">Username / Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={loading || saving}
                />
              </div>
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  disabled={loading || saving}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  disabled={loading || saving}
                />
              </div>
              <div>
                <Label>Role</Label>
                <Input value={user.role || ''} disabled />
              </div>
              <div>
                <Label>Status</Label>
                <Input value={user.status || ''} disabled />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-base font-semibold text-slate-900">Change Password</h2>
              <p className="mt-1 text-sm text-slate-600">
                Leave the password fields blank if you only want to update your profile details.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={formData.current_password}
                    onChange={(e) => handleChange('current_password', e.target.value)}
                    disabled={loading || saving}
                  />
                </div>
                <div>
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={formData.new_password}
                    onChange={(e) => handleChange('new_password', e.target.value)}
                    disabled={loading || saving}
                  />
                </div>
                <div>
                  <Label htmlFor="confirm_password">Confirm Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e) => handleChange('confirm_password', e.target.value)}
                    disabled={loading || saving}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading || saving}>
                {saving ? 'Saving...' : 'Update Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
