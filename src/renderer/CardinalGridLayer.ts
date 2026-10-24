import {AddEquation,BufferGeometry,CustomBlending,Float32BufferAttribute,Group,LineBasicMaterial,LineSegments,Mesh,ShaderMaterial,DoubleSide,OneMinusDstColorFactor,OneMinusSrcAlphaFactor,OrthographicCamera,PerspectiveCamera,Vector3,type Camera,type Scene} from 'three';

/** Cardinal construction planes share the camera/world convention; no document geometry is edited. */
export function cardinalGridFrame(direction:Vector3):{normal:Vector3;u:Vector3;v:Vector3}|null{
 const d=direction.clone().normalize(),a=[Math.abs(d.x),Math.abs(d.y),Math.abs(d.z)],axis=a.indexOf(Math.max(...a));
 if(a[axis]<.99999)return null;

 return axis===0?{normal:new Vector3(1,0,0),u:new Vector3(0,0,1),v:new Vector3(0,1,0)}:axis===1?{normal:new Vector3(0,1,0),u:new Vector3(1,0,0),v:new Vector3(0,0,1)}:{normal:new Vector3(0,0,1),u:new Vector3(1,0,0),v:new Vector3(0,1,0)};
}
export class ViewerCardinalGridLayer{
 private root=new Group();private grid:Mesh<BufferGeometry,ShaderMaterial>;private axes:LineSegments;
 private key='';private direction=new Vector3();private labels:HTMLDivElement|null=null;
 private labelNodes:HTMLSpanElement[]=[];
 constructor(scene:Scene,private target:()=>Vector3,private element?:HTMLElement){
  if(element){this.labels=document.createElement('div');this.labels.setAttribute('aria-label','Repères des axes de construction');this.labels.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2';for(let i=0;i<4;i++){const label=document.createElement('span');label.style.cssText='position:absolute;padding:2px 4px;border-radius:3px;background:#18202cbb;color:white;font:600 11px system-ui;text-shadow:0 1px 2px #000;transform:translate(-50%,-50%)';this.labels.append(label);this.labelNodes.push(label);}element.append(this.labels);}

  // Premultiplied white under this blend reads the destination per pixel:
  // out = a*(1-background)+(1-a)*background. It follows sky, floor and exposure.
  const gridMaterial=new ShaderMaterial({side:DoubleSide,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,blending:CustomBlending,blendEquation:AddEquation,blendSrc:OneMinusDstColorFactor,blendDst:OneMinusSrcAlphaFactor,uniforms:{step:{value:.1},opacity:{value:.28},lineWidth:{value:.55}},vertexShader:'attribute vec2 gridCoordinate;varying vec2 gridPoint;void main(){gridPoint=gridCoordinate;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform float step;uniform float opacity;uniform float lineWidth;varying vec2 gridPoint;
void main(){vec2 cell=abs(fract(gridPoint/step-.5)-.5)*step;vec2 pixels=cell/max(fwidth(gridPoint),vec2(.0000001));float distancePx=min(pixels.x,pixels.y);float coverage=1.-smoothstep(lineWidth*.5-.5,lineWidth*.5+.5,distancePx);float a=coverage*opacity;if(a<.001)discard;gl_FragColor=vec4(vec3(a),a);}`});
  this.grid=new Mesh(new BufferGeometry(),gridMaterial);this.grid.frustumCulled=false;this.grid.renderOrder=9000;
  this.axes=new LineSegments(new BufferGeometry(),new LineBasicMaterial({vertexColors:true,transparent:true,opacity:.8,depthWrite:false,toneMapped:false}));this.axes.frustumCulled=false;this.axes.renderOrder=9001;
  this.root.name='Cardinal adaptive construction grid';this.root.userData.excludeFromGroundReflection=true;
  this.root.add(this.grid,this.axes);scene.add(this.root);

 }
 update(camera:Camera){
  camera.getWorldDirection(this.direction);const frame=cardinalGridFrame(this.direction);
  if(!frame){this.grid.geometry.setDrawRange(0,0);this.axes.geometry.setDrawRange(0,0);if(this.labels)this.labels.hidden=true;return;}if(this.labels)this.labels.hidden=false;
  const target=this.target();let height=2;
  if(camera instanceof OrthographicCamera)height=Math.abs(camera.top-camera.bottom)/camera.zoom;
  else if(camera instanceof PerspectiveCamera)height=2*camera.position.distanceTo(target)*Math.tan(camera.fov*Math.PI/360)/camera.zoom;
  const step=Math.pow(10,Math.floor(Math.log10(Math.max(height,1e-8)/10)));
  const centerU=Math.round(target.dot(frame.u)/step)*step,centerV=Math.round(target.dot(frame.v)/step)*step;
  const extent=step*100,key=[...frame.normal.toArray(),step,centerU,centerV].join(':');
  if(key!==this.key){
   this.key=key;const points:number[]=[],coordinates:number[]=[],axisPoints:number[]=[],colors:number[]=[];
   const point=(u:number,v:number,out:number[])=>out.push(frame.u.x*u+frame.v.x*v,frame.u.y*u+frame.v.y*v,frame.u.z*u+frame.v.z*v);
   for(const [u,v] of [[centerU-extent,centerV-extent],[centerU+extent,centerV-extent],[centerU+extent,centerV+extent],[centerU-extent,centerV-extent],[centerU+extent,centerV+extent],[centerU-extent,centerV+extent]]){point(u,v,points);coordinates.push(u,v);}
   this.grid.material.uniforms.step.value=step;
   for(const basis of [frame.u,frame.v]){const length=Math.max(extent,target.length()+extent);axisPoints.push(...basis.clone().multiplyScalar(-length).toArray(),...basis.clone().multiplyScalar(length).toArray());const color=basis.x?[.9,.22,.18]:basis.y?[.2,.8,.35]:[.2,.5,1];colors.push(...color,...color);}
   this.grid.geometry.dispose();this.grid.geometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute(points,3)).setAttribute('gridCoordinate',new Float32BufferAttribute(coordinates,2));
   this.axes.geometry.dispose();this.axes.geometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute(axisPoints,3)).setAttribute('color',new Float32BufferAttribute(colors,3));
  }
  this.grid.geometry.setDrawRange(0,frame.normal.y&&this.direction.y<0?0:Infinity);this.axes.geometry.setDrawRange(0,Infinity);
  if(this.element){const width=this.element.clientWidth,heightPx=this.element.clientHeight,origin=new Vector3().project(camera);let index=0;for(const basis of [frame.u,frame.v]){const end=basis.clone().multiplyScalar(height).project(camera),dx=(end.x-origin.x)*width/2,dy=-(end.y-origin.y)*heightPx/2,ox=(origin.x+1)*width/2,oy=(1-origin.y)*heightPx/2;const hits: {t:number;x:number;y:number}[]=[];for(const x of [18,width-18]){const t=(x-ox)/dx,y=oy+t*dy;if(Number.isFinite(t)&&y>=18&&y<=heightPx-18)hits.push({t,x,y});}for(const y of [18,heightPx-18]){const t=(y-oy)/dy,x=ox+t*dx;if(Number.isFinite(t)&&x>=18&&x<=width-18)hits.push({t,x,y});}hits.sort((a,b)=>a.t-b.t);const axis=basis.x?'X':basis.y?'Y':'Z';for(const hit of [hits[0],hits[hits.length-1]]){const node=this.labelNodes[index++];node.hidden=!hit;if(hit){node.textContent=(hit.t<0?'−':'+')+axis;node.style.left=hit.x+'px';node.style.top=hit.y+'px';}}}}

 }
 dispose(){this.labels?.remove();this.root.removeFromParent();for(const line of [this.grid,this.axes]){line.geometry.dispose();(line.material as LineBasicMaterial|ShaderMaterial).dispose();}}
}
