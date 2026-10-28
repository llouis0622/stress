import * as T from './vendor/three.module.js';
import {FLOOR_COUNT, FLOOR_HEIGHT} from './hospital-plan.mjs';

// Facade control points were measured against the full exterior photograph
// published in the hospital's official floor guide. Geometry uses photo ratios;
// dimensions are estimates, not survey measurements.
export async function buildHospital({add,mat,texture,materials,textureResources,renderer}) {
  const photo=await new T.TextureLoader().loadAsync(new URL('reference/minam-facade.webp',document.baseURI).href);
  photo.colorSpace=T.SRGBColorSpace;photo.anisotropy=renderer.capabilities.getMaxAnisotropy();textureResources.push(photo);
  const {white,glass,darkGlass,metal,inner,gray,roof}=materials;
  const floorH=FLOOR_HEIGHT, podium=13.2, top=42.9;
  const sideStone=mat({color:'#a3adb1',roughness:.88});
  // Map a unit-square face onto a perspective quadrilateral in the source photo.
  function homography(corners){
    const src=[[0,1],[1,1],[1,0],[0,0]],A=[];
    for(let i=0;i<4;i++){const [u,v]=src[i],x=corners[i][0]/1310,y=1-corners[i][1]/1790;A.push([u,v,1,0,0,0,-x*u,-x*v,x],[0,0,0,u,v,1,-y*u,-y*v,y]);}
    for(let i=0;i<8;i++){let pivot=i;for(let j=i+1;j<8;j++)if(Math.abs(A[j][i])>Math.abs(A[pivot][i]))pivot=j;[A[i],A[pivot]]=[A[pivot],A[i]];const d=A[i][i];for(let k=i;k<=8;k++)A[i][k]/=d;for(let j=0;j<8;j++)if(j!==i){const f=A[j][i];for(let k=i;k<=8;k++)A[j][k]-=f*A[i][k];}}
    const h=A.map(row=>row[8]);return new T.Matrix3().set(h[0],h[1],h[2],h[3],h[4],h[5],h[6],h[7],1);
  }
  function photographic(corners,axis,range,roughness=.82){
    // The image already contains light and reflections. A high emissive mix
    // preserves their measured contrast instead of bleaching them with the sun.
    const m=mat({map:photo,color:'#c6c4bd',roughness,metalness:0,emissive:'#ffffff',emissiveIntensity:.32});
    m.userData.photo={axis,range,matrix:homography(corners)};
    m.onBeforeCompile=shader=>{
      shader.uniforms.photoHomography={value:m.userData.photo.matrix};
      shader.vertexShader='attribute vec4 photoRect; varying vec2 vPhotoCoord;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n vPhotoCoord = photoRect.xy + (position.${axis==='x'?'xy':'zy'} + 0.5) * photoRect.zw;`);
      shader.fragmentShader='uniform mat3 photoHomography; varying vec2 vPhotoCoord;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 projectedPhoto=photoHomography*vec3(vPhotoCoord,1.0); vec4 photoTexel=texture2D(map,projectedPhoto.xy/projectedPhoto.z); diffuseColor*=photoTexel; totalEmissiveRadiance*=photoTexel.rgb;`);
    };
    m.customProgramCacheKey=()=>`photo-${axis}`;return m;
  }
  const streetPhoto=photographic([[291,276],[605,85],[605,1035],[276,1110]],'z',[-6,6,podium,top],.43);
  const namePhoto=photographic([[607,110],[732,358],[731,1160],[605,1035]],'x',[-10,-3.2,podium,top]);
  const middlePhoto=photographic([[766,385],[877,625],[878,1325],[756,1188]],'x',[-2,6,podium,44.0]);
  const endPhoto=photographic([[880,678],[933,752],[934,1405],[878,1325]],'x',[6,10,podium,42.7]);
  const latticeStreet=photographic([[221,1149],[604,1063],[604,1478],[216,1500]],'z',[-6,6,4.2,podium],.65);
  const latticeSide=photographic([[605,1063],[756,1189],[756,1460],[605,1478]],'x',[-10,-2,4.2,podium],.65);
  function face(axis,start,end,base,height,constant,material,columns,rows){const dw=(end-start)/columns,dh=(height-base)/rows;for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){const a=start+(c+.5)*dw,y=base+(r+.5)*dh;add(axis==='x'?[dw-.003,dh-.003,.18]:[.18,dh-.003,dw-.003],axis==='x'?[a,y,constant]:[constant,y,a],material,Math.floor(y/floorH));}}
  face('z',-6,6,podium,top,-10,streetPhoto,14,22);
  face('x',-10,-3.2,podium,top,6.0,namePhoto,7,22);
  face('x',-3.2,-2,podium,top,5.89,darkGlass,1,22);
  for(let r=0;r<22;r++)add([1.2,.045,.13],[-2.6,podium+r*1.35,6.0],metal,Math.floor((podium+r*1.35)/floorH));
  face('x',-2,6,podium,44.0,5.62,middlePhoto,8,23);
  face('x',6,10,podium,42.7,5.28,endPhoto,4,22);
  face('z',-6,6,4.2,podium,-10.35,latticeStreet,14,9);
  face('x',-10,-2,4.2,podium,6.35,latticeSide,8,9);
  // Low white border around the lattice podium.
  for(let z=-5.5;z<=5.5;z++)for(const y of [4.05,13.4])add([.45,.42,.99],[-10.2,y,z],white,Math.floor(y/floorH));
  for(let x=-9.5;x<-2;x++)for(const y of [4.05,13.4])add([.99,.42,.45],[x,y,6.2],white,Math.floor(y/floorH));
  // The two narrow side slits are much thinner than the central glazing seam.
  for(let row=0;row<11;row++){const y=1.65+row*3.3;for(const x of [.1,6.6]){add([.22,3.27,.13],[x,y,5.71],darkGlass,row);add([.24,.035,.15],[x,y,5.8],metal,row);}}
  face('x',-2,0,0,podium,5.62,sideStone,2,10);
  face('x',.24,6.48,0,podium,5.62,sideStone,6,10);
  face('x',6.74,10,0,podium,5.28,sideStone,4,10);
  // Thin physical fins follow the actual 14 vertical bays. Their photographs
  // remain visible underneath and rotate with detached facade fragments.
  for(let z=-6;z<=6;z+=12/14)for(let r=0;r<15;r++)add([.24,1.98,.055],[-10.13,14.1+r*1.98,z],white,Math.floor((14.1+r*1.98)/floorH));
  // Photo-unseen rear wall and rear return: conservative matching stone/glass.
  for(let side of ['back','right'])for(let r=0;r<26;r++)for(let c=0;c<(side==='back'?20:12);c++){
    const y=.825+r*1.65,a=(side==='back'?-9.5:-5.5)+c;
    const window=r>2&&r<23&&c%3===1;
    add(side==='back'?[.995,1.64,.22]:[.22,1.64,.995],side==='back'?[a,y,-6]:[10,y,a],window?glass:white,Math.floor(y/floorH));
  }
  // Recessed rear wing visible on the left of the official street photograph.
  for(let r=0;r<19;r++)for(let c=0;c<4;c++)add([.2,1.64,.995],[-8.65,1.65*r+.825,-6.5-c],white,Math.floor(r/2));
  for(let r=0;r<19;r++)for(let c=0;c<18;c++)add([.995,1.64,.2],[-8.1+c,1.65*r+.825,-10],r%2&&c%4===1?glass:white,Math.floor(r/2));
  // Eighteen playable floors inside the original exterior proportions.
  for(let f=0;f<=FLOOR_COUNT;f++)for(let ix=0;ix<8;ix++)for(let iz=0;iz<5;iz++)
    add([2.49,.17,2.39],[-8.75+ix*2.5,.08+f*floorH,-4.8+iz*2.4],f===FLOOR_COUNT?roof:inner,f,0,{kind:'slab'});
  for(let f=0;f<FLOOR_COUNT;f++)for(let x of [-8,0,8])for(let z of [-4.4,4.4])
    add([.38,floorH-.17,.38],[x,.165+(floorH-.17)/2+f*floorH,z],inner,f,0,{kind:'column'});
  // Capped parapets track the three staggered wall planes.
  for(let x=-9.5;x<10;x++){const y=x< -2?43:x<6?44.1:42.8;add([.997,.12,.38],[x,y,x<-2?6:x<6?5.62:5.28],white,13);}
  for(let z=-5.5;z<6;z++)add([.25,.15,.995],[-10,43.0,z],white,13);
  for(let z=-5.5;z<6;z++)add([.25,.75,.995],[10,43.3,z],white,13);
  for(let x=-9;x<10;x+=2)add([1.99,.75,.24],[x,43.3,-6],white,13);
  for(let x of [-4,0,4]){add([2.1,.7,2.4],[x,43.45,-2.5],gray,13);add([1.6,.08,1.9],[x,43.84,-2.5],metal,13);}
  for(let z=-4.5;z<4;z+=1.1)add([.6,.65,.95],[-8.4,43.3,z],roof,13);
  const sign=(text,width=1024,height=160)=>mat({map:texture((c,w,h)=>{c.fillStyle='#eef0ea';c.fillRect(0,0,w,h);c.font=`800 ${height*.71}px 'Noto Sans KR',sans-serif`;c.fillStyle='#243775';c.textAlign='center';c.textBaseline='middle';c.fillText(text,w/2,h*.52);},width,height),roughness:.65});
  // Entrance is on the street (glazed) face, not centered on the long side wall.
  for(let z=-5.5;z<6;z++)add([.18,3.65,.99],[-10.25,1.95,z],z< -3||z>3?white:darkGlass,0);
  for(let z=-3;z<=3;z+=1.5)add([.22,3.55,.045],[-10.4,1.95,z],metal,0);
  add([5.7,.65,.1],[-10.5,3.8,0.8],sign('부산미남병원'),1,-Math.PI/2);
  for(let z=-3;z<4;z+=1.5)add([1.25,.12,1.49],[-10.85,3.25,z],metal,0);
  return {height:44.2,photoBased:true};
}
