import type { Metadata } from 'next';
import './public.css';
import {pageMetadata,siteDescription} from '../lib/seo';
export const metadata: Metadata = {...pageMetadata('EverStory | 나의 선택으로 이어가는 AI 캐릭터 채팅',siteDescription),icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="ko"><body>{children}</body></html>}
