import { env } from 'cloudflare:workers';
import type { Metadata } from 'next';
export const DEFAULT_ORIGIN='https://everstory.usik-luke.chatgpt.site';
export function siteOrigin(){
 const value=String((env as Record<string,unknown>).PUBLIC_SITE_URL||DEFAULT_ORIGIN);
 const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('PUBLIC_SITE_URL must be an HTTPS origin');return url.origin;
}
export const siteDescription='나의 선택으로 이어가는 AI 캐릭터 채팅과 인터랙티브 스토리. 로맨스·판타지·드라마·미스터리 캐릭터를 만나 추천 선택지나 자유 입력으로 이야기를 만들어 보세요.';
export function pageMetadata(title:string,description:string,path='/'):Metadata{
 const origin=siteOrigin();return {title,description,alternates:{canonical:origin+path},robots:{index:true,follow:true},openGraph:{type:'website',locale:'ko_KR',siteName:'EverStory',title,description,url:origin+path,images:[{url:origin+'/og-everstory.jpg',width:1200,height:630,alt:'EverStory — 나의 선택으로 이어가는 AI 캐릭터 이야기'}]},twitter:{card:'summary_large_image',title,description,images:[origin+'/og-everstory.jpg']}};
}
export function jsonLd(data:unknown){return JSON.stringify(data).replace(/</g,'\\u003c');}
export const faqs=[
 {q:'EverStory는 어떤 서비스인가요?',a:'EverStory는 캐릭터와 대화하며 나의 선택으로 이야기를 이어가는 AI 인터랙티브 스토리 서비스입니다. 로맨스, 판타지, 드라마, 미스터리, BL 장르의 오리지널 캐릭터를 제공합니다.'},
 {q:'첫 장면은 어떻게 시작하나요?',a:'캐릭터를 선택하고 ChatGPT 계정으로 로그인한 뒤 AI 이용과 만 20세 이상 확인에 동의하고 첫 장면 시작하기를 누르세요. AI가 첫 장면과 추천 선택지 3개를 생성합니다.'},
 {q:'정해진 선택지만 골라야 하나요?',a:'아니요. 추천 선택지 3개 중 하나를 선택하거나 원하는 대사와 행동을 직접 입력할 수 있습니다. AI가 입력에 따른 다음 장면을 만듭니다.'},
 {q:'무료로 이용할 수 있나요?',a:'현재 MVP는 계정당 하루 최대 30회의 AI 응답을 무료로 제공합니다. 분당·IP별·전체 서비스 사용량 제한이 있어 한도에 도달하면 이용이 제한될 수 있습니다. 현재 유료 결제는 제공하지 않습니다.'},
 {q:'대화 기록은 저장되나요?',a:'로그인한 계정의 캐릭터·언어별로 대화와 이야기 상태가 저장됩니다. 화면에서는 최근 50턴을 볼 수 있고 JSON 내보내기와 전체 이야기 삭제 기능을 이용할 수 있습니다. 마지막 이용 후 최대 90일 보관합니다.'},
 {q:'대화 중 캐릭터 그림도 바뀌나요?',a:'네. 캐릭터마다 기본 그림과 다정함·긴장·슬픔·결심 표정 그림이 준비되어 있습니다. AI가 대화에 맞는 표정을 선택하며 기록을 다시 열면 해당 그림도 복원됩니다. 현재 임의의 장면을 실시간으로 새로 그리는 기능은 없습니다.'},
 {q:'이메일 사전등록이 필수인가요?',a:'아니요. 이메일 사전등록은 출시 및 초대 안내를 위한 선택 기능입니다. 이야기 저장에 사용하는 로그인과는 별개입니다.'},
 {q:'누가 이용할 수 있나요?',a:'현재 만 20세 이상만 이용할 수 있습니다. 노골적인 성적 콘텐츠를 제공하는 서비스는 아닙니다. AI는 사실과 다른 내용을 만들 수 있으므로 대화에 실제 민감정보를 입력하지 마세요.'},
 {q:'중세 판타지만 있나요?',a:'아니요. 저주받은 왕국의 기사뿐 아니라 현대의 재회 로맨스, 카페의 일상, 음악을 둘러싼 경쟁, 기억과 편지의 미스터리 등 여러 배경의 이야기가 있습니다.'}
];
