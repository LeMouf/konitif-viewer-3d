import {BackSide,Color,DirectionalLight,FogExp2,HemisphereLight,Light,Mesh,Scene,ShaderMaterial,SphereGeometry,Vector3,type WebGLRenderer} from 'three';
import {projectViewerSceneDayCycle,type ViewerSceneDayCycle} from './SceneDayCycle.js';
/** Optional renderer layer; geometry/material identity and caller-authored lights remain untouched. */
export class ViewerSceneEnvironmentLayer{
 private time=12;
 private fogSettings:{enabled:boolean;density:number|null}|null=null;
 setFog(settings:{enabled:boolean;density:number|null}|null){this.fogSettings=settings;return this.apply();}
 private readonly background;private readonly fog;private readonly exposure;
 private readonly lights:{light:Light;color:Color;intensity:number;position:Vector3;ground?:Color}[]=[];
 private readonly sky:Mesh<SphereGeometry,ShaderMaterial>;
 constructor(private scene:Scene,private renderer:WebGLRenderer,private key:DirectionalLight|null,private invalidate:()=>void,private transparent=false){
  this.background=scene.background;this.fog=scene.fog;this.exposure=renderer.toneMappingExposure;
  scene.traverse(object=>{if(object instanceof Light)this.lights.push({light:object,color:object.color.clone(),intensity:object.intensity,position:object.position.clone(),...(object instanceof HemisphereLight?{ground:object.groundColor.clone()}:{})});});
  const material=new ShaderMaterial({side:BackSide,depthWrite:false,depthTest:false,uniforms:{zenith:{value:new Color()},horizon:{value:new Color()},ground:{value:new Color()}},vertexShader:'varying vec3 direction;void main(){direction=normalize(position);vec4 clip=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=clip;gl_Position.z=clip.w*.99999;}',fragmentShader:`uniform vec3 zenith;uniform vec3 horizon;uniform vec3 ground;varying vec3 direction;
void main(){float y=normalize(direction).y;vec3 color=y>=0.?mix(horizon,zenith,pow(y,.6)):mix(horizon,ground,pow(-y,.5));gl_FragColor=vec4(color,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
  this.sky=new Mesh(new SphereGeometry(50,32,16),material);this.sky.name='Viewer scene day/night sky';this.sky.visible=!transparent;this.sky.renderOrder=-10000;this.sky.frustumCulled=false;
  this.sky.onBeforeRender=(_renderer,_scene,camera)=>{this.sky.position.copy(camera.getWorldPosition(new Vector3()));this.sky.updateMatrixWorld(true);};scene.add(this.sky);
 }
 setTime(timeHours:number):ViewerSceneDayCycle{this.time=timeHours;return this.apply();}
 apply():ViewerSceneDayCycle{
  const p=projectViewerSceneDayCycle(this.time);this.scene.background=this.transparent?null:new Color(p.horizon);if(this.transparent||this.fogSettings?.enabled===false)this.scene.fog=null;else{const density=this.fogSettings?.density??(.025+.02*(1-p.daylight));if(this.scene.fog instanceof FogExp2&&this.scene.fog!==this.fog){this.scene.fog.color.set(p.horizon);this.scene.fog.density=density;}else this.scene.fog=new FogExp2(p.horizon,density);}this.renderer.toneMappingExposure=p.exposure;
  this.sky.material.uniforms.zenith.value.set(p.zenith);this.sky.material.uniforms.horizon.value.set(p.horizon);this.sky.material.uniforms.ground.value.set(p.ground);
  for(const entry of this.lights){const light=entry.light;light.color.copy(entry.color);if(light===this.key){light.color.set(p.light);light.intensity=entry.intensity*p.keyIntensity;light.position.set(p.direction.x,p.direction.y,p.direction.z).multiplyScalar(10);}else{light.intensity=entry.intensity*(.2+.8*p.daylight);if(light instanceof HemisphereLight){light.color.set(p.horizon);light.groundColor.set(p.ground);}}}
  this.renderer.shadowMap.needsUpdate=true;this.invalidate();return p;
 }
 dispose(){this.sky.removeFromParent();this.sky.geometry.dispose();this.sky.material.dispose();this.scene.background=this.background;this.scene.fog=this.fog;this.renderer.toneMappingExposure=this.exposure;for(const entry of this.lights){entry.light.color.copy(entry.color);entry.light.intensity=entry.intensity;entry.light.position.copy(entry.position);if(entry.ground&&entry.light instanceof HemisphereLight)entry.light.groundColor.copy(entry.ground);}this.renderer.shadowMap.needsUpdate=true;this.invalidate();}
}
