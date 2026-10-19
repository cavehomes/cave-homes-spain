import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context = {window:{}, Intl, Date, Set, Map};
vm.runInNewContext(readFileSync(new URL('./owners-attention.js', import.meta.url),'utf8'), context);
const build = (data, now = '2026-10-19T10:00:00Z') => JSON.parse(JSON.stringify(context.window.CHSOwnerAttention.build({enquiries:[],followups:[],care:[],properties:[],...data},new Date(now))));
const enquiry = (id, extra = {}) => ({id,name:'Customer '+id,status:'new',subject:'Property Viewing & Local Support enquiry',...extra});
const complete = {id:'p',title:'Cave home',town:'Baza',description:'A cave home.',price:18000,main_image_url:'photo.jpg',published:true,status:'for_sale'};
test('messages route ordinary, support and buyer searches correctly, excluding applications', () => {
 const groups=build({enquiries:[enquiry('support'),enquiry('ordinary',{subject:'Cave home enquiry'}),enquiry('search',{message:'PROPERTY_MATCH:{}'}),enquiry('application',{message:'PROPERTY_APPLICATION:{}'}),enquiry('rental',{message:'{"submission_type":"long_term_rental"}'}),enquiry('read',{status:'read'})]});
 assert.deepEqual(groups[0].items.map(x=>x.view),['buyer','inquiries','buyerRequests']);
});
test('follow-ups include today and overdue, excluding completed, future, orphan and unrelated enquiries', () => {
 const enquiries=['today','overdue','complete','future','ordinary','cancelled'].map(id=>enquiry(id,id==='ordinary'?{subject:'Property enquiry'}:id==='cancelled'?{status:'cancelled'}:{}));
 const followups=['today','overdue','complete','future','ordinary','cancelled','orphan'].map(id=>({enquiry_id:id,stage:id==='complete'?'completed':'contacted',follow_up_date:id==='future'?'2026-10-20':id==='overdue'?'2026-10-18':'2026-10-19'}));
 assert.deepEqual(build({enquiries,followups})[1].items.map(x=>x.id),['overdue','today']);
});
test('confirmed visits and care jobs include overdue and seven-day boundary, excluding drafts and closed jobs', () => {
 const enquiries=['confirmed','draft','completed','future'].map(id=>enquiry(id));
 const followups=enquiries.map(q=>({enquiry_id:q.id,stage:q.id==='completed'?'completed':'booked',booking_confirmed_at:q.id==='draft'?null:'2026-10-18',booking_details:{date:q.id==='future'?'2026-10-27':'2026-10-19',time:'11:00'}}));
 const care=[{id:'overdue',scheduled_for:'2026-10-18T09:00:00Z',status:'assigned'}, {id:'edge',scheduled_for:'2026-10-26T20:00:00Z',status:'assigned'}, {id:'late',scheduled_for:'2026-10-26T23:30:00Z',status:'assigned'}, {id:'closed',scheduled_for:'2026-10-20T09:00:00Z',status:'completed'}];
 assert.deepEqual(build({enquiries,followups,care})[2].items.map(x=>x.id),['overdue','confirmed','edge']);
});
test('uses Madrid calendar date across midnight and daylight-saving change', () => {
 const enquiries=[enquiry('due')],followups=[{enquiry_id:'due',stage:'new',follow_up_date:'2026-10-20'}];
 assert.equal(build({enquiries,followups},'2026-10-19T22:05:00Z')[1].items.length,1);
 const care=[{id:'oct25',scheduled_for:'2026-10-25T22:30:00Z',status:'assigned'}];
 assert.equal(build({care},'2026-10-18T10:00:00Z')[2].items.length,1);
});
test('listing checks respect optional room/energy fields and exclude sold or reserved homes', () => {
 const properties=[complete,{...complete,id:'draft',published:false},{...complete,id:'missing',description:''},{...complete,id:'sold',status:'sold',published:false},{...complete,id:'reserved',status:'reserved',description:''},{...complete,id:'land',property_type:'Land',price:0,total_rooms:null,energy_status:'waiting'}];
 assert.deepEqual(build({properties})[3].items.map(x=>x.id),['missing','draft']);
});
test('failed data sources are unavailable or partial, never represented as a complete empty list', () => {
 const groups=build({enquiries:null,followups:null,care:null,properties:null});
 assert.ok(groups.every(g=>g.unavailable));
 const partial=build({enquiries:[],followups:null,care:[]})[2];
 assert.equal(partial.unavailable,false);assert.equal(partial.partial,true);
});
