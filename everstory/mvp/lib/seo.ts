import { env } from 'cloudflare:workers';
import type { Metadata } from 'next';
export const DEFAULT_ORIGIN='https://everstory.usik-luke.chatgpt.site';
export function siteOrigin(){
 const value=String((env as Record<string,unknown>).PUBLIC_SITE_URL||DEFAULT_ORIGIN);
 const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('PUBLIC_SITE_URL must be an HTTPS origin');return url.origin;
}
export const siteDescription='AI 캐릭터와 나의 선택으로 이어가는 이야기. 녹스와 영어·한국어로 대화하고 뜻 보기·표현 교정으로 언어를 연습하세요. 오리지널 캐릭터 10명, 추천 선택지와 자유 입력을 지원합니다.';
export function pageMetadata(title:string,description:string,path='/'):Metadata{
 const origin=siteOrigin();return {title,description,alternates:{canonical:origin+path},robots:{index:true,follow:true},openGraph:{type:'website',locale:'ko_KR',siteName:'EverStory',title,description,url:origin+path,images:[{url:origin+'/og-everstory.jpg',width:1200,height:630,alt:'EverStory — 나의 선택으로 이어가는 AI 캐릭터 이야기'}]},twitter:{card:'summary_large_image',title,description,images:[origin+'/og-everstory.jpg']}};
}
export function jsonLd(data:unknown){return JSON.stringify(data).replace(/</g,'\\u003c');}
export const faqs=[
 {q:'EverStory는 어떤 서비스인가요?',a:'EverStory는 캐릭터와 대화하며 나의 선택으로 이야기를 이어가는 AI 인터랙티브 스토리 서비스입니다. 로맨스, 판타지, 드라마, 미스터리, BL 장르의 오리지널 캐릭터를 제공합니다.'},
 {q:'첫 장면은 어떻게 시작하나요?',a:'캐릭터를 선택하고 ChatGPT 계정으로 로그인한 뒤 AI 이용과 만 20세 이상 확인에 동의하고 첫 장면 시작하기를 누르세요. AI가 첫 장면과 추천 선택지 3개를 생성합니다.'},
 {q:'정해진 선택지만 골라야 하나요?',a:'아니요. 추천 선택지 3개 중 하나를 선택하거나 원하는 대사와 행동을 직접 입력할 수 있습니다. AI가 입력에 따른 다음 장면을 만듭니다.'},
 {q:'무료로 이용할 수 있나요?',a:'현재 MVP는 계정당 하루 최대 30회의 AI 생성 시도를 무료로 제공합니다. 대화 생성·뜻 보기·표현 교정이 한도를 함께 사용하며, 이미 저장된 뜻을 다시 열 때는 AI 호출을 추가로 사용하지 않습니다. 분당·IP별·전체 서비스 사용량 제한이 있어 한도에 도달하면 이용이 제한될 수 있습니다. 현재 유료 결제는 제공하지 않습니다.'},
 {q:'대화 기록은 저장되나요?',a:'로그인한 계정의 캐릭터·언어별로 대화와 이야기 상태가 저장됩니다. 화면에서는 최근 50턴을 볼 수 있고 JSON 내보내기와 전체 이야기 삭제 기능을 이용할 수 있습니다. 마지막 이용 후 최대 90일 보관합니다.'},
 {q:'대화 중 캐릭터 그림도 바뀌나요?',a:'네. 캐릭터마다 기본 그림과 다정함·긴장·슬픔·결심 표정 그림이 준비되어 있습니다. AI가 대화에 맞는 표정을 선택하며 기록을 다시 열면 해당 그림도 복원됩니다. 현재 임의의 장면을 실시간으로 새로 그리는 기능은 없습니다.'},
 {q:'이메일 사전등록이 필수인가요?',a:'아니요. 이메일 사전등록은 출시 및 초대 안내를 위한 선택 기능입니다. 이야기 저장에 사용하는 로그인과는 별개입니다.'},
 {q:'누가 이용할 수 있나요?',a:'현재 만 20세 이상만 이용할 수 있습니다. 노골적인 성적 콘텐츠를 제공하는 서비스는 아닙니다. AI는 사실과 다른 내용을 만들 수 있으므로 대화에 실제 민감정보를 입력하지 마세요.'},
 {q:'영어와 한국어를 연습할 수 있나요?',a:'녹스의 언어 연습 모드에서 영어 대화와 한국어 도움말, 한국어 대화와 영어 도움말을 선택할 수 있습니다. 쉬움·보통 난이도와 뜻 보기, 선택적인 표현 교정을 제공합니다. 현재 이 연습 기능은 녹스만 지원합니다.'},
 {q:'표현 교정은 자동으로 전송되나요?',a:'아니요. 표현 다듬기는 수정안과 짧은 설명을 제안합니다. 수정안 사용을 눌러 입력창에 반영한 뒤 보내기를 눌러야 이야기에 전송됩니다. 원래 문장을 그대로 보내도 됩니다. AI 교정과 번역에는 오류가 있을 수 있습니다.'},
 {q:'중세 판타지만 있나요?',a:'아니요. 저주받은 왕국의 기사뿐 아니라 현대의 재회 로맨스, 카페의 일상, 음악을 둘러싼 경쟁, 기억과 편지의 미스터리 등 여러 배경의 이야기가 있습니다.'}
];
