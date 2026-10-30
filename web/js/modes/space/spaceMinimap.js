import { spaceImages } from './spaceScene.js';

export class SpaceMinimapRenderer {
  renderMinimap(canvas,state,myId) {
    if(!canvas||!state)return;
    const s=state.modeState,c=canvas.getContext('2d'),scale=Math.min(canvas.width/s.width,canvas.height/s.height)*0.94;
    c.fillStyle='#020617';c.fillRect(0,0,canvas.width,canvas.height);
    c.save();c.translate(canvas.width/2,canvas.height/2);c.scale(scale,scale);
    const map=spaceImages.get('map-'+s.mapTheme);
    if(map?.complete&&map.naturalWidth)c.drawImage(map,-s.width/2,-s.height/2,s.width,s.height);
    const own=s.playersMeta.find(p=>p.id===myId);
    for(const station of s.taskStations) {
      const image=spaceImages.get(own?.completedTasksList?.includes(station.id)?'task-complete':'task-active');
      if(image?.complete&&image.naturalWidth)c.drawImage(image,station.x-35,station.y-35,70,70);
    }
    const ventImage=spaceImages.get('vent');
    for(const vent of s.vents) {
      c.strokeStyle='#fb7185';c.lineWidth=5;c.strokeRect(vent.x-37,vent.y-25,74,50);
      if(ventImage?.complete&&ventImage.naturalWidth)c.drawImage(ventImage,vent.x-35,vent.y-23,70,46);
    }
    const generator=spaceImages.get('generator');
    if(s.generator&&generator?.complete&&generator.naturalWidth)c.drawImage(generator,s.generator.x-35,s.generator.y-44,70,88);
    for(const door of s.doors) {
      c.fillStyle=door.isLocked?'#fb7185':door.isOpen?'#34d399':'#67d6f2';c.beginPath();c.arc(door.x,door.y,12,0,Math.PI*2);c.fill();
    }
    const me=state.players.find(p=>p.id===myId);
    if(me){c.fillStyle='#fff';c.strokeStyle='#38bdf8';c.lineWidth=8;c.beginPath();c.arc(me.x,me.y,22,0,Math.PI*2);c.fill();c.stroke();}
    c.restore();
    c.font='12px Arial';c.fillStyle='#e2e8f0';c.textAlign='center';
    c.fillText('Beyaz: Sen • Sarı: Görev • Yeşil: Tamamlandı • Kesik sarı yol: Jeneratör',canvas.width/2,canvas.height-8);
  }
}
