const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,Number(value)||0));

export const IMPORT_SLEEP_START=21;
export const IMPORT_WAKE_HOUR=5.75;

export function importedDayPhase(hour=12){
  const h=((Number(hour)||0)%24+24)%24;
  const sleeping=h>=IMPORT_SLEEP_START||h<IMPORT_WAKE_HOUR;
  return {hour:h,sleeping,phase:sleeping?'sleep':'awake'};
}

export function importedReserveMode(ratio=1){
  const r=clamp(ratio);
  if(r<.20)return 'urgent';
  if(r<.40)return 'forage';
  if(r<.65)return 'seek';
  return 'explore';
}

export function importedCollisionRadius(size){
  const dims=[Number(size?.x)||0,Number(size?.y)||0,Number(size?.z)||0].filter(v=>v>0).sort((a,b)=>a-b);
  if(!dims.length)return .38;
  const minor=dims[0],mid=dims[Math.min(1,dims.length-1)];
  // Use the cross-section, not the fish length. This lets long fish pass close
  // to rock faces without treating their full bounding-box diagonal as a sphere.
  return clamp((minor+mid)*.24+.06,.30,.78);
}

export function importedExploreRadius(exploration=.15){
  return 18+clamp(exploration,0,.45)*105;
}

export function importedRetargetSeconds(exploration=.15,random=.5){
  const active=clamp(exploration,0,.45)/.45;
  return 11+(1-active)*8+clamp(random)*8;
}
