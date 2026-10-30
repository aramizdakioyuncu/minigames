import { MatchResults } from '../../ui/matchResults.js';
export class SpacePanels {
  constructor() {
    const root=document.getElementById('view-game');
    this.ventPanel=document.createElement('section');
    this.ventPanel.id='space-vent-controls';
    this.ventPanel.className='space-vent-controls hidden';
    this.ventPanel.setAttribute('aria-label','Havalandırma geçişleri');
    root.appendChild(this.ventPanel);
    this.results=new MatchResults('space',document.querySelector('.space-hud-actions'));
    this.createColorPicker(root);
  }
  reset() {
    this.lastVent=null; this.results.reset(); this.colorModal.classList.add('hidden');
    this.pendingVentActionUntil=0;
    this.ventPanel.classList.add('hidden');
  }
  sendVentAction(action) {
    this.pendingVentActionUntil=Date.now()+500;
    for(const button of this.ventPanel.querySelectorAll('button')) button.disabled=true;
    window.gameApp.socket.sendAction(action);
  }
  createColorPicker(root) {
    this.colorButton=document.createElement('button');this.colorButton.id='btn-space-color';this.colorButton.className='btn btn-secondary';this.colorButton.textContent='🎨 Renk Seç';
    document.querySelector('.space-hud-actions').appendChild(this.colorButton);
    this.colorModal=document.createElement('div');this.colorModal.id='modal-space-color';this.colorModal.className='modal-overlay hidden';
    this.colorModal.setAttribute('role','dialog');this.colorModal.setAttribute('aria-label','Oyuncu rengi seç');
    this.colorModal.innerHTML='<div class="glass-card color-picker-card"><h2>Rengini seç</h2><p>Boş renklerden birini seç veya şansa bırak. Maç sırasında renk değiştirilemez.</p><div class="space-color-grid"></div><div class="space-result-actions"><button id="btn-space-random-color" class="btn btn-primary">Rastgele Renk</button><button id="btn-close-space-color" class="btn btn-secondary">Kapat</button></div></div>';
    root.appendChild(this.colorModal);
    this.colorButton.onclick=()=>this.colorModal.classList.remove('hidden');
    this.colorModal.querySelector('#btn-close-space-color').onclick=()=>this.colorModal.classList.add('hidden');
    this.colorModal.querySelector('#btn-space-random-color').onclick=()=>this.selectColor(null);
  }
  selectColor(color) {
    window.gameApp.socket.sendAction({type:'choose_color',color});
    try {if(color)localStorage.setItem('space-color',color);else localStorage.removeItem('space-color');}catch{}
  }
  restoreColor() {
    try {const color=localStorage.getItem('space-color');if(color)window.gameApp.socket.sendAction({type:'choose_color',color});}catch{}
  }
  updateColors(state,myId) {
    const s=state.modeState,allowed=['waiting','game_over'].includes(s.gameState);
    this.colorButton.classList.toggle('hidden',!allowed);
    if(!allowed)this.colorModal.classList.add('hidden');
    const grid=this.colorModal.querySelector('.space-color-grid');
    if(!grid.children.length)for(const choice of s.colorPalette||[]) {
      const button=document.createElement('button');button.className='space-color-choice';button.dataset.color=choice.color;button.style.setProperty('--choice',choice.color);button.textContent=choice.name;button.onclick=()=>this.selectColor(choice.color);grid.appendChild(button);
    }
    const own=s.playersMeta.find(p=>p.id===myId),used=new Set(s.playersMeta.filter(p=>p.id!==myId).map(p=>p.color));
    for(const button of grid.children) {
      button.disabled=!allowed||used.has(button.dataset.color);button.setAttribute('aria-pressed',String(button.dataset.color===own?.color));
      button.title=used.has(button.dataset.color)?'Bu renk başka bir oyuncuda':button.textContent;
    }
    if(own)this.colorButton.style.borderColor=own.color;
  }
  update(state,myId) {
    const s=state.modeState, me=s.playersMeta.find(p=>p.id===myId);
    const vent=s.vents.find(v=>v.id===me?.ventId);
    this.ventPanel.classList.toggle('hidden',!me?.isVented || s.gameState!=='playing');
    if(me?.isVented && vent && this.lastVent!==vent.id) {
      this.lastVent=vent.id; this.ventPanel.replaceChildren();
      const title=document.createElement('strong'); title.textContent='VENT • Gideceğin odayı seç'; this.ventPanel.appendChild(title);
      const hint=document.createElement('p'); hint.textContent='Yön tuşları: geçiş • V: çıkış'; this.ventPanel.appendChild(hint);
      for(const targetId of vent.connectsTo) {
        const target=s.vents.find(v=>v.id===targetId), room=s.rooms.find(r=>r.id===target.room);
        const button=document.createElement('button'); button.className='btn btn-secondary'; button.dataset.vent=targetId;
        button.textContent=room?.name||targetId;
        button.onclick=()=>this.sendVentAction({type:'vent_travel',targetId}); this.ventPanel.appendChild(button);
      }
      const exit=document.createElement('button'); exit.className='btn btn-primary';exit.id='btn-space-exit-vent';exit.textContent='Ventten Çık (V)';
      exit.onclick=()=>this.sendVentAction({type:'vent_exit'}); this.ventPanel.appendChild(exit);
    }
    if(!me?.isVented) this.lastVent=null;
    for(const button of this.ventPanel.querySelectorAll('button')) button.disabled=(me?.ventCooldownMs||0)>0||Date.now()<this.pendingVentActionUntil;
    this.results.update(state,myId);
    this.updateColors(state,myId);
  }
}
