import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Vector3,OrthographicCamera,CustomBlending,OneMinusDstColorFactor,OneMinusSrcAlphaFactor} from 'three';
import {ViewerCardinalGridLayer,cardinalGridFrame} from '../dist/renderer/CardinalGridLayer.js';
test('all six cardinal planes follow world axes while oblique views have no planar grid',()=>{
 for(const d of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const f=cardinalGridFrame(new Vector3(...d));assert.ok(f);assert.equal(f.u.dot(f.normal),0);assert.equal(f.v.dot(f.normal),0);assert.equal(f.u.dot(f.v),0);}
 assert.equal(cardinalGridFrame(new Vector3(1,1,1)),null);
});
test('grid uses destination contrast and spans both signs without changing the subject',()=>{
 const scene=new Scene(),layer=new ViewerCardinalGridLayer(scene,()=>new Vector3()),camera=new OrthographicCamera(-2,2,2,-2,.01,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();layer.update(camera);
 const root=scene.children[0],grid=root.children[0],axes=root.children[1];assert.ok(grid.geometry.getAttribute('position').count>0);assert.equal(grid.material.blending,CustomBlending);assert.equal(grid.material.blendSrc,OneMinusDstColorFactor);assert.equal(grid.material.blendDst,OneMinusSrcAlphaFactor);assert.equal(grid.material.depthWrite,false);
 const p=axes.geometry.getAttribute('position');assert.ok(p.getX(0)<0&&p.getX(1)>0);assert.ok(p.getY(2)<0&&p.getY(3)>0);
 camera.position.set(5,5,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();layer.update(camera);assert.equal(grid.geometry.drawRange.count,0);assert.equal(axes.geometry.drawRange.count,0);
 camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();layer.update(camera);assert.equal(grid.geometry.drawRange.count,Infinity);layer.dispose();assert.equal(scene.children.length,0);
});
test('top keeps the existing floor grid but bottom receives a construction plane',()=>{
 const scene=new Scene(),layer=new ViewerCardinalGridLayer(scene,()=>new Vector3()),camera=new OrthographicCamera(-2,2,2,-2,.01,100);camera.position.set(0,5,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld();layer.update(camera);assert.equal(scene.children[0].children[0].geometry.drawRange.count,0);assert.equal(scene.children[0].children[1].geometry.drawRange.count,Infinity);camera.position.set(0,-5,0);camera.lookAt(0,0,0);camera.updateMatrixWorld();layer.update(camera);assert.equal(scene.children[0].children[0].geometry.drawRange.count,Infinity);layer.dispose();
});
