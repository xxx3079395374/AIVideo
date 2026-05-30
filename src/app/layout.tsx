import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';
import { Navigation } from '@/components/navigation';
import { TeamCard } from '@/components/team-card';
import { CreationProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: {
    default: 'Xone - 电影公司',
    template: '%s | Xone',
  },
  description: 'Xone是一款AI驱动的视频创作工具，从文案到分镜，让创作更简单',
  keywords: ['AI视频', '分镜创作', '视频制作', 'AI创作'],
  authors: [{ name: 'Xone Team' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-[#0a1628] text-[#E8F8FF] min-h-screen">
        {/* Atmospheric background layers */}
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0,200,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.035) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        <div className="fixed z-0 pointer-events-none rounded-full" style={{ width: 560, height: 560, background: 'rgba(0,190,255,0.15)', filter: 'blur(120px)', top: -180, left: -120, animation: 'driftA 22s ease-in-out infinite' }} />
        <div className="fixed z-0 pointer-events-none rounded-full" style={{ width: 400, height: 400, background: 'rgba(255,130,40,0.1)', filter: 'blur(100px)', bottom: -120, right: -80, animation: 'driftB 26s ease-in-out infinite' }} />
        <div className="fixed z-0 pointer-events-none" style={{ left: 0, right: 0, top: -4, height: 4, background: 'linear-gradient(transparent, rgba(0,200,255,0.07), transparent)', animation: 'scan 14s linear infinite' }} />
        {isDev && <Inspector />}
        <CreationProvider>
          <Navigation />
          <main className="pt-16 min-h-screen">
            {children}
          </main>
          <TeamCard />
        </CreationProvider>
      </body>
    </html>
  );
}
