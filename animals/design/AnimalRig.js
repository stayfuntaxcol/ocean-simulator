import {clamp} from './AnimalDesign.js';
// Named chains rather than fixed triangle IDs: adaptable to future octopus arms.
export function orcaRig(form){
 const sx=form.length/40,bones=[{name:'torso',parent:null,position:[0,0,0]},{name:'neck',parent:'torso',position:[7*sx,0,0]},{name:'head',parent:'neck',position:[13*sx,0,0]},{name:'jaw',parent:'head',position:[12*sx,-1.3,0]},{name:'dorsal',parent:'torso',position:[-1*sx,3,0]}];
 for(let i=1;i<=7;i++)bones.push({name:`tail-${i}`,parent:i===1?'torso':`tail-${i-1}`,position:[(-3-i*2.4)*sx,0,0]});
 for(const side of [-1,1]){const name=side<0?'left':'right';bones.push({name:'fluke-'+name,parent:'tail-7',position:[-19*sx,0,side*1.5]});for(let i=1;i<=3;i++){const t=(i-1)/2;bones.push({name:`flipper-${name}-${i}`,parent:i===1?'neck':`flipper-${name}-${i-1}`,position:[(7.5-6*t)*sx,-1.8-1.7*t,side*(2.4+7.3*form.flippers*t)]});}}
 return bones;
}
export function orcaWeights(p,bones,form){
 const [x,y,z]=p,xx=x*40/form.length,abs=Math.abs(z),side=z<0?'left':'right';let names=['torso'],weights=[1];
 if(xx<-6){const t=clamp((-xx-5.4)/2.4,0,6),i=Math.floor(t),f=t-i;names=[`tail-${i+1}`,`tail-${Math.min(7,i+2)}`];weights=[1-f,f];if(xx<-17&&abs>2.5){names=[`tail-7`,'fluke-'+side];weights=[.35,.65];}}
 else if(abs>3.2&&xx<9&&xx>-5&&y<-1){const t=clamp((abs-2.4)/(7.3*form.flippers)*2,0,2),i=Math.floor(t),f=t-i;names=[`flipper-${side}-${i+1}`,`flipper-${side}-${Math.min(3,i+2)}`];weights=[1-f,f];}
 else if(y>4.4&&xx<2&&xx>-8){names=['torso','dorsal'];weights=[.15,.85];}
 else if(xx>5){const t=clamp((xx-5)/10,0,1);names=['neck','head'];weights=[1-t,t];}
 return {indices:[...names.map(n=>Math.max(0,bones.findIndex(b=>b.name===n))),0,0,0,0].slice(0,4),weights:[...weights,0,0,0,0].slice(0,4)};
}
export function motionPose(motion,time,bones,{stroke=1,jaw=0}={}){
 const phase=time*2*Math.PI/motion.duration*motion.frequency*stroke,pose=new Map(bones.map(b=>[b.name,[0,0,0]]));
 pose.set('torso',[Math.sin(phase*.5)*motion.roll,0,Math.sin(phase)*.012]);
 for(let i=1;i<=7;i++)pose.set(`tail-${i}`,[0,0,Math.sin(phase-i*motion.lag)*motion.amplitude*(.24+i*.09)]);
 for(const side of [-1,1]){const name=side<0?'left':'right';pose.set('fluke-'+name,[side*Math.sin(phase-7*motion.lag)*.04,0,Math.sin(phase-7*motion.lag)*motion.amplitude*.35]);for(let i=1;i<=3;i++)pose.set(`flipper-${name}-${i}`,[side*Math.sin(phase*.65-i*.25)*motion.flipper/i,Math.sin(phase*.4)*.035,0]);}
 pose.set('jaw',[0,0,-jaw*.48]);
 const t=((time*motion.frequency*stroke)%motion.duration+motion.duration)%motion.duration,groups=new Map();
 for(const k of motion.keys){if(!pose.has(k.bone))continue;if(!groups.has(k.bone))groups.set(k.bone,[]);groups.get(k.bone).push(k);}
 for(const [bone,keys] of groups){let a=keys[keys.length-1],b=keys[0],ta=a.time-motion.duration,tb=b.time;for(let i=0;i<keys.length;i++){if(keys[i].time<=t){a=keys[i];ta=a.time;b=keys[(i+1)%keys.length];tb=b.time+(i===keys.length-1?motion.duration:0);}}if(t<keys[0].time){a=keys.at(-1);ta=a.time-motion.duration;b=keys[0];tb=b.time;}const f=tb>ta?clamp((t-ta)/(tb-ta),0,1):0;pose.set(bone,a.rotation.map((v,i)=>v+(b.rotation[i]-v)*f));}
 return pose;
}
