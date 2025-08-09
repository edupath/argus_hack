import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Argus Admissions',
  description: 'AI-driven admissions counseling and evaluation',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <body className="text-white h-full overflow-hidden m-0 p-0">
        {children}
      </body>
    </html>
  );
}

