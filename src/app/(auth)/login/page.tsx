import type { Metadata } from 'next';
import Login from '@/views/Login';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to access your secure ServixOS client workspace.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <Login />;
}
