import test from 'node:test';
import assert from 'node:assert/strict';
import {Viewer3D} from '../dist/renderer/index.js';
import {Vector3} from 'three';
function subject(overrides = {}) {
 const bodies = [{bodyName:'base_link',metadata:{visualRoot:true,groundContacts:{status:'observed',points:[{x:.01,y:0,z:.02}]}}}];
 const center = {x:.01,y:.23,z:.02};
 return Object.assign(Object.create(Viewer3D.prototype), {
  projectedPhysicsBodyTransforms:[],projectedPhysicsCenterOfMass:null,
  runtimeHistoryReplayActive:false,playbackState:null,scrubPreviewState:null,
  poseControlTarget:'simulated',comparisonProfileId:null,
  physicsProjectionMinimumStateRevision:null,isApplyingRuntimeHistorySample:false,
  isPhysicsActive:()=>true,
  physicsService:{getBodyTransforms:()=>bodies,getCenterOfMass:()=>center,
   snapshot:()=>({backendStatus:{metadata:{stateRevision:5}}})},
  resolvePhysicsVectorViewerPosition:p=>new Vector3(p.x,p.y,p.z),...overrides
 });
}
test('idle balance projects acknowledged mass and contacts before any playback sample',()=>{
 const viewer=subject({playbackState:{animation:null,isPlaying:false}});
 assert.deepEqual(viewer.resolveBalanceDebugCenterOfMass().toArray(),[.01,.23,.02]);
 assert.deepEqual(viewer.resolveBalanceDebugObservedContacts().map(p=>p.toArray()),[[.01,0,.02]]);
 assert.deepEqual(viewer.projectedPhysicsBodyTransforms,[]);
});
for(const overrides of [
 {runtimeHistoryReplayActive:true}, {playbackState:{clockMode:'external',animation:{id:'clip'}}},
 {scrubPreviewState:{active:true}}, {physicsProjectionMinimumStateRevision:6},
 {isPhysicsActive:()=>false}
]) test('idle fallback cannot replace pending or transport-owned evidence '+JSON.stringify(overrides),()=>{
 const viewer=subject(overrides);
 assert.equal(viewer.resolveBalanceDebugCenterOfMass(),null);
 assert.equal(viewer.resolveBalanceDebugObservedContacts(),null);
});
test('recorded COM stays authoritative instead of borrowing the live solver',()=>{
 const viewer=subject({projectedPhysicsBodyTransforms:[{bodyName:'recorded'}],projectedPhysicsCenterOfMass:{x:1,y:2,z:3},runtimeHistoryReplayActive:true});
 assert.deepEqual(viewer.resolveBalanceDebugCenterOfMass().toArray(),[1,2,3]);
 assert.equal(viewer.resolveBalanceDebugObservedContacts(),null);
 viewer.projectedPhysicsCenterOfMass=null;
 assert.equal(viewer.resolveBalanceDebugCenterOfMass(),null);
});
