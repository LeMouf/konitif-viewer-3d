import test from 'node:test';
import assert from 'node:assert/strict';
import {Viewer3D} from '../dist/renderer/index.js';
import {AnimationLoop} from '../dist/renderer/AnimationLoop.js';

test('caller scene updates use one coalesced viewer frame and preserve transport',()=>{
 const original=globalThis.requestAnimationFrame;
 let scheduled=0,invalidations=0;const time=7.4;
 globalThis.requestAnimationFrame=()=>++scheduled;
 try {
  const loop=new AnimationLoop({isDestroyed:()=>false,invalidate:()=>invalidations++,frame:()=>{}});
  const projectionOnly={requestRender:()=>loop.requestRender()};
  for(let i=0;i<200;i++)Viewer3D.prototype.requestPresentationFrame.call(projectionOnly);
  assert.equal(scheduled,1);
  assert.equal(invalidations,200);
  assert.equal(time,7.4);
  assert.equal(loop.needsRender,true);
  loop.beginFrame();
  Viewer3D.prototype.requestPresentationFrame.call(projectionOnly);
  assert.equal(scheduled,2);
 }finally{
  if(original===undefined)delete globalThis.requestAnimationFrame;
  else globalThis.requestAnimationFrame=original;
 }
});
