// Rasterize the game's code-native artwork from the same map geometry used by physics.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { mapRegistry } from '../socket/engine/modes/maps/mapRegistry.js';
const directory=new URL('../web/assets/space/png/',import.meta.url);
await mkdir(directory,{recursive:true});
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||(process.platform==='win32'?'msedge':'chromium'),headless:true});
try {
  const page=await browser.newPage();
  const maps=mapRegistry.getAvailableThemes().map(theme=>({theme,...mapRegistry.getMap(theme)}));
  const files=await page.evaluate(maps=>{
    const output={};
    function asset(name,w,h,paint) {
      const c=document.createElement('canvas'); c.width=w;c.height=h;
      const ctx=c.getContext('2d');paint(ctx,w,h);output[name]=c.toDataURL('image/png').split(',')[1];
    }
    function rect(c,x,y,w,h,color,r=0) {c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
    for(const map of maps) asset('map-'+map.theme,2800,1800,c=>{
      const palette=map.theme==='castle'?['#171510','#302e27','#d0ac64']:map.theme==='mansion'?['#160f18','#342631','#e69eb6']:['#08121f','#1d3448','#67ccec'];
      c.translate(1400,900);rect(c,-1400,-900,2800,1800,palette[0]);
      c.save();c.beginPath();
      for(const r of [...map.corridors,...map.roomsList]) c.rect(r.x-r.w/2,r.y-r.h/2,r.w,r.h);
      c.clip();rect(c,-1400,-900,2800,1800,palette[1]);
      c.strokeStyle='#ffffff0b';c.lineWidth=1;
      for(let x=-1400;x<1400;x+=40){c.beginPath();c.moveTo(x,-900);c.lineTo(x,900);c.stroke();}
      for(let y=-900;y<900;y+=40){c.beginPath();c.moveTo(-1400,y);c.lineTo(1400,y);c.stroke();}
      c.restore();
      // A continuous marked route from the cafeteria west exit to the generator doorway.
      c.strokeStyle='#fbbf2466';c.lineWidth=3;c.setLineDash([14,18]);c.beginPath();
      c.moveTo(-300,0);c.lineTo(-420,0);c.lineTo(-420,545);c.lineTo(-620,545);c.stroke();c.setLineDash([]);
      for(const wall of map.walls){
        c.lineCap='round';c.lineWidth=13;c.strokeStyle='#020617';c.beginPath();c.moveTo(wall.p1.x,wall.p1.y);c.lineTo(wall.p2.x,wall.p2.y);c.stroke();
        c.lineWidth=5;c.strokeStyle=palette[2];c.stroke();
      }
      c.textAlign='center';c.textBaseline='top';c.font='bold 22px sans-serif';c.fillStyle='#e2e8f0';
      for(const room of map.roomsList) {
        const label=room.name.replace(/\s*\([^)]*\)/g,'');
        c.fillText(label,room.x,room.y-room.h/2+28,room.w-48);
      }
      // Central meeting table; this is decoration, never an invisible collision barrier.
      rect(c,-78,-58,156,116,'#0b1625',24);rect(c,-66,-46,132,92,'#475569',18);
      c.fillStyle='#ef4444';c.beginPath();c.arc(0,0,22,0,Math.PI*2);c.fill();
      c.fillStyle='#fff';c.font='bold 22px sans-serif';c.fillText('!',0,-13);
    });
    asset('player-body',96,96,c=>{
      c.fillStyle='#02061766';c.beginPath();c.ellipse(48,77,33,12,0,0,Math.PI*2);c.fill();
      rect(c,12,30,20,41,'#94a3b8',9);rect(c,28,10,53,71,'#f8fafc',24);
      rect(c,30,65,20,23,'#cbd5e1',8);rect(c,60,65,19,23,'#cbd5e1',8);
    });
    asset('player-visor',96,96,c=>{rect(c,37,25,49,32,'#071a2e',12);rect(c,41,28,41,24,'#67d6f2',9);rect(c,48,31,23,5,'#e0faff',2);});
    asset('body',96,96,c=>{rect(c,14,42,68,35,'#e2e8f0',16);rect(c,42,17,14,36,'#fff',5);for(const x of [41,56]){c.fillStyle='#fff';c.beginPath();c.arc(x,18,10,0,Math.PI*2);c.fill();}});
    asset('vent',96,64,c=>{rect(c,3,3,90,58,'#0a101e',12);rect(c,8,8,80,48,'#52667e',8);for(let y=16;y<52;y+=9)rect(c,18,y,60,4,'#111827',2);});
    for(const complete of [false,true]) asset(complete?'task-complete':'task-active',96,96,c=>{
      rect(c,10,7,76,82,'#0b1625',12);rect(c,16,13,64,47,complete?'#34d399':'#fbbf24',6);
      c.fillStyle='#082f49';c.font='bold 36px sans-serif';c.textAlign='center';c.fillText(complete?'✓':'!',48,50);
      for(let i=0;i<3;i++)rect(c,23+i*19,71,11,6,'#94a3b8',2);
    });
    asset('generator',128,160,c=>{
      rect(c,8,5,112,150,'#07121e',12);rect(c,15,12,98,136,'#3e5268',8);
      rect(c,25,23,78,48,'#061b29',5);c.strokeStyle='#fbbf24';c.lineWidth=7;c.beginPath();c.moveTo(72,28);c.lineTo(53,47);c.lineTo(73,47);c.lineTo(56,65);c.stroke();
      for(let y=87;y<135;y+=13)rect(c,28,y,55,5,'#172c40',2);
      rect(c,92,89,9,27,'#34d399',3);
    });
    for(const state of ['closed','locked','open']) asset('door-'+state,140,32,c=>{
      rect(c,0,0,140,32,'#07121e',4);
      if(state==='open'){c.clearRect(8,0,124,32);rect(c,0,0,8,32,'#34d399');rect(c,132,0,8,32,'#34d399');}
      else{rect(c,5,4,130,24,'#53647a',3);rect(c,8,6,124,3,state==='locked'?'#fb7185':'#67d6f2');rect(c,68,4,4,24,'#172538');}
    });
    return output;
  },maps);
  for(const [name,data] of Object.entries(files)) await writeFile(new URL(name+'.png',directory),Buffer.from(data,'base64'));
  console.log(`Exported ${Object.keys(files).length} PNG assets to web/assets/space/png`);
} finally {await browser.close();}
