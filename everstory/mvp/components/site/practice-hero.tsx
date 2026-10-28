'use client';
import {useState} from 'react';

export function PracticeHero(){
 const [paused,setPaused]=useState(false);
 return <div className={'practice-hero-copy'+(paused?' flip-paused':'')}>
  <h1>좋아하는 캐릭터와,<br/><span className="visually-hidden">영어 또는 한국어로</span><span className="language-flip" aria-hidden="true"><span className="flip-en"><u>영어</u>로</span><span className="flip-ko"><u>한국어</u>로</span></span><br className="hero-mobile-break"/> 이어가는 이야기.</h1>
  <button className="flip-control" type="button" aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?'언어 전환 재생':'언어 전환 멈추기'}</button>
 </div>;
}
