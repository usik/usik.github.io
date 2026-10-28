/* First-party aggregate analytics. No tracking cookies, local IDs, full referrers or message text. */
(()=>{
 if(location.hostname==='terminal.local'||location.hostname==='localhost'||location.hostname==='127.0.0.1'||navigator.webdriver||navigator.globalPrivacyControl||navigator.doNotTrack==='1')return;
 const params=new URLSearchParams(location.search),rawSource=params.get('utm_source')||params.get('source')||'direct',source=/^[a-zA-Z0-9_-]{1,40}$/.test(rawSource)?rawSource:'direct';
 let referrer='';try{referrer=new URL(document.referrer).origin;}catch{}
 function send(event,path){fetch('/api/visit',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({event,path,source,referrer})}).catch(()=>{});}
 let sent=false;function view(){if(sent||document.visibilityState==='hidden')return;sent=true;send('pageview',location.pathname);}
 document.addEventListener('visibilitychange',view);view();
 window.EverStoryAnalytics={trackCharacter:id=>send('character_select','/characters/'+id)};
})();
