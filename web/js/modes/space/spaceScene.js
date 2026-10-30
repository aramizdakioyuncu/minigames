const names=['map-spaceship','map-castle','map-mansion','player-body','player-visor','body','vent','task-active','task-complete','generator','door-open','door-closed','door-locked','bed','crate','reactor_core'];
const assetPath=name=>`assets/space/${['bed','crate','reactor_core'].includes(name)?'':'png/'}${name}.png`;
export const spaceImages=new Map(names.map(name=>{const image=new Image();image.src=assetPath(name);return [name,image];}));
export const spaceArtReady=Promise.all([...spaceImages.values()].map(image=>image.decode()));
spaceArtReady.catch(error=>console.error('Space PNG load error:',error));

export class SpaceScene {
  constructor() {this.objects=new Map();this.tinted=new Map();}
  destroy() {this.container?.destroy({children:true});this.container=null;this.objects.clear();}
  objectsFor(state,myId,cache) {
    const s=state.modeState, me=state.players.find(p=>p.id===myId), own=s.playersMeta.find(p=>p.id===myId);
    const items=[{key:'map',asset:'map-'+s.mapTheme,x:0,y:0,w:s.width,h:s.height}];
    if(s.mapTheme==='spaceship') {
      items.push({key:'reactor-prop',asset:'reactor_core',x:-915,y:-60,w:136,h:136});
      for(const x of [-170,-75,170]) items.push({key:'bed-'+x,asset:'bed',x,y:-690,w:54,h:84});
      for(const x of [620,810])items.push({key:'crate-'+x,asset:'crate',x,y:730,w:64,h:54});
    }
    for(const door of s.doors) items.push({key:door.id,asset:'door-'+(door.isLocked?'locked':door.isOpen?'open':'closed'),x:door.x,y:door.y,w:door.orientation==='h'?door.w:door.h,h:28,rotation:door.orientation==='v'?Math.PI/2:0});
    for(const vent of s.vents) items.push({key:vent.id,asset:'vent',x:vent.x,y:vent.y,w:48,h:32,tint:own?.ventId===vent.id?'#fbbf24':null});
    for(const task of s.taskStations) {
      const completed=own?.completedTasksList?.includes(task.id);
      items.push({key:task.id,asset:completed?'task-complete':'task-active',x:task.x,y:task.y,w:38,h:38,alpha:s.gameState==='waiting'?0.45:1});
      if(me && Math.hypot(me.x-task.x,me.y-task.y)<100) items.push({key:task.id+'-label',text:task.name+(completed?' ✓':''),x:task.x,y:task.y+35,color:'#f8fafc'});
    }
    if(s.generator) items.push({key:'generator',asset:'generator',x:s.generator.x,y:s.generator.y,w:64,h:80});
    if(s.sabotage?.active&&s.sabotage.type==='reactor')for(const [index,panel] of (s.reactorPanels||[]).entries()){
      items.push({key:panel.id,asset:'task-active',x:panel.x,y:panel.y,w:54,h:54});
      items.push({key:panel.id+'-label',text:`PANEL ${index+1} • E basılı tut`,x:panel.x,y:panel.y+42,color:'#facc15'});
    }
    for(const body of s.bodies) items.push({key:body.id,asset:'body',x:body.x,y:body.y,w:46,h:46,tint:body.color});
    for(const p of state.players) {
      if(p.isSpectator||p.isVented) continue;
      const pos=cache.get(p.id)||p,alpha=p.isAlive?1:0.38;
      items.push({key:p.id,asset:'player-body',x:pos.x,y:pos.y,w:48,h:48,tint:p.color,alpha});
      items.push({key:p.id+'-visor',asset:'player-visor',x:pos.x,y:pos.y,w:48,h:48,alpha});
      items.push({key:p.id+'-name',text:p.name+(p.id===myId?' • SEN':''),x:pos.x,y:pos.y+34,color:p.id===myId?'#fde68a':'#f8fafc',alpha});
    }
    return items;
  }
  renderWebGL(renderer,state,myId) {
    if(!this.container) {
      this.container=new PIXI.Container();renderer.world.addChild(this.container);
      this.fog=new PIXI.Graphics();this.container.addChild(this.fog);
    }
    const seen=new Set();
    for(const item of this.objectsFor(state,myId,renderer.entities)) {
      seen.add(item.key);
      let object=this.objects.get(item.key);
      if(!object) {
        object=item.text?new PIXI.Text(item.text,{fontFamily:'Arial',fontSize:13,fontWeight:'bold',fill:item.color,stroke:'#07121e',strokeThickness:3}):new PIXI.Sprite();
        object.anchor.set(0.5);this.objects.set(item.key,object);
        this.container.addChildAt(object,this.container.children.length-1);
      }
      if(item.text){object.text=item.text;object.style.fill=item.color;}
      else {
        object.texture=PIXI.Texture.from(assetPath(item.asset));
        object.width=item.w;object.height=item.h;object.rotation=item.rotation||0;
        object.tint=item.tint?parseInt(item.tint.slice(1),16):0xffffff;
      }
      object.position.set(item.x,item.y);object.alpha=item.alpha??1;
    }
    for(const [key,object] of this.objects) if(!seen.has(key)){object.destroy();this.objects.delete(key);}
    this.fog.clear();
    const vision=state.modeState.vision;
    if(vision){
      this.fog.beginFill(0x02040a,0.96);this.fog.drawRect(-6000,-6000,12000,12000);
      this.fog.beginHole();this.fog.drawPolygon(vision.polygon);this.fog.endHole();this.fog.endFill();
    }
  }
  renderCanvas(renderer,ctx,state,myId) {
    for(const item of this.objectsFor(state,myId,renderer.entities)) {
      ctx.save();ctx.translate(item.x,item.y);ctx.rotate(item.rotation||0);ctx.globalAlpha=item.alpha??1;
      if(item.text){ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=3;ctx.strokeStyle='#07121e';ctx.strokeText(item.text,0,0);ctx.fillStyle=item.color;ctx.fillText(item.text,0,0);}
      else {
        let image=spaceImages.get(item.asset);
        if(image?.complete && image.naturalWidth){
          if(item.tint){
            const key=item.asset+item.tint;
            if(!this.tinted.has(key)){
              const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
              const c=canvas.getContext('2d');c.drawImage(image,0,0);c.globalCompositeOperation='multiply';c.fillStyle=item.tint;c.fillRect(0,0,canvas.width,canvas.height);c.globalCompositeOperation='destination-in';c.drawImage(image,0,0);
              if(this.tinted.size>64)this.tinted.clear();this.tinted.set(key,canvas);
            }
            image=this.tinted.get(key);
          }
          ctx.drawImage(image,-item.w/2,-item.h/2,item.w,item.h);
        }
      }
      ctx.restore();
    }
    const vision=state.modeState.vision;
    if(vision){
      ctx.save();ctx.fillStyle='rgba(2,4,10,0.96)';ctx.beginPath();ctx.rect(-6000,-6000,12000,12000);
      const p=vision.polygon;ctx.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i],p[i+1]);ctx.closePath();ctx.fill('evenodd');ctx.restore();
    }
  }
}
