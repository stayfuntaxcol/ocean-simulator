// Local simulation only: never write frame state or offspring to Firebase.
export const MATURITY_SECONDS=600;
export const MAX_POPULATION=1000;
export function growthBudget({credit=0,adults=0,factor=1,dt=0,enabled=false,room=0,foodRatio=0}={}){
  if(!enabled||adults<2||room<1||foodRatio<=0)return {credit:0,births:0};
  // At factor 1, ten healthy adults produce at most one juvenile per simulated minute.
  const earned=Math.max(0,adults)*Math.min(10,Math.max(0,factor))*Math.min(.25,Math.max(0,dt))/600*Math.min(1,foodRatio);
  const available=Math.min(1,Math.floor(Math.max(0,room)));
  const births=Math.min(available,Math.floor(credit+earned+1e-9));
  return {births,credit:Math.min(.999999,Math.max(0,credit+earned-births))};
}
export function juvenileScale(age){return .35+.65*Math.min(1,Math.max(0,age)/MATURITY_SECONDS);}
