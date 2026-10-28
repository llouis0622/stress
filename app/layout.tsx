import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '오늘도 수고했어 · MINAM BREAK', description: '너만을 위한 작은 해방구.',
  robots: { index: false, follow: false, noarchive: true }, icons: { icon: '/favicon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#edf1f2' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
