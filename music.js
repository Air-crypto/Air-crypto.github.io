(() => {
  'use strict';
  const music=document.querySelector('.music');
  const panel=document.getElementById('music-panel');
  const button=document.getElementById('music-toggle');
  const icon=document.getElementById('play-icon');
  const status=document.getElementById('music-status');
  let player=null, ready=false, loading=false, wantsPlay=false, hasPlayed=false, timeout;
  function playing(active){
    music.classList.toggle('is-playing',active);
    icon.textContent=active?'Ⅱ':'▶';
    button.setAttribute('aria-label',(active?'Pause':'Play')+' Unethical by Faouzia');
  }
  function close(){
    wantsPlay=false;
    if(ready) player.pauseVideo();
    panel.hidden=true;
    button.setAttribute('aria-expanded','false');
    playing(false);
  }
  function load(){
    if(loading) return;
    loading=true;
    timeout=setTimeout(()=>{status.textContent='If the player is unavailable, listen on YouTube below.';},12000);
    window.onYouTubeIframeAPIReady=()=>{
      player=new YT.Player('youtube-player',{
        width:320,height:210,videoId:'I1zqCX3Dvxo',
        host:'https://www.youtube-nocookie.com',
        playerVars:{playsinline:1,rel:0,origin:location.origin},
        events:{
          onReady:()=>{
            ready=true;clearTimeout(timeout);
            player.getIframe().title='Unethical by Faouzia — official music video';
            player.getIframe().setAttribute('referrerpolicy','strict-origin-when-cross-origin');
            status.textContent='Press play in the video if playback does not begin.';
            if(wantsPlay)player.playVideo();
          },
          onStateChange:e=>{
            const active=e.data===YT.PlayerState.PLAYING;
            playing(active);
            if(active){music.classList.add('has-listened');hasPlayed=true;status.textContent='Now playing · Unethical by Faouzia';}
            if(e.data===YT.PlayerState.PAUSED)status.textContent=hasPlayed?'Paused':'Press play in the video to start listening.';
            if(e.data===YT.PlayerState.ENDED){wantsPlay=false;status.textContent='Play it again whenever you like.';}
          },
          onError:()=>{clearTimeout(timeout);playing(false);status.textContent='The video could not play here. Listen on YouTube below.';}
        }
      });
    };
    const script=document.createElement('script');
    script.src='https://www.youtube.com/iframe_api';
    script.onerror=()=>{clearTimeout(timeout);status.textContent='The player could not load. Listen on YouTube below.';loading=false;script.remove();};
    document.head.append(script);
  }
  button.addEventListener('click',()=>{
    if(music.classList.contains('is-playing')){player.pauseVideo();wantsPlay=false;return;}
    panel.hidden=false;button.setAttribute('aria-expanded','true');wantsPlay=true;
    if(ready)player.playVideo();else load();
  });
  document.getElementById('music-close').addEventListener('click',()=>{close();button.focus();});
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){close();button.focus();event.stopPropagation();}});
})();
