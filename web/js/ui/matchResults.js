const teamName = team => ({red:'KIRMIZI TAKIM',blue:'MAVİ TAKIM',crew:'MÜRETTEBAT',impostor:'CASUSLAR'}[team] || team);
const teamTone = team => ['red','impostor'].includes(team) ? 'red' : 'blue';
const el = (tag, className, text) => {
  const node=document.createElement(tag);node.className=className||'';
  if(text!==undefined)node.textContent=text;return node;
};

// One authoritative result presentation for team games. All player text uses textContent.
export class MatchResults {
  constructor(mode, anchor) {
    this.mode=mode;
    const prefix=this.prefix=mode==='space'?'space':'puck';
    this.modal=el('div','modal-overlay match-results hidden');this.modal.id=`modal-${prefix}-result`;
    this.modal.setAttribute('role','dialog');this.modal.setAttribute('aria-modal','true');
    this.modal.setAttribute('aria-labelledby',`${prefix}-result-title`);
    this.modal.innerHTML=`<div class="match-result-card glass-card">
      <div class="result-heading"><div><p class="result-eyebrow">MAÇ SONUCU <span class="result-verdict"></span></p><h2 id="${prefix}-result-title"></h2></div><div class="result-trophy" aria-hidden="true">🏆</div></div>
      <p id="${prefix}-result-reason" class="result-reason"></p>
      <div class="result-scoreboard"></div><div class="result-lineups"></div>
      <div class="space-result-scroll"><table class="space-result-table"><thead><tr><th>Oyuncu</th><th>Takım</th><th>Sonuç</th><th>${mode==='space'?'Görev':'Takım skoru'}</th></tr></thead><tbody id="${prefix}-result-players"></tbody></table></div>
      <p class="result-note">${mode==='space'?'Hayaletler de kendi takımlarıyla birlikte kazanır. ':''}Sonuçlar yeni maç başlayana kadar korunur.</p>
      <div class="space-result-actions"><button id="btn-${prefix}-next-match" class="btn btn-primary">Yeni Maç</button><button id="btn-${prefix}-close-result" class="btn btn-secondary">${mode==='space'?'Haritaya':'Sahaya'} Dön</button><button id="btn-${prefix}-result-leave" class="btn btn-danger">Lobiye Dön</button></div>
    </div>`;
    document.getElementById('view-game').appendChild(this.modal);
    this.closeButton=this.modal.querySelector(`#btn-${prefix}-close-result`);
    this.closeButton.onclick=()=>this.hide();
    this.modal.querySelector(`#btn-${prefix}-result-leave`).onclick=()=>window.gameApp.socket.leaveRoom();
    this.next=this.modal.querySelector(`#btn-${prefix}-next-match`);
    this.next.onclick=()=>window.gameApp.socket.sendAction({type:'start_match'});
    this.button=el('button','btn btn-primary hidden','Maç Sonuçları');this.button.id=`btn-${prefix}-show-result`;
    anchor.appendChild(this.button);this.button.onclick=()=>this.show();
    this.modal.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.stopPropagation();this.hide();}
      if(event.key==='Tab') {
        const buttons=[...this.modal.querySelectorAll('button')].filter(b=>!b.classList.contains('hidden'));
        const first=buttons[0],last=buttons.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    });
  }
  reset(){this.lastResult=null;this.modal.classList.add('hidden');this.button.classList.add('hidden');}
  hide(){this.modal.classList.add('hidden');this.button.focus();}
  show(){
    this.modal.classList.remove('hidden');window.gameApp.input.resetKeys();
    this.closeButton.focus({preventScroll:true});
    this.modal.querySelector('.match-result-card').scrollTop=0;this.modal.scrollTop=0;
  }
  update(state,myId) {
    const result=state.modeState.result;
    this.button.classList.toggle('hidden',!result);
    if(!result){this.reset();return;}
    this.next.classList.toggle('hidden',state.hostId!==myId);
    if(this.lastResult===result.id)return;
    this.lastResult=result.id;
    const own=result.players.find(p=>p.id===myId),draw=result.winner==='draw';
    this.modal.querySelector('.result-trophy').textContent=draw?'🤝':'🏆';
    const title=this.modal.querySelector(`#${this.prefix}-result-title`);
    title.textContent=draw?'BERABERE':own?(own.outcome==='winner'?'KAZANDIN':'KAYBETTİN'):'MAÇ TAMAMLANDI';
    title.className=draw?'draw':own?.outcome||'';
    this.modal.querySelector('.result-verdict').textContent=draw?'DRAW':own?.outcome==='loser'?'DEFEAT':'VICTORY';
    this.modal.querySelector(`#${this.prefix}-result-reason`).textContent=result.reason;
    const teams=this.mode==='puck'?['red','blue']:['crew','impostor'];
    const scoreboard=this.modal.querySelector('.result-scoreboard');scoreboard.replaceChildren();
    for(const team of teams) {
      const cell=el('div',`result-score ${teamTone(team)}`);
      cell.append(el('strong','',teamName(team)),el('b','result-score-number',this.mode==='puck'?String(team==='red'?result.scoreRed:result.scoreBlue):String(result.players.filter(p=>p.role===team).length)+' OYUNCU'),el('span','',draw?'DRAW':result.winner===team?'WINNER • KAZANAN':'LOSER • KAYBEDEN'));
      scoreboard.appendChild(cell);
    }
    const lineups=this.modal.querySelector('.result-lineups');lineups.replaceChildren();
    const ordered=[...teams].sort((a,b)=>Number(b===result.winner)-Number(a===result.winner));
    for(const team of ordered) {
      const won=team===result.winner;
      const section=el('section',`result-team ${teamTone(team)} ${won?'winning-team':draw?'draw-team':'losing-team'}`);section.dataset.team=team;
      section.appendChild(el('h3','',`${won?'WINNER':draw?'DRAW':'LOSER'} / ${teamName(team)}`));
      if(won) {
        const celebration=el('div','victory-confetti');celebration.setAttribute('aria-hidden','true');
        for(let i=0;i<40;i++) {const piece=el('i');piece.style.setProperty('--x',`${(i*47)%100}%`);piece.style.setProperty('--delay',`${i%9*-0.3}s`);piece.style.setProperty('--hue',String((i*61)%360));celebration.appendChild(piece);}
        section.appendChild(celebration);
      }
      const squad=el('div','victory-squad');squad.setAttribute('aria-label',`${teamName(team)} takım kadrosu`);
      for(const [index,p] of result.players.filter(p=>(p.team||p.role)===team).entries()) {
        const member=el('figure',`squad-member pose-${index%3} ${this.mode==='space'?'astronaut':'footballer'}`);
        member.dataset.playerId=p.id;member.style.setProperty('--suit',this.mode==='space'?p.color:team==='red'?'#ef4444':'#3b82f6');
        const character=el('div','squad-character');character.setAttribute('aria-hidden','true');
        if(this.mode==='space')character.innerHTML='<span class="squad-arm arm-left"></span><span class="squad-arm arm-right"></span><span class="squad-png-body"></span><img class="squad-visor" src="assets/space/png/player-visor.png" alt="">';
        else {character.innerHTML='<span class="squad-head"></span><span class="squad-arm arm-left"></span><span class="squad-arm arm-right"></span><span class="squad-jersey"></span><span class="squad-leg leg-left"></span><span class="squad-leg leg-right"></span>';character.querySelector('.squad-jersey').textContent=String(index+1);}
        member.append(character,el('figcaption','',p.name+(p.id===myId?' • SEN':'')));
        squad.appendChild(member);
      }
      if(!squad.children.length)squad.appendChild(el('p','result-note','Bu takımda katılımcı yok.'));
      section.appendChild(squad);lineups.appendChild(section);
    }
    const body=this.modal.querySelector(`#${this.prefix}-result-players`);body.replaceChildren();
    for(const p of [...result.players].sort((a,b)=>Number(b.outcome==='winner')-Number(a.outcome==='winner'))) {
      const row=el('tr',`${p.outcome} team-${teamTone(p.team||p.role)}`);row.dataset.playerId=p.id;
      for(const value of [p.name+(p.id===myId?' (Sen)':''),teamName(p.team||p.role),p.outcome==='draw'?'BERABERE':p.outcome==='winner'?'WINNER / KAZANAN':'LOSER / KAYBEDEN',this.mode==='space'?(p.role==='crew'?p.tasks:'—'):p.score])row.appendChild(el('td','',String(value)));
      body.appendChild(row);
    }
    this.show();
  }
}
