'use client';

import { useState } from 'react';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/client-api';
import ModernSpinner from '@/components/ModernSpinner';

interface ForcePasswordChangeGateProps {
  open: boolean;
  userEmail?: string;
  onSuccess?: () => void;
}

const ForcePasswordChangeGate = ({ open, userEmail, onSuccess }: ForcePasswordChangeGateProps) => {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    form?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const validate = () => {
    const nextErrors: typeof errors = {};

    if (!currentPassword) {
      nextErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword) {
      nextErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(newPassword)) {
      nextErrors.newPassword = 'Password must include at least one uppercase letter';
    } else if (!/\d/.test(newPassword)) {
      nextErrors.newPassword = 'Password must include at least one digit';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    if (currentPassword && newPassword && currentPassword === newPassword) {
      nextErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors((previous) => ({ ...previous, form: undefined }));

    try {
      await changePassword({ currentPassword, newPassword, confirmPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      onSuccess?.();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors((previous) => ({
          ...previous,
          form: error.message || 'Unable to update password. Please try again.',
        }));
      } else if (error instanceof Error) {
        setErrors((previous) => ({ ...previous, form: error.message }));
      } else {
        setErrors((previous) => ({
          ...previous,
          form: 'Unable to update password. Please try again.',
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='fixed inset-0 z-[120] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm'>
      <div className='w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl'>
        <div className='mb-6 space-y-2 text-center'>
          <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600'>
            <ShieldAlert className='h-6 w-6' />
          </div>
          <h2 className='font-display text-xl font-bold'>Update Temporary Password</h2>
          <p className='text-sm text-muted-foreground'>
            For security, you must change your temporary password before continuing.
          </p>
          {userEmail && <p className='text-xs text-muted-foreground'>Signed in as {userEmail}</p>}
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='current-password'>Current Password</Label>
            <Input
              id='current-password'
              type='password'
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={errors.currentPassword ? 'border-destructive' : ''}
              autoComplete='current-password'
            />
            {errors.currentPassword && (
              <p className='text-xs text-destructive'>{errors.currentPassword}</p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='new-password-gate'>New Password</Label>
            <Input
              id='new-password-gate'
              type='password'
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={errors.newPassword ? 'border-destructive' : ''}
              autoComplete='new-password'
            />
            {errors.newPassword && <p className='text-xs text-destructive'>{errors.newPassword}</p>}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='confirm-password-gate'>Confirm New Password</Label>
            <Input
              id='confirm-password-gate'
              type='password'
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={errors.confirmPassword ? 'border-destructive' : ''}
              autoComplete='new-password'
            />
            {errors.confirmPassword && (
              <p className='text-xs text-destructive'>{errors.confirmPassword}</p>
            )}
          </div>

          {errors.form && <p className='text-center text-xs text-destructive'>{errors.form}</p>}

          <Button type='submit' className='gradient-bg w-full text-primary-foreground' disabled={loading}>
            {loading ? (
              <ModernSpinner size='md' color='primary-foreground' />
            ) : (
              <>
                <KeyRound size={16} /> Update Password
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ForcePasswordChangeGate;
