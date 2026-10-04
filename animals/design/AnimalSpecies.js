export const ANIMAL_NAMES={orca:'Orka',whale:'Walvis',turtle:'Zeeschildpad',stingray:'Stingray',squid:'Squid / inktvis'};
// Suggested game sizes, editable independently of source-model units.
export const IMPORT_LENGTHS={orca:5,whale:10,turtle:1.2,stingray:2,squid:.6};
export const IMPORT_SPEEDS={orca:2,whale:1.2,turtle:.7,stingray:.7,squid:.45};
export function importedScale(design,settings={},age=30){
 if(design.species==='turtle')return (settings.babyScale??.22)+(1-(settings.babyScale??.22))*Math.max(0,Math.min(1,age/(settings.adultAge||30)));
 return 1;
}
export function normalizeDesignBehavior(input={}){
 const limits={speed:[.05,8],huntSpeed:[.05,10],turnRate:[.05,3],count:[1,20],depth:[1,100],depthVariation:[0,20],groupDistance:[.2,50],familyDistance:[.2,50],stroke:[.1,4],age:[0,250],adultAge:[15,60],oldAge:[65,120],babyScale:[.05,1],babySpeed:[.05,3],residence:[60,1800],returnTime:[15,600],surfaceInterval:[30,300],surfaceDuration:[3,18],hungerRate:[0,10],meal:[2,50],huntThreshold:[5,90],sense:[15,120],calfSize:[.25,.65]};
 const out={};for(const [key,[a,b]] of Object.entries(limits))if(Number.isFinite(input[key]))out[key]=Math.max(a,Math.min(b,input[key]));for(const key of ['feeding','turtleHunting','migration'])if(typeof input[key]==='boolean')out[key]=input[key];return out;
}
