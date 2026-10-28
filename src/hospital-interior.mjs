import {FLOORS, FLOOR_HEIGHT} from './hospital-plan.mjs';

export function buildInterior({add, mat, texture}) {
  const colors = {wall:'#e7ece7', trim:'#8db9b1', wood:'#bc9b78', bed:'#e8f0ef', sheet:'#8fbcc4', metal:'#9caeb5', screen:'#244e61', blue:'#749eaf', peach:'#d5ae99', green:'#82a88e'};
  const m = Object.fromEntries(Object.entries(colors).map(([key,color]) => [key,mat({color, roughness:key==='metal'?.4:.78})]));
  const signs=new Map();
  function sign(text) {
    if(!texture) return m.screen;
    if(!signs.has(text)) signs.set(text,mat({map:texture((c,w,h)=>{c.fillStyle='#edf4ef';c.fillRect(0,0,w,h);c.fillStyle='#315e67';c.font="700 54px 'Noto Sans KR',sans-serif";c.textAlign='center';c.textBaseline='middle';c.fillText(text,w/2,h/2);},768,128),roughness:.8}));
    return signs.get(text);
  }
  for (const {index:f, name, type} of FLOORS) {
    const base = f * FLOOR_HEIGHT + .17;
    const box = (s, p, material, kind='furniture') => add(s,[p[0],base+p[1],p[2]],material,f,0,{kind});
    const partition = (s,p) => box(s,p,m.wall,'partition');
    // Four rooms share a central corridor. Gaps in the corridor wall are doors.
    for (const x of [-5,0,5]) partition([.12,1.75,3.8],[x,.9,3.1]);
    for (const x of [-7.5,-2.5,2.5,7.5]) {
      partition([3.5,1.75,.12],[x-.65,.9,1.2]);
      box([3.5,.16,.15],[x-.65,1.48,1.2],m.trim,'partition');
    }
    partition([.12,1.85,3.4],[6.8,.95,-3.8]);
    // Stair flights, landings and paired lift doors make the circulation readable.
    for (let i=0;i<8;i++) box([1.15,.18,.32],[8.2,.12+i*.25,-5.4+i*.3],m.metal,'stairs');
    box([2.6,.13,1.1],[8.2,1.99,-2.7],m.wall,'stairs');
    for (const x of [4.5,5.45]) box([.86,1.8,.14],[x,.9,-5.68],m.metal);
    box([.3,.3,.06],[3.85,1.3,-5.55],m.screen);
    // Nurse station, with two monitors, files and a short return counter.
    box([3.9,.85,.85],[-.7,.43,-2.5],m.wood);
    box([4.05,.12,1],[-.7,.91,-2.5],m.bed);
    box([.85,.85,1.7],[-2.25,.43,-3.6],m.wood);
    for (const x of [-1.5,.15]) {
      box([.65,.43,.09],[x,1.23,-2.5],m.screen);
      box([.08,.2,.08],[x,.98,-2.5],m.metal);
      box([.7,.6,.55],[x,.32,-3.8],m.blue);
    }
    for (const x of [-4.4,-3.6]) box([.65,1.3,.6],[x,.65,-5.3],m.bed);
    box([4.3,.46,.06],[-.7,1.73,-5.55],sign(type==='lobby'?'원무 · 접수':'간호 스테이션'));
    box([4,.36,.06],[-7.4,1.92,1.29],sign(`${f+1}F  ${name.split(' · ')[0]}`));

    function bed(x,z,medical=false) {
      box([1.35,.17,2.35],[x,.42,z],m.metal);
      box([1.3,.23,2.3],[x,.61,z],m.bed);
      box([1.31,.1,1.48],[x,.77,z-.22],medical?m.green:m.sheet);
      box([.88,.18,.4],[x,.83,z+.78],m.bed);
      box([1.36,.65,.12],[x,.65,z+1.17],m.blue);
      for (const dx of [-.52,.52]) for(const dz of [-.9,.9]) box([.12,.35,.12],[x+dx,.19,z+dz],m.metal);
      box([.52,.64,.56],[x+.98,.34,z+.6],m.wood);
      box([.055,1.55,.055],[x-.88,.78,z+.7],m.metal);
      box([.22,.38,.13],[x-.88,1.35,z+.7],m.bed);
    }
    function chair(x,z) {
      box([.62,.16,.66],[x,.44,z],m.blue);
      box([.62,.65,.12],[x,.78,z-.29],m.blue);
      box([.42,.36,.42],[x,.2,z],m.metal);
    }
    for (const x of [-7.5,-2.5,2.5,7.5]) {
      if (['ward','icu','surgery'].includes(type)) {
        bed(x-.95,3.65,type!=='ward');
        if(type==='ward') bed(x+1,3.65);
        else {box([.65,1,.55],[x+1,.55,4.5],m.bed);box([.62,.5,.08],[x+1,1.25,4.2],m.screen);}
      } else if (type==='clinic') {
        bed(x-1,3.65);box([1.6,.85,.8],[x+1,.44,2.5],m.wood);chair(x+1,3.4);
        box([.65,.5,.08],[x+1,1.14,2.65],m.screen);
      } else if (type==='imaging') {
        box([1.4,.6,2.2],[x,.5,2.9],m.bed);
        for(const dx of [-1,1]) box([.45,1.7,1.15],[x+dx,.9,4.6],m.bed);
        box([2.4,.4,1.15],[x,1.75,4.6],m.bed);
        box([.35,.4,.09],[x-.99,1.25,3.98],m.screen);
      } else if(type==='rehab') {
        box([1.6,.16,2.7],[x,.18,3.4],m.green);
        for(const dx of [-.8,.8]) {box([.07,.85,2.5],[x+dx,.55,3.4],m.metal);}
        box([1.5,.12,1.1],[x,.7,4.7],m.sheet);
      } else {
        for(const dx of [-.95,.95]) for(const z of [2.45,4.65]) chair(x+dx,z);
        box([1.8,.14,1],[x,.6,3.55],m.wood);
      }
    }
    if(type==='lobby') {
      for(const x of [-7.8,-6.7]) for(const y of [.45,1,1.55]) box([.9,.12,.6],[x,y,-4.9],m.bed);
      box([2.3,.9,.9],[-7.2,.45,-3.4],m.peach);
    }
  }
}
