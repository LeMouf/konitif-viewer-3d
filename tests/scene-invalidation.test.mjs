import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Viewer3D} from '../dist/renderer/index.js';
test('caller-owned scene updates request one on-demand frame and ignore disposed viewers',()=>{const viewer=Object.create(Viewer3D.prototype);let frames=0;viewer.requestRender=()=>frames++;viewer.destroyed=false;viewer.notifySceneChanged();assert.equal(frames,1);viewer.destroyed=true;viewer.notifySceneChanged();assert.equal(frames,1);});
