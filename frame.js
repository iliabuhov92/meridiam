(() => {
'use strict';
const root=document.getElementById('experience'), planet=document.getElementById('planet'), trigger=document.getElementById('planet-trigger'), explore=document.getElementById('explore'), arrival=document.getElementById('arrival'), hint=document.getElementById('hint');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse=()=>matchMedia('(hover: none)').matches;
let active=false, zoomStart=null, zoomed=false, loadFailed=false;
function reveal(value){active=value;planet.classList.toggle('active',value);trigger.setAttribute('aria-expanded',String(value));hint.style.opacity=value?'0':'1';}
function revealAtPointer(event) {
 if (event.pointerType !== 'mouse' || zoomed) return;
 const bounds = planet.getBoundingClientRect();
 const x = (event.clientX - bounds.left) / bounds.width - .5;
 const y = (event.clientY - bounds.top) / bounds.height - .5;
 reveal(x * x + y * y < .48 * .48);
}
planet.addEventListener('pointerenter', revealAtPointer);
planet.addEventListener('pointermove', revealAtPointer);
planet.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!zoomed)reveal(false)});
trigger.addEventListener('click',()=>reveal(coarse()?!active:true));
trigger.addEventListener('focus',()=>{if(!coarse())reveal(true)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!zoomed){trigger.focus();reveal(false);}});
document.addEventListener('pointerdown',e=>{if(!planet.contains(e.target))reveal(false);});
explore.addEventListener('click', e => { e.stopPropagation(); reveal(true); });
document.getElementById('return').addEventListener('click',()=>{arrival.hidden=true;zoomStart=null;zoomed=false;root.classList.remove('zooming');reveal(false);trigger.focus();});
// A separate star canvas keeps distant stars sharp on mobile without large GPU buffers.
const starCanvas=document.getElementById('stars'),ctx=starCanvas.getContext('2d');
let starData=[],W=0,H=0,ratio=1;
function rand(seed){let n=seed;return()=>{n=(n*16807)%2147483647;return(n-1)/2147483646;};}
function resizeStars(){W=root.clientWidth;H=root.clientHeight;ratio=Math.min(devicePixelRatio||1,2);starCanvas.width=W*ratio;starCanvas.height=H*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);const random=rand(9731);starData=Array.from({length:Math.round(W*H/18000)},()=>({x:random()*W,y:random()*H,r:random()>.985?1.3:random()*.65+.15,a:random()*.3+.08,phase:random()*Math.PI*2}));}
function paintStars(t){ctx.clearRect(0,0,W,H);for(const s of starData){const alpha=s.a*(.7+.3*Math.sin(t*.35+s.phase));ctx.fillStyle=`rgba(175,215,255,${alpha})`;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();if(s.r>1){ctx.strokeStyle=`rgba(108,187,255,${alpha*.4})`;ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(s.x-5,s.y);ctx.lineTo(s.x+5,s.y);ctx.moveTo(s.x,s.y-5);ctx.lineTo(s.x,s.y+5);ctx.stroke();}}}
resizeStars();
let renderer;
try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch(e){document.getElementById('loading').textContent='Для объёмной сцены включи WebGL в браузере';return;}
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0x000000,0);document.getElementById('scene').appendChild(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.01,100);camera.position.z=3.8;
const group=new THREE.Group();scene.add(group);
const geometry=new THREE.SphereGeometry(1,128,96),loader=new THREE.TextureLoader();
const manager=new THREE.LoadingManager();manager.onLoad=()=>{root.classList.add('ready');if(loadFailed){const l=document.getElementById('loading');l.textContent='Не удалось загрузить поверхность Земли. Обнови страницу.';l.style.opacity='1';}};
const texLoader=new THREE.TextureLoader(manager);
function texture(url){return texLoader.load(url,undefined,undefined,()=>{loadFailed=true;});}
const day=texture('earth-day.jpg'),night=texture('earth-night.png'),clouds=texture('earth-clouds.jpg');
const cloudShadowOffset={value:0},auroraCloudOffset={value:0};
const earthMat=new THREE.ShaderMaterial({uniforms:{cloudOffset:cloudShadowOffset,dayMap:{value:day},nightMap:{value:night},cloudMap:{value:clouds},lightDirection:{value:new THREE.Vector3(-.75,.62,-.48).normalize()}},vertexShader:`varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.0);vPosition=p.xyz;gl_Position=projectionMatrix*p;}`,fragmentShader:`uniform float cloudOffset;uniform sampler2D dayMap;uniform sampler2D nightMap;uniform sampler2D cloudMap;uniform vec3 lightDirection;varying vec2 vUv;varying vec3 vNormal;varying vec3 vPosition;
void main(){vec3 n=normalize(vNormal),eye=normalize(-vPosition);float mu=dot(n,lightDirection);float sun=smoothstep(-.06,.22,mu);vec3 d=texture2D(dayMap,vUv).rgb;vec3 city=texture2D(nightMap,vUv).rgb;float c=texture2D(cloudMap,vec2(fract(vUv.x+cloudOffset+.002),vUv.y-.002)).r;
vec3 base=d*(vec3(.025,.045,.075)+sun*vec3(.85,.84,.78));base*=1.-.26*c*sun;
float lights=max(0.,(city.r+city.g)*.5-city.b*.65-.035);base+=vec3(1.,.66,.30)*pow(lights,.9)*3.2*(1.-sun)*(.95-.5*c);
float edge=pow(1.-max(dot(n,eye),0.),7.);float litRim=smoothstep(-.5,.4,mu);base+=vec3(.06,.10,.14)*edge*litRim*.045;
base*=mix(.48,1.,smoothstep(0.,.18,max(dot(n,eye),0.)));
gl_FragColor=vec4(base,1.);}
`});
const earth=new THREE.Mesh(geometry,earthMat);earth.rotation.y=4.38;earth.rotation.x=.16;earth.rotation.z=-.08;group.add(earth);
const cloudLayer=new THREE.Mesh(new THREE.SphereGeometry(1.006,128,96),new THREE.ShaderMaterial({uniforms:{cloudMap:{value:clouds},lightDirection:{value:new THREE.Vector3(-.75,.62,-.48).normalize()}},transparent:true,depthWrite:false,vertexShader:earthMat.vertexShader,fragmentShader:`uniform sampler2D cloudMap;uniform vec3 lightDirection;varying vec2 vUv;varying vec3 vNormal;varying vec3 vPosition;void main(){float c=texture2D(cloudMap,vUv).r;float sun=smoothstep(-.12,.35,dot(normalize(vNormal),lightDirection));vec3 col=mix(vec3(.17,.25,.35),vec3(.92,.96,1.),sun);float limb=smoothstep(0.,.2,max(dot(normalize(vNormal),normalize(-vPosition)),0.));col*=mix(.4,1.,limb);gl_FragColor=vec4(col,smoothstep(.12,.85,c)*.88);}`}));cloudLayer.rotation.copy(earth.rotation);group.add(cloudLayer);
const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.002,128,96),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.BackSide,vertexShader:`varying vec3 vNormal;varying vec3 vEye;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vEye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 vNormal;varying vec3 vEye;void main(){vec3 n=normalize(vNormal);float rim=pow(max(0.,1.-abs(dot(n,normalize(vEye)))),8.);float sun=smoothstep(-.45,.5,dot(n,normalize(vec3(-.75,.62,-.48))));gl_FragColor=vec4(.12,.18,.24,rim*(.002+.055*sun));}`}));group.add(atmosphere);
// Fixed light bloom at the upper left limb, independent of rotating geography.
const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;const gc=glowCanvas.getContext('2d'),gradient=gc.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,255,240,1)');gradient.addColorStop(.06,'rgba(255,215,150,0.95)');gradient.addColorStop(.23,'rgba(255,166,70,0.2)');gradient.addColorStop(1,'rgba(255,120,40,0)');gc.fillStyle=gradient;gc.fillRect(0,0,128,128);const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));glow.position.set(-.73,.63,.45);glow.scale.set(.65,.65,1);glow.visible=false;group.add(glow);
// Aurora sheets are projected onto spherical shells, not placed over the viewport.
const mPath=document.getElementById('m-path'),pathLength=mPath.getTotalLength();
const invEarth=earth.quaternion.clone().conjugate();
const auroraVertex=`varying vec2 vUv;varying vec2 vCloud;void main(){vUv=uv;vCloud=uv2;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const auroraFragment=`uniform sampler2D cloudMap;uniform float strength;uniform float cloudOffset;varying vec2 vUv;varying vec2 vCloud;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
 float u=vUv.x,v=vUv.y;
 float flow=noise(vec2(u*32.,v*3.));
 float q=v+.055*sin(u*47.+v*4.)+.025*sin(u*117.+v*9.)+.14*(flow-.5);
 float envelope=pow(max(0.,sin(v*3.14159)),1.9);
 float haze=noise(vec2(u*71.,q*9.));
 float silk=pow(.5+.5*sin(q*48.+noise(vec2(u*63.,v*7.))*6.),5.);
 float fine=pow(.5+.5*sin(q*93.+noise(vec2(u*108.,v*9.))*5.),18.);
 float ends=smoothstep(0.,.055,u)*smoothstep(0.,.055,1.-u);
 float cloud=texture2D(cloudMap,vec2(fract(vCloud.x+cloudOffset),vCloud.y)).r;
 float a=envelope*(.04+.18*silk*(.5+.5*haze)+.045*fine+.075*haze)*ends*strength*(1.-.4*smoothstep(.25,.85,cloud));
 vec3 col=mix(vec3(.32,.37,.53),vec3(.46,.66,.79),smoothstep(.15,.8,flow));
 gl_FragColor=vec4(col,a);
}`;
for(let layer=0;layer<3;layer++){
 const positions=[],uvs=[],cloudUvs=[],indices=[];const N=900,K=36;const radius=1.013+layer*.009;
 for(let i=0;i<=N;i++){
  const t=i/N,at=t*pathLength,p=mPath.getPointAtLength(at),a=mPath.getPointAtLength(Math.max(0,at-1)),b=mPath.getPointAtLength(Math.min(pathLength,at+1));
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
  const cornerDistance=Math.min(Math.hypot(p.x-235.556,p.y-133.333),Math.hypot(p.x-509.333,p.y-456),Math.hypot(p.x-782.222,p.y-133.333));
  const taper=Math.min(1,cornerDistance/110);
  const width=(9+53*taper)*(1+.12*Math.sin(t*51+layer)+.07*Math.sin(t*113));
  for(let j=0;j<=K;j++){
   const v=j/K,offset=(v-.5)*width*2+layer*5;
   const x=((p.x-dy/len*offset)/1000-.5)*2/.965,y=(.5-(p.y+dx/len*offset)/1000)*2/.965;
   const origin=new THREE.Vector3(0,0,3.8),dir=new THREE.Vector3(x,y,-3.8).normalize();
   const point=new THREE.Ray(origin,dir).intersectSphere(new THREE.Sphere(new THREE.Vector3(),radius),new THREE.Vector3());
   const pos=point||new THREE.Vector3(x,y,0).normalize().multiplyScalar(radius);
   positions.push(pos.x,pos.y,pos.z);uvs.push(t,v);
   const local=pos.clone().normalize().applyQuaternion(invEarth);let phi=Math.atan2(local.z,-local.x);if(phi<0)phi+=Math.PI*2;
   cloudUvs.push(phi/(2*Math.PI),1-Math.acos(Math.max(-1,Math.min(1,local.y)))/Math.PI);
   if(i<N&&j<K){const n=i*(K+1)+j;indices.push(n,n+K+1,n+1,n+1,n+K+1,n+K+2);}
  }
 }
 const meshGeo=new THREE.BufferGeometry();meshGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));meshGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));meshGeo.setAttribute('uv2',new THREE.Float32BufferAttribute(cloudUvs,2));meshGeo.setIndex(indices);
 const mat=new THREE.ShaderMaterial({uniforms:{cloudOffset:auroraCloudOffset,cloudMap:{value:clouds},strength:{value:layer===0?1.65:1.15}},vertexShader:auroraVertex,fragmentShader:auroraFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
 const sheet=new THREE.Mesh(meshGeo,mat);sheet.renderOrder=5+layer;group.add(sheet);
}
document.querySelector('.monogram').style.visibility='hidden';
// The smoked glass CTA replaces the former storm effect.

let baseZ=3.8;
function resize() {
 resizeStars();
 renderer.setSize(W, H);
 camera.aspect = W / H;
 // Both rectangles use viewport coordinates. Their difference stays local
 // to the scene when the document is scrolled or pinch-zoomed.
 const sceneRect = root.getBoundingClientRect();
 const planetRect = planet.getBoundingClientRect();
 const diameter = planetRect.width * .965;
 const viewHeight = H / diameter;
 camera.fov = 2 * Math.atan(viewHeight / 3.8) * 180 / Math.PI;
 camera.updateProjectionMatrix();
 const unitsPerPixel = 2 * viewHeight / H;
 group.position.x = (planetRect.left - sceneRect.left + planetRect.width / 2 - W / 2) * unitsPerPixel;
 group.position.y = (H / 2 - (planetRect.top - sceneRect.top + planetRect.height / 2)) * unitsPerPixel;
}
resize();
window.addEventListener('resize', resize);
const layoutObserver = new ResizeObserver(resize);
layoutObserver.observe(root);
layoutObserver.observe(planet);
document.getElementById('scene').addEventListener('webglcontextlost',()=>{document.getElementById('loading').textContent='Сцена приостановлена. Обнови страницу.';});
// Advance only while visible and loaded, preserving the approved opening pose.
let elapsed=0,previous=null,last=0;
document.addEventListener('visibilitychange',()=>{previous=null;});
function frame(now){
 requestAnimationFrame(frame);
 if(document.hidden){previous=null;return;}
 const dt=previous===null?0:Math.min((now-previous)/1000,.1);previous=now;
 if(!reduced&&root.classList.contains('ready')&&!loadFailed)elapsed+=dt;
 const earthAngle=elapsed*Math.PI*2/90,cloudAngle=elapsed*Math.PI*2/120;
 earth.rotation.y=4.38+earthAngle;
 cloudLayer.rotation.y=4.38+cloudAngle;
 cloudShadowOffset.value=(earthAngle-cloudAngle)/(2*Math.PI);
 auroraCloudOffset.value=-cloudAngle/(2*Math.PI);
 if(now-last>40){paintStars(reduced?0:elapsed);last=now;}
 let amount=0;
 if(zoomStart!==null){const p=Math.min((now-zoomStart)/(reduced?1:3000),1);amount=p*p*p;}
 camera.position.z=baseZ-amount*3.05;camera.position.y=group.position.y*amount;

 glow.material.opacity=1;renderer.render(scene,camera);
}
requestAnimationFrame(frame);
})();
