import './globals.css';
import { Suspense } from 'react'

import { Toaster } from '@/components/ui/toaster';
import { PomodoroProvider } from './contexts/pomodoro-context';
import { PomodoroReminder } from '@/components/pomodoro-reminder';

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
      <body className="flex min-h-screen w-full flex-col overflow-x-hidden">
        <PomodoroProvider>
          <Suspense>{children}</Suspense>
          <Toaster />
          <PomodoroReminder />
        </PomodoroProvider>
      </body>
    </html>
  );
}
