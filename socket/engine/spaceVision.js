export function sightBarriers(mode) {
  return [...mode.walls, ...mode.doors.filter(d => !d.isOpen || d.isLocked).map(d => ({
    p1: { x:d.x-(d.orientation==='h'?d.w/2:0), y:d.y-(d.orientation==='v'?d.h/2:0) },
    p2: { x:d.x+(d.orientation==='h'?d.w/2:0), y:d.y+(d.orientation==='v'?d.h/2:0) }
  }))];
}
function rayDistance(origin, dx, dy, maximum, barriers) {
  let nearest = maximum;
  for (const {p1,p2} of barriers) {
    const sx=p2.x-p1.x, sy=p2.y-p1.y, denominator=dx*sy-dy*sx;
    if(Math.abs(denominator)<1e-8) continue;
    const ox=p1.x-origin.x, oy=p1.y-origin.y;
    const t=(ox*sy-oy*sx)/denominator, u=(ox*dy-oy*dx)/denominator;
    if(t>=0 && u>=0 && u<=1 && t<nearest) nearest=t;
  }
  return nearest;
}
export function hasSight(mode,a,b) {
  const distance=Math.hypot(b.x-a.x,b.y-a.y);
  return distance<0.001 || rayDistance(a,(b.x-a.x)/distance,(b.y-a.y)/distance,distance,sightBarriers(mode))>=distance-0.1;
}
export function createVision(mode,viewer) {
  if(mode.gameState!=='playing'||!viewer.isAlive||viewer.isSpectator) return null;
  const dark=mode.sabotage.active && mode.sabotage.type==='lights', impostor=viewer.role==='impostor';
  const radius=dark?(impostor?320:120):(impostor?380:300), origin=viewer.pos;
  const barriers=sightBarriers(mode), angles=Array.from({length:96},(_,i)=>i*Math.PI*2/96);
  for(const {p1,p2} of barriers) for(const point of [p1,p2]) {
    if(Math.hypot(point.x-origin.x,point.y-origin.y)>radius+1) continue;
    const a=Math.atan2(point.y-origin.y,point.x-origin.x);
    angles.push(...[a-0.0001,a,a+0.0001].map(value=>(value+Math.PI*2)%(Math.PI*2)));
  }
  angles.sort((a,b)=>a-b);
  const polygon=[];
  for(const angle of angles) {
    const dx=Math.cos(angle),dy=Math.sin(angle),distance=rayDistance(origin,dx,dy,radius,barriers);
    polygon.push(Math.round((origin.x+dx*distance)*10)/10,Math.round((origin.y+dy*distance)*10)/10);
  }
  return {x:origin.x,y:origin.y,radius,polygon};
}
