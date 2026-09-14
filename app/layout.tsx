import type { Metadata } from 'next';
import { FamilyProvider } from '@/components/genealogy/provider';
import { Header } from '@/components/genealogy/header';
import { MotionProvider } from '@/components/genealogy/motion-provider';
import { GenealogyTools } from '@/components/genealogy/webmcp';
import { AIAssistantProvider } from '@/components/ai/ai-assistant-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gia phả họ Nguyễn Bá',
  description:
    'Gia phả họ Nguyễn Bá: tìm về cội nguồn, kết nối các thế hệ và ghi nhớ ngày giỗ tổ tiên.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <FamilyProvider>
          <AIAssistantProvider>
            <MotionProvider>
              <GenealogyTools />
              <Header />
              {children}
            </MotionProvider>
          </AIAssistantProvider>
        </FamilyProvider>
      </body>
    </html>
  );
}
