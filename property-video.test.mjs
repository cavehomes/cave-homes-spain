import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const publicSource=readFileSync(new URL('./property-video.js',import.meta.url),'utf8');
const ownerSource=readFileSync(new URL('./owners-property-video.js',import.meta.url),'utf8');
function element(tag='div') {return {tag,children:[],hidden:false,events:{},append(...nodes){this.children.push(...nodes);},appendChild(node){this.children.push(node);},replaceChildren(...nodes){this.children=nodes;},setAttribute(key,value){this[key]=value;},addEventListener(name,callback){this.events[name]=callback;},querySelectorAll(){return [];}};}
function context(extra={}){
 const head=element('head'),fields={propertyVideoFile:{files:[],value:''},propertyVideoUrl:{value:''},ownerVideoProgress:element(),ownerVideoStatus:element(),ownerVideoPreview:element()};
 const document={head,documentElement:{lang:'en'},createElement:element,getElementById:id=>fields[id]};
 const c={window:{},document,URL,Error,crypto:{randomUUID:()=> 'test-id'},...extra};vm.createContext(c);vm.runInContext(publicSource,c);vm.runInContext(ownerSource,c);return {c,fields,api:c.window.CHSPropertyVideo,owner:c.window.CHSOwnerVideo};
}
test('video URL parser canonicalizes embeds and rejects unsafe or unsupported URLs',()=>{
 const {api}=context();
 for(const url of ['https://youtu.be/abcdefghijk?t=30','https://www.youtube.com/watch?v=abcdefghijk','https://youtube.com/shorts/abcdefghijk'])assert.equal(api.parse(url).embed,'https://www.youtube-nocookie.com/embed/abcdefghijk');
 assert.equal(api.parse('https://vimeo.com/12345678/abcdef1234').embed,'https://player.vimeo.com/video/12345678?h=abcdef1234');
 assert.equal(api.parse('https://example.com/video.MP4?token=x').kind,'file');
 for(const url of ['',null,'javascript:alert(1)','data:video/mp4;base64,AA','http://example.com/a.mp4','https://youtube.com.evil.test/watch?v=abcdefghijk','https://user:secret@example.com/a.mp4','https://youtube.com/watch?v=bad','https://example.com/not-video.html','https://example.com:444/a.mp4'])assert.equal(api.parse(url),null,url);
});
test('uploaded file validation enforces the type, size and owner path',()=>{
 const {owner}=context();assert.equal(owner.fileType({name:'walkthrough.mp4',type:'video/mp4',size:100}),'video/mp4');
 for(const file of [{name:'movie.mov',type:'video/quicktime',size:100},{name:'script.mp4',type:'text/html',size:100},{name:'large.mp4',type:'video/mp4',size:52428801},{name:'empty.mp4',type:'video/mp4',size:0}])assert.throws(()=>owner.fileType(file));
 const base='https://lesgzlhvrlxgtfuocadq.supabase.co/storage/v1/object/public/property-videos/';
 assert.equal(owner.ownedPath(base+'owner/file.mp4','owner'),'owner/file.mp4');assert.equal(owner.ownedPath(base+'other/file.mp4','owner'),null);assert.equal(owner.ownedPath(base+'owner/../other/file.mp4','owner'),null);
});
test('native player loads on demand; embeds contact the provider only after play',()=>{
 const {api}=context(),container=element();
 api.mount(container,{id:'p',video_url:'https://example.com/video.mp4',title:'Cave'},'es');
 const native=container.children[0].children[1].children[0];assert.equal(native.tag,'video');assert.equal(native.preload,'none');assert.equal(native.controls,true);assert.equal(native.autoplay,undefined);
 api.mount(container,{id:'p',video_url:'https://youtu.be/abcdefghijk',title:'Cave'},'en');
 const stage=container.children[0].children[1];assert.equal(stage.children[0].tag,'button');stage.children[0].onclick();assert.equal(stage.children[0].tag,'iframe');assert.equal(stage.children[0].src,'https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1');
 api.mount(container,{video_url:'javascript:alert(1)'},'en');assert.equal(container.hidden,true);assert.equal(container.children.length,0);
});
function fakeDb(removed, references=[]) {return {auth:{getSession:async()=>({data:{session:{user:{id:'owner'},access_token:'test-token'}}})},from(){return {select(){return this;},eq(){return this;},limit:async()=>({data:references})};},storage:{from:()=>({getPublicUrl:path=>({data:{publicUrl:'https://lesgzlhvrlxgtfuocadq.supabase.co/storage/v1/object/public/property-videos/'+path}}),remove:async paths=>{removed.push(...paths);return {};}})}};}
test('uploads use authenticated resumable chunks and support save rollback and replacement cleanup',async()=>{
 const {c,fields,owner}=context(),removed=[];let options;
 c.window.tus={Upload:class{constructor(file,config){options=config;}start(){options.onProgress(10,10);options.onSuccess();}}};
 fields.propertyVideoFile.files=[{name:'cave.mp4',type:'video/mp4',size:10}];
 const result=await owner.prepare(fakeDb(removed),owner.validate());assert.match(result.url,/owner\/test-id.mp4$/);assert.equal(options.chunkSize,6*1024*1024);assert.equal(options.headers.authorization,'Bearer test-token');assert.equal(options.metadata.bucketName,'property-videos');assert.equal(fields.ownerVideoProgress.hidden,true);
 await result.rollback();assert.deepEqual(removed,['owner/test-id.mp4']);
 const old='https://lesgzlhvrlxgtfuocadq.supabase.co/storage/v1/object/public/property-videos/owner/old.mp4';
 fields.propertyVideoFile.files=[];owner.load(old);fields.propertyVideoUrl.value='https://youtu.be/abcdefghijk';
 const replacement=await owner.prepare(fakeDb(removed),owner.validate());await replacement.commit();assert.ok(removed.includes('owner/old.mp4'));
 const count=removed.length;await owner.remove(fakeDb(removed,[{id:'another-listing'}]),old);assert.equal(removed.length,count,'A video reused by another listing must not be removed');
});
test('upload errors preserve the form and reject saving',async()=>{
 const {c,fields,owner}=context();c.window.tus={Upload:class{constructor(file,config){this.options=config;}start(){this.options.onError(Error('offline'));}}};
 fields.propertyVideoFile.files=[{name:'cave.mp4',type:'video/mp4',size:10}];
 await assert.rejects(owner.prepare(fakeDb([]),owner.validate()),/could not upload/);assert.equal(fields.propertyVideoFile.files.length,1);
});
