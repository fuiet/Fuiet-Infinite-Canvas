import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {mapDesktopXogpuRequest,operationFromReferences}=require('../desktop-video-protocol-bridge.cjs');

test('desktop image request uses studio envelope without content URLs',()=>{const body=mapDesktopXogpuRequest({id:'MiniMax-H3'},{prompt:'move',parameters:{duration:5,ratio:'adaptive'}},[{type:'image',url:'/media/a.png'}],'image-to-video');assert.equal(body.seconds,5);assert.equal(body.size,'1280x720');assert.deepEqual(JSON.parse(body.metadata),{mode:'image',ratio:'adaptive'});assert.equal('content' in body,false)});
test('desktop text request keeps standard JSON envelope',()=>{const body=mapDesktopXogpuRequest({id:'MiniMax-H3'},{prompt:'ocean',parameters:{duration:5,ratio:'16:9'}},[],'text-to-video');assert.equal(body.duration,5);assert.equal(body.group,'discount_video_generation');assert.equal('metadata' in body,false)});
test('desktop operation inference sees video/audio as multimodal',()=>{assert.equal(operationFromReferences([{type:'video',url:'/media/v.mp4'}],{}),'reference-to-video');assert.equal(operationFromReferences([{type:'audio',url:'/media/a.wav'}],{}),'reference-to-video')});
