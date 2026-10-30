// Geometry is shared by collision, PNG export and minimap. Door openings are real gaps.
export function connectLayout(map, hw, hh) {
  const rectangles = [
    [0, -30, 680, 540], [-915, -60, 470, 780], [-735, 555, 430, 390],
    [0, -620, 600, 320], [940, -60, 480, 780], [0, 620, 560, 320],
    [720, -615, 400, 270], [725, 630, 450, 340]
  ];
  map.roomsList.forEach((room, i) => {
    const [x, y, w, h] = rectangles[i]; Object.assign(room, { x, y, w, h });
  });
  map.corridors = [
    [0, -380, 130, 200], [0, 350, 130, 260], [-510, 0, 380, 120], [520, 0, 400, 120],
    [-420, 275, 140, 670], [-500, 545, 200, 120],
    [430, -305, 140, 730], [490, -610, 200, 120],
    [420, 315, 140, 750], [490, 630, 200, 120]
  ].map(([x,y,w,h], i) => ({ id: `passage_${i}`, name: '', x,y,w,h }));
  map.walls = [];
  const edge = (x1,y1,x2,y2, doors = []) => {
    const horizontal = y1 === y2, start = horizontal ? x1 : y1, end = horizontal ? x2 : y2;
    const cuts = doors.filter(d => d.orientation === (horizontal ? 'h' : 'v') &&
      (horizontal ? d.y === y1 : d.x === x1)).map(d => {
        const center = horizontal ? d.x : d.y, size = horizontal ? d.w : d.h;
        return [Math.max(start, center - size / 2), Math.min(end, center + size / 2)];
      }).filter(([a,b]) => b > a).sort((a,b) => a[0]-b[0]);
    let cursor = start;
    const add = (a,b) => { if (b > a) map.walls.push({ p1: {x: horizontal?a:x1, y:horizontal?y1:a}, p2:{x:horizontal?b:x2,y:horizontal?y2:b} }); };
    for (const [a,b] of cuts) { add(cursor,a); cursor = Math.max(cursor,b); } add(cursor,end);
  };
  for (const r of map.roomsList) {
    const l=r.x-r.w/2, right=r.x+r.w/2, top=r.y-r.h/2, bottom=r.y+r.h/2;
    edge(l,top,right,top,map.doors); edge(l,bottom,right,bottom,map.doors);
    edge(l,top,l,bottom,map.doors); edge(right,top,right,bottom,map.doors);
  }
  edge(-hw,-hh,hw,-hh); edge(-hw,hh,hw,hh); edge(-hw,-hh,-hw,hh); edge(hw,-hh,hw,hh);
  return map;
}
