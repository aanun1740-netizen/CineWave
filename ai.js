// Keep the existing public Edge Function and its message payload unchanged.
(() => {
 const panel=$('cw-ai-panel'),messages=$('cw-ai-messages'),form=$('cw-ai-form'),input=$('cw-ai-input'),send=$('cw-ai-send');
 window.openCineWaveAI=()=>{panel.hidden=false;$('cw-ai-button').setAttribute('aria-expanded','true');input.focus();};
 window.closeCineWaveAI=()=>{panel.hidden=true;$('cw-ai-button').setAttribute('aria-expanded','false');$('cw-ai-button').focus();};
 $('cw-ai-button').addEventListener('click',()=>panel.hidden?window.openCineWaveAI():window.closeCineWaveAI());$('cw-ai-close').addEventListener('click',window.closeCineWaveAI);
 function addMessage(text,who){const node=document.createElement('div');node.className='cw-ai-msg '+(who==='user'?'cw-ai-user':'cw-ai-bot');node.textContent=text;messages.append(node);messages.scrollTop=messages.scrollHeight;return node;}
 form.addEventListener('submit',async event=>{
  event.preventDefault();const message=input.value.trim();if(!message||send.disabled)return;addMessage(message,'user');input.value='';input.disabled=true;send.disabled=true;const waiting=addMessage(uiText('aiThinking'),'bot');waiting.dataset.aiStatus='aiThinking';
  try{
   const response=await fetch(`${PUBLIC_API.url}/functions/v1/cinewave-ai`,{method:'POST',headers:{'Content-Type':'application/json',apikey:PUBLIC_API.key,Authorization:PUBLIC_API.key},body:JSON.stringify({message})});
   const data=await response.json();if(!response.ok)throw new Error('ai-unavailable');if(typeof data.answer==='string'&&data.answer.trim()){waiting.textContent=data.answer;delete waiting.dataset.aiStatus;}else{waiting.textContent=uiText('aiNoAnswer');waiting.dataset.aiStatus='aiNoAnswer';}
  }catch{waiting.textContent=uiText('aiError');waiting.dataset.aiStatus='aiError';}finally{input.disabled=false;send.disabled=false;if(!panel.hidden)input.focus();}
 });
})();
