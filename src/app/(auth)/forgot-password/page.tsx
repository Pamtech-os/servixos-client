import type { Metadata } from 'next';
import ForgotPassword from '@/views/ForgotPassword';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your ServixOS account password and restore access securely.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPassword />;
}
