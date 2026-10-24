import {Matrix4,OrthographicCamera,Plane,Vector3,Vector4,type Camera,type WebGLRenderer,type Scene,type ShaderMaterial} from 'three';
import type {Reflector} from 'three/examples/jsm/objects/Reflector.js';
/** Reflect an orthographic view without the perspective-only oblique clipping in Three's Reflector. */
export function createOrthographicGroundReflection(){
 const reflected=new OrthographicCamera(),plane=new Plane(),normal=new Vector3(),origin=new Vector3(),position=new Vector3(),direction=new Vector3(),target=new Vector3(),clip=new Vector4(),corner=new Vector4();
 const bias=new Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
 return (mirror:Reflector,renderer:WebGLRenderer,scene:Scene,camera:Camera)=>{
  mirror.getWorldPosition(origin);normal.set(0,0,1).transformDirection(mirror.matrixWorld);plane.setFromNormalAndCoplanarPoint(normal,origin);
  camera.getWorldPosition(position);camera.getWorldDirection(direction);target.copy(position).add(direction);
  reflected.position.copy(plane.projectPoint(position,new Vector3())).multiplyScalar(2).sub(position);
  target.addScaledVector(normal,-2*plane.distanceToPoint(target));
  reflected.up.copy(camera.up).reflect(normal);reflected.lookAt(target);reflected.near=(camera as OrthographicCamera).near;reflected.far=(camera as OrthographicCamera).far;reflected.updateMatrixWorld();
  reflected.projectionMatrix.copy(camera.projectionMatrix);
  const material=mirror.material as ShaderMaterial;
  (material.uniforms.textureMatrix.value as Matrix4).copy(bias).multiply(reflected.projectionMatrix).multiply(reflected.matrixWorldInverse).multiply(mirror.matrixWorld);
  plane.applyMatrix4(reflected.matrixWorldInverse);clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
  corner.set(Math.sign(clip.x),Math.sign(clip.y),1,1).applyMatrix4(reflected.projectionMatrix.clone().invert());
  const denominator=clip.dot(corner);if(Math.abs(denominator)<1e-10)return;
  clip.multiplyScalar(2/denominator);const e=reflected.projectionMatrix.elements;
  e[2]=clip.x-e[3];e[6]=clip.y-e[7];e[10]=clip.z-e[11];e[14]=clip.w-e[15];reflected.projectionMatrixInverse.copy(reflected.projectionMatrix).invert();
  const renderTarget=renderer.getRenderTarget(),xr=renderer.xr.enabled,shadowAuto=renderer.shadowMap.autoUpdate,visible=mirror.visible;
  try{mirror.visible=false;renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(mirror.getRenderTarget());renderer.state.buffers.depth.setMask(true);if(!renderer.autoClear)renderer.clear();renderer.render(scene,reflected);}
  finally{renderer.xr.enabled=xr;renderer.shadowMap.autoUpdate=shadowAuto;renderer.setRenderTarget(renderTarget);const viewport=(camera as Camera&{viewport?:Vector4}).viewport;if(viewport)renderer.state.viewport(viewport);mirror.visible=visible;}
 };
}
