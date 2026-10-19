import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context={window:{},URL,Intl};
vm.runInNewContext(readFileSync(new URL('./owners-social-posts.js',import.meta.url),'utf8'),context);
const social=context.window.CHSOwnerSocial;
const home={id:'abc',title:'Cave home',town:'Benamaurel',province:'Granada',property_type:'Cave Home',bedrooms:2,total_rooms:6,price:25000,published:true,status:'for_sale'};
test('combined caption uses saved facts in both languages, with a direct listing URL',()=>{
 const text=social.caption(home);assert.match(text,/€25,000/);assert.match(text,/25\.000/);assert.match(text,/2 bedrooms/);assert.match(text,/2 dormitorios/);assert.match(text,/6 rooms in total/);assert.match(text,/6 habitaciones en total/);assert.match(text,/https:\/\/cavehomesspain.com\/\?home=abc/);assert.ok(text.length<2200);
});
test('single-language captions and prices preserve decimal amounts',()=>{
 const en=social.caption({...home,price:25000.50},'en'),es=social.caption(home,'es');assert.match(en,/25,000.50/);assert.doesNotMatch(en,/DESCUBRE/);assert.doesNotMatch(es,/DISCOVER/);
});
test('reserved and unavailable properties are not advertised as available for viewings',()=>{
 const reserved=social.caption({...home,status:'reserved'});assert.match(reserved,/RESERVED/);assert.match(reserved,/RESERVADO/);assert.doesNotMatch(reserved,/arrange a viewing/);
 for(const status of ['sold','withdrawn','rejected'])assert.equal(social.canAdvertise({...home,status}),false);
 assert.equal(social.canAdvertise({...home,published:false}),false);assert.doesNotMatch(social.caption({...home,published:false}),/https:/);
});
test('land captions omit bedrooms and room counts and do not invent property features',()=>{
 const text=social.caption({...home,property_type:'Land',bedrooms:0,total_rooms:0});assert.doesNotMatch(text,/bedrooms|dormitorios|rooms in total|electricity|swimming pool/);assert.match(text,/Terreno/);
});
test('media validation rejects oversized, mixed or unsupported file sets',()=>{
 const image={name:'photo.jpg',type:'image/jpeg',size:1000},video={name:'tour.mp4',type:'video/mp4',size:2000};
 assert.equal(social.validateFiles([image]).length,1);assert.equal(social.validateFiles([video]).length,1);
 for(const files of [[],Array(11).fill(image),[image,video],[{name:'bad.html',type:'text/html',size:10}],[{...video,size:52428801}]])assert.throws(()=>social.validateFiles(files));
});
