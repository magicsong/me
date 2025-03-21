import './globals.css';
import { Suspense } from 'react'

import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: 'app for me',
  description:
    'This is my personal application for managing tasks and projects.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen w-full flex-col"><Suspense>{children}</Suspense></body>
      <Analytics />
    </html>
  );
}
