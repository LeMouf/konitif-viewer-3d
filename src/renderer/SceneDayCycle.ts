import {resolveViewerCelestialDirections,resolveViewerSolarPeakAltitude,resolveViewerMoonPhase} from './SceneAstronomy.js';
/** Default day/night palette and celestial exposure ported from Behavior Studio.
 * Time is caller-owned; this spatial projection never starts a clock or changes a document. */
export interface ViewerSceneDayCycle {timeHours:number;phase:'night'|'dawn'|'day'|'dusk';daylight:number;exposure:number;zenith:string;horizon:string;ground:string;light:string;direction:{x:number;y:number;z:number};keyIntensity:number}
export const wrapViewerSceneTime=(value:number)=>Number.isFinite(value)?((value%24)+24)%24:12;
const SCENE_STOPS = [
  { hour:0, daylight:.12, zenith:'#071326', horizon:'#172b43', ground:'#101a28', fog:'#101d2e', light:'#8da9d4' },
  { hour:5.5, daylight:.28, zenith:'#263c5e', horizon:'#d38368', ground:'#5d5360', fog:'#8d6f71', light:'#ffc29a' },
  { hour:8, daylight:.82, zenith:'#5485ba', horizon:'#bfd8e8', ground:'#8298a4', fog:'#9eb8ca', light:'#ffe2bd' },
  { hour:12, daylight:1, zenith:'#397bc0', horizon:'#c8e2f1', ground:'#91a6ae', fog:'#abc5d4', light:'#fff5dc' },
  { hour:17, daylight:.86, zenith:'#4f78aa', horizon:'#d8d9cf', ground:'#8e9698', fog:'#b4b5ae', light:'#ffe3bd' },
  { hour:20, daylight:.32, zenith:'#303c69', horizon:'#cf765f', ground:'#5c4e5c', fog:'#82656c', light:'#ffb18c' },
  { hour:22, daylight:.14, zenith:'#0b1830', horizon:'#26354d', ground:'#17202d', fog:'#19283a', light:'#91acd2' },
  { hour:24, daylight:.12, zenith:'#071326', horizon:'#172b43', ground:'#101a28', fog:'#101d2e', light:'#8da9d4' }
] as const;
const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const smooth=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const mix=(a:string,b:string,t:number)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
export function projectViewerSceneDayCycle(time:number):ViewerSceneDayCycle{
 const timeHours=wrapViewerSceneTime(time),index=Math.max(1,SCENE_STOPS.findIndex(s=>s.hour>=timeHours)),a=SCENE_STOPS[index-1],b=SCENE_STOPS[index],t=clamp((timeHours-a.hour)/(b.hour-a.hour));
 const calendar={year:2026,dayOfYear:216,timeHours,latitude:48.8566,longitude:2.3522};
 const directions=resolveViewerCelestialDirections(calendar),peak=resolveViewerSolarPeakAltitude(calendar.year,calendar.dayOfYear,calendar.latitude);
 const solar=peak>0?Math.pow(clamp(Math.max(0,directions.sun.y)/peak),.62):0;
 const moonPhase=resolveViewerMoonPhase(calendar.year,calendar.dayOfYear,timeHours),illumination=(1-Math.cos(moonPhase*Math.PI*2))/2;
 const lunar=.45*smooth(-.08,.12,directions.moon.y)*Math.pow(clamp((directions.moon.y+.08)/1.08),.58)*Math.pow(illumination,.72);
 const daylight=a.daylight*(1-t)+b.daylight*t,phase=solar>.25?'day':directions.sun.y>-.12?(timeHours<12?'dawn':'dusk'):'night';
 const useSun=solar>.0001,keyIntensity=useSun?solar:.62*Math.pow(clamp(lunar/.45),.4)*(1-smooth(-.03,0,directions.sun.y));
 return {timeHours,phase,daylight,exposure:.22+.78*Math.max(solar,lunar),zenith:mix(a.zenith,b.zenith,t),horizon:mix(a.horizon,b.horizon,t),ground:mix(a.ground,b.ground,t),light:mix(a.light,b.light,t),direction:useSun?directions.sun:directions.moon,keyIntensity};
}
