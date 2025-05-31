// src/app/ross-nesbitt/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ross Nesbitt -- Linux Guru',
  description: 'Ross Nesbitt\'s professional portfolio and experience in IT-OT Infrastructure and Operations.',
};

export default function RossNesbittLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
