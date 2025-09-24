
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { Footer } from '@/components/layout/Footer';

import './globals.css';

export const metadata = {
  title: 'WhatsApp bot site hosting',
  description: 'Host and manage your WhatsApp bots with ease',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>

        <Footer />
      </body>
    </html>
  );
}
