import test from 'node:test';
import assert from 'node:assert/strict';
import {Viewer3D} from '../dist/renderer/index.js';
import {BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3} from 'three';

function fixture() {
 const contacts={status:'observed',points:[]};
 const bodies=[{bodyName:'root',metadata:{visualRoot:true,groundContacts:contacts}}];
 const metadata={stateRevision:5,stepCount:0,simulatedTime:0};
 const robot=new Mesh(new BoxGeometry(.1,.4,.1),new MeshBasicMaterial());
 const group=new Group();
 const viewer=Object.assign(Object.create(Viewer3D.prototype),{
  options:{showBalanceDebug:true},poseControlTarget:'simulated',comparisonProfileId:null,
  projectedPhysicsBodyTransforms:[],projectedPhysicsCenterOfMass:null,
  runtimeHistoryReplayActive:false,playbackState:{animation:null,isPlaying:false},scrubPreviewState:null,
  physicsProjectionMinimumStateRevision:null,isApplyingRuntimeHistorySample:false,
  balanceDebugCenterOfMassQualified:false,balanceDebugCenterOfMassFadeStartedAt:null,balanceDebugGroup:group,
  isPhysicsActive:()=>true,getPoseControlRobot:()=>robot,
  physicsService:{getBodyTransforms:()=>bodies,getCenterOfMass:()=>({x:0,y:.2,z:0}),
   snapshot:()=>({backendStatus:{metadata}})},
  resolvePhysicsVectorViewerPosition:p=>new Vector3(p.x,p.y,p.z),
  resolveBalanceDebugPhysicsSupportPoints:()=>[],ensureBalanceDebugGroup:()=>group,
  updateBalanceDebugVisibility:()=>{},applyBalanceDebugPresentationOffset:()=>{}
 });
 const color=()=>{
  viewer.updateBalanceDebug();
  const marker=group.getObjectByName('balance-center-of-mass-presentation').children[0];
  return '#'+marker.material.color.getHexString();
 };
 return {viewer,contacts,bodies,metadata,group,color,dispose:()=>{
  viewer.clearBalanceDebug();robot.geometry.dispose();robot.material.dispose();
 }};
}
const flatContacts=()=>[[-.1,-.1],[.1,-.1],[.1,.1],[-.1,.1]].map(([x,z])=>({x,y:0,z}));

test('a new contact-only solver observation refreshes the overlay and requests drawing',()=>{
 const f=fixture();f.contacts.points=flatContacts();f.metadata.stepCount=1;f.metadata.simulatedTime=.002;
 Object.assign(f.viewer,{
  projectilePhysicsSettlingUntil:Infinity,lastPhysicsStepAt:0,physicsKinematicHoldFrames:0,
  lastTemporalProjectionSampleId:null,temporalProjectionExperiment:{isRecording:()=>false},
  temporalProjection:{ingest:()=>{},project:()=>null},
  markFrameSignal:()=>{},resolveTemporalProjectionDiscontinuityToken:()=>null,
  capturePhysicsVisualJointAngles:()=>({}),
  syncRobotRootFromPhysicsBody:()=>false,syncRobotPoseFromPhysicsJointStates:()=>false,
  publishTemporalProjectionStatus:()=>{},updatePhysicsResetBaselineCapture:()=>{},
  shouldShowAnyPhysicsDebugLayer:()=>false
 });
 const markerColor=()=> '#'+f.group.getObjectByName('balance-center-of-mass-presentation').children[0].material.color.getHexString();
 assert.equal(f.viewer.stepPhysics(10),true);
 assert.equal(markerColor(),'#22c55e');
 assert.equal(f.viewer.stepPhysics(10.1),false);
 f.contacts.points=[];f.metadata.stepCount=2;f.metadata.stateRevision++;f.metadata.simulatedTime=.004;
 assert.equal(f.viewer.stepPhysics(10.2),true);
 assert.equal(markerColor(),'#ef4444');
 f.dispose();
});

test('initial clearance keeps the computed COM neutral until contact evidence is available',()=>{
 const f=fixture();
 assert.deepEqual(f.viewer.resolveBalanceDebugCenterOfMass().toArray(),[0,.2,0]);
 assert.equal(f.color(),'#94a3b8');
 assert.equal(f.group.userData.supportAuthority,'unavailable');
 f.contacts.points=flatContacts();f.metadata.stateRevision++;
 assert.equal(f.color(),'#22c55e');
 assert.equal(f.group.userData.supportAuthority,'solver-ground-contacts');
 // Identical pose, but a new solved frame reports lost support.
 f.metadata.stepCount=1;f.metadata.simulatedTime=.002;f.contacts.points=[];
 assert.equal(f.color(),'#ef4444');
 f.dispose();
});
test('a recorded unsupported pose never borrows an idle live solver classification',()=>{
 const f=fixture();
 f.viewer.projectedPhysicsBodyTransforms=f.bodies;
 f.viewer.projectedPhysicsCenterOfMass={x:0,y:.2,z:0};
 f.viewer.runtimeHistoryReplayActive=true;
 assert.deepEqual(f.viewer.resolveBalanceDebugObservedContacts(),[]);
 assert.equal(f.color(),'#ef4444');
 f.dispose();
});
test('initial contacts are assessed immediately and an out-of-support COM remains red',()=>{
 const f=fixture();f.contacts.points=flatContacts();
 assert.equal(f.color(),'#22c55e');
 f.viewer.physicsService.getCenterOfMass=()=>({x:.2,y:.2,z:0});
 assert.equal(f.color(),'#ef4444');
 f.dispose();
});
