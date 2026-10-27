import type { Metadata } from 'next';
export const metadata: Metadata = {title:'EverStory — 너의 선택, 너의 이야기',description:'캐릭터와 함께 이어가는 AI 인터랙티브 스토리'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="ko"><body style={{margin:0,background:'#101015',color:'#fff'}}>{children}</body></html>}
