export class TasksMiniGamesController {
  constructor(ui) {
    this.ui = ui;
    this.timers = new Set();
    this.activeTaskStation = null;
  }

  later(callback, delay) {
    const timer = setTimeout(() => { this.timers.delete(timer); callback(); }, delay);
    this.timers.add(timer);
  }

  openTask(station, onComplete) {
    this.closeTask();
    this.activeTaskStation = station;
    this.startedAt = performance.now();
    this.finishing = false;
    this.ui.taskMiniIcon.textContent = station.icon || '⚡';
    this.ui.taskMiniTitle.textContent = station.name;
    const id = station.id;
    const kind = /scan|med|bio/.test(id) ? 'medscan' : /shield/.test(id) ? 'shields' :
      /trash|filter|clean|fuel/.test(id) ? 'trash' : /react|engine|align/.test(id) ? 'reactor' :
      /steer|download|nav|route/.test(id) ? 'steer' : 'wires';
    Object.entries(this.ui.taskPanels).forEach(([name, panel]) => panel?.classList.toggle('hidden', name !== kind));
    const finish = () => {
      if (this.finishing || this.activeTaskStation !== station) return;
      this.finishing = true;
      this.ui.taskMiniTitle.textContent = 'İşlem doğrulanıyor…';
      const remaining = station.duration * 1000 - (performance.now() - this.startedAt) + 200;
      this.later(() => {
        if (this.activeTaskStation !== station) return;
        onComplete?.(station);
        this.closeTask();
      }, Math.max(400, remaining));
    };
    if (kind === 'wires') this.wires(finish);
    if (kind === 'shields') {
      const grid = document.getElementById('shields-grid');
      grid.replaceChildren();
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const button = document.createElement('button');
        button.className = 'shield-hex damaged';
        button.textContent = String(i + 1);
        button.onclick = () => { button.disabled = true; button.className = 'shield-hex active'; if (++count === 7) finish(); };
        grid.appendChild(button);
      }
    }
    if (kind === 'medscan') {
      const tick = () => {
        const progress = Math.min(100, (performance.now() - this.startedAt) / (station.duration * 10));
        document.getElementById('medscan-bar-fill').style.width = `${progress}%`;
        document.getElementById('medscan-status-text').textContent = `Tarama: %${Math.floor(progress)}`;
        if (progress >= 100) finish(); else this.later(tick, 100);
      };
      tick();
    }
    if (kind === 'trash') {
      const button = document.getElementById('btn-pull-trash');
      button.disabled = false;
      button.onclick = () => { button.disabled = true; finish(); };
      document.getElementById('trash-lever-handle').onclick = button.onclick;
    }
    if (kind === 'reactor') {
      const grid = document.getElementById('reactor-pad-grid');
      grid.replaceChildren();
      let next = 1;
      document.getElementById('reactor-seq-display').textContent = 'Sıra: 1 → 2 → 3 → 4 → 5';
      for (const number of [3, 1, 5, 2, 4]) {
        const button = document.createElement('button');
        button.className = 'btn btn-primary';
        button.textContent = number;
        button.onclick = () => { if (number === next) { button.disabled = true; if (++next === 6) finish(); } };
        grid.appendChild(button);
      }
    }
    if (kind === 'steer') {
      document.getElementById('radar-status').textContent = 'Hedefe tıkla';
      document.getElementById('radar-ship-target').onclick = () => {
        document.getElementById('radar-status').textContent = 'Rota kilitlendi'; finish();
      };
    }
    this.ui.modalTaskInteractive.classList.remove('hidden');
  }

  wires(finish) {
    const left = document.getElementById('wire-left-col');
    const right = document.getElementById('wire-right-col');
    const box=document.getElementById('wiring-game-box'),svg=document.getElementById('wire-svg');
    svg.replaceChildren();
    left.replaceChildren(); right.replaceChildren();
    const colors = [['red', '#ef4444', 'Kırmızı'], ['blue', '#3b82f6', 'Mavi'], ['yellow', '#eab308', 'Sarı'], ['pink', '#ec4899', 'Pembe']];
    let selected = null;
    let drag=null;
    const connected=new Set();
    const point=(button,side)=>{const a=button.getBoundingClientRect(),b=box.getBoundingClientRect();return {x:(side==='left'?a.right:a.left)-b.left,y:a.top+a.height/2-b.top};};
    const draw=()=>{
      svg.replaceChildren();
      for(const [id,color] of colors) {
        if(!connected.has(id)&&drag?.color!==id)continue;
        const from=point(left.querySelector(`[data-color="${id}"]`),'left');
        const to=connected.has(id)?point(right.querySelector(`[data-color="${id}"]`),'right'):drag;
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');
        const mid=(from.x+to.x)/2;
        path.setAttribute('d',`M ${from.x} ${from.y} C ${mid} ${from.y}, ${mid} ${to.y}, ${to.x} ${to.y}`);
        path.setAttribute('stroke',color);path.setAttribute('stroke-width','7');path.setAttribute('fill','none');path.setAttribute('stroke-linecap','round');
        path.dataset.wire=id;path.classList.toggle('wire-preview',!connected.has(id));svg.appendChild(path);
      }
    };
    const select=id=>{selected=id;left.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.color===id));};
    const connect=id=>{
      if(selected!==id||connected.has(id))return;
      connected.add(id);
      for(const column of [left,right]){const button=column.querySelector(`[data-color="${id}"]`);button.disabled=true;button.classList.add('connected');button.classList.remove('active');}
      selected=null;drag=null;draw();
      if(connected.size===4)finish();
    };
    const order=[...colors];for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    for (const [column, list] of [[left, colors], [right, order]]) {
      for (const [id, color, name] of list) {
        const button = document.createElement('button');
        button.className = 'wire-node';
        button.dataset.color = id;
        button.style.setProperty('--wire-c', color);
        button.textContent = name;
        button.setAttribute('aria-label', `${column === left ? 'Sol' : 'Sağ'} ${name} kablo`);
        button.onclick = () => {
          if(column===left)select(id);else connect(id);
        };
        if(column===left)button.onpointerdown=event=>{
          if(event.button!==0||button.disabled)return;
          event.preventDefault();select(id);const b=box.getBoundingClientRect();
          drag={color:id,x:event.clientX-b.left,y:event.clientY-b.top};box.setPointerCapture(event.pointerId);draw();
        };
        column.appendChild(button);
      }
    }
    box.onpointermove=event=>{if(!drag)return;const b=box.getBoundingClientRect();drag.x=event.clientX-b.left;drag.y=event.clientY-b.top;draw();};
    box.onpointerup=event=>{
      if(!drag)return;
      const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('#wire-right-col button');
      if(target&&!target.disabled)connect(target.dataset.color);
      drag=null;draw();if(box.hasPointerCapture(event.pointerId))box.releasePointerCapture(event.pointerId);
    };
    box.onpointercancel=()=>{drag=null;select(null);draw();};
    const resize=new ResizeObserver(draw);resize.observe(box);
    this.wireCleanup=()=>{resize.disconnect();box.onpointermove=box.onpointerup=box.onpointercancel=null;svg.replaceChildren();};
  }

  closeTask() {
    this.wireCleanup?.();this.wireCleanup=null;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    if (this.activeTaskStation) this.ui.onTaskClosedCallback?.();
    this.activeTaskStation = null;
    this.ui.modalTaskInteractive?.classList.add('hidden');
  }
}
