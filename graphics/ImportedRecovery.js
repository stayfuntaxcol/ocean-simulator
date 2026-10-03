import { importedDayPhase } from './ImportedBehavior.js';

export function recoverySleeping(hour,fish={},school={}){
  return importedDayPhase(hour).sleeping||school.sleeping||fish.sleeping||['sleep','settling'].includes(fish.restState);
}

// Recovery observes displacement, not merely a low velocity (rest/feeding).
// The second kick is ten seconds after the first; allow another ten to escape.
export function advanceRockRecovery(state,{now,position,blocked,trying=true,sleeping=false}){
  if(sleeping||!trying){
    state.anchor={...position};state.since=now;state.attempts=0;state.lastAttempt=null;state.clearSince=null;
    return null;
  }
  if(!state.anchor){state.anchor={...position};state.since=now;}
  const distance=Math.hypot(position.x-state.anchor.x,position.y-state.anchor.y,position.z-state.anchor.z);
  if(!blocked){
    state.clearSince??=now;
    if(distance>.75&&now-state.clearSince>=2){
      state.anchor={...position};state.since=now;state.attempts=0;state.lastAttempt=null;
    }
    return null;
  }
  state.clearSince=null;
  if(distance>.75){state.anchor={...position};state.since=now;return null;}
  if(now<(state.cooldownUntil||0))return null;
  if(!state.attempts&&now-state.since>=3){state.attempts=1;state.lastAttempt=now;return 'startle';}
  if(state.attempts===1&&now-state.lastAttempt>=10){state.attempts=2;state.lastAttempt=now;return 'startle';}
  if(state.attempts===2&&now-state.lastAttempt>=10){
    state.attempts=0;state.lastAttempt=null;state.since=now;state.cooldownUntil=now+30;
    return 'detach';
  }
  return null;
}

// Only local unobstructed links form a group; no attraction through a wall.
export function reachableFishGroups(fishes,canConnect,maxDistance=15){
  const remaining=new Set(fishes),groups=[];
  while(remaining.size){
    const first=remaining.values().next().value;remaining.delete(first);
    const group=[first];
    for(let i=0;i<group.length;i++)for(const fish of [...remaining]){
      if(group[i].position.distanceToSquared(fish.position)<=maxDistance*maxDistance&&canConnect(group[i],fish)){
        remaining.delete(fish);group.push(fish);
      }
    }
    groups.push(group);
  }
  return groups.sort((a,b)=>b.length-a.length);
}
