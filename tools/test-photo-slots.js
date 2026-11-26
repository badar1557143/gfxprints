// Checks the photo-frame snapping maths with a fake canvas. Run:  node tools/test-photo-slots.js
global.window = {}; global.fabric = { Rect: function(o){ Object.assign(this,o); this.type="rect"; } };
let toasts = []; global.showToast = (m)=>toasts.push(m); global.refreshLayersList = ()=>{};
require(require('path').join(__dirname,'../js/photo-slots.js'));
const G = window.GfxSlots;
const assert = (c,m)=>{ if(!c){ console.log("FAIL:",m); process.exitCode=1; } else console.log("ok  :",m); };
const near=(a,b,t=0.01)=>Math.abs(a-b)<t;

function obj(p){ const o = Object.assign({type:"image", angle:0, scaleX:1, scaleY:1, width:100, height:100, left:0, top:0}, p);
  o.getCenterPoint=()=>({x:o.left,y:o.top}); o.getScaledWidth=()=>o.width*o.scaleX; o.getScaledHeight=()=>o.height*o.scaleY;
  o.set=(a)=>Object.assign(o,a); o.setCoords=()=>{}; return o; }
function canvas(objs){ return { _o:objs, getObjects(){return this._o;}, remove(o){ this._o.splice(this._o.indexOf(o),1); }, moveTo(o,i){ this._o.splice(this._o.indexOf(o),1); this._o.splice(i,0,o); }, requestRenderAll(){} }; }
const SLOT = {x:8,y:7,w:84,h:98,vw:100,vh:138,key:"k1"};

// 1. upright card: 100 wide x 138 high drawn at 1:1, centre (200,200)
let card = obj({left:200,top:200,width:100,height:138,gfxVector:true,gfxSlot:SLOT});
let g = G.slotGeometry(card);
assert(near(g.cx,200) && near(g.cy,200+(7+49-69)), "spot centre is 13 above the card centre");
assert(near(g.w,84) && near(g.h,98), "spot size 84 x 98");
assert(G.insideCard(g,{x:230,y:260}) && !G.insideCard(g,{x:300,y:200}), "hit test inside / outside the card");

// 2. card turned 90 degrees: the spot moves to the side
card.angle = 90; g = G.slotGeometry(card);
assert(near(g.cx,213) && near(g.cy,200), "turned 90 deg: spot centre moves to (213,200), got "+g.cx.toFixed(1)+","+g.cy.toFixed(1));

// 3. scaled card (x2) keeps proportions
card.angle = 0; card.scaleX = card.scaleY = 2; g = G.slotGeometry(card);
assert(near(g.w,168) && near(g.h,196) && near(g.cy,200-26), "scaled x2: spot 168 x 196, centre 26 above");
card.scaleX = card.scaleY = 1;

// 4. cover scale: wide photo 400x200 into 84x98 -> height decides
assert(near(G.coverScale(400,200,84,98),0.49), "wide photo covers by height");
assert(near(G.coverScale(100,400,84,98),0.84), "tall photo covers by width");

// 5. full drop flow
let photo = obj({left:205,top:190,width:400,height:200});
let cv = canvas([card, photo]);
G.onModified(cv,{target:photo,action:"drag"});
assert(photo.gfxInSlot==="k1","photo is marked as in the frame");
assert(near(photo.left,200)&&near(photo.top,187),"photo centred on the spot");
assert(near(photo.scaleX,0.49)&&near(photo.scaleY,0.49),"photo scaled to cover");
assert(photo.clipPath && near(photo.clipPath.width,84/0.49,0.1) && near(photo.clipPath.height,98/0.49,0.1),"clip equals the spot in photo units");
assert(cv._o.indexOf(photo)===1,"photo sits just above its frame");
assert(toasts.length===1,"one message shown");

// 6. second photo in same frame replaces the first
let photo2 = obj({left:195,top:210,width:300,height:300});
cv._o.push(photo2); G.onModified(cv,{target:photo2,action:"drag"});
assert(!cv._o.includes(photo) && cv._o.includes(photo2),"old photo replaced");

// 7. dragging out frees the photo
photo2.left=700; photo2.top=700; G.onModified(cv,{target:photo2,action:"drag"});
assert(photo2.clipPath===null && photo2.gfxInSlot===null,"photo dropped away from the frame is free again");

// 8. resize / rotate does not snap; vector layers and frames are ignored; group ignored
let p3 = obj({left:200,top:200,width:100,height:100});
cv._o.push(p3); G.onModified(cv,{target:p3,action:"scale"});
assert(!p3.gfxInSlot,"scaling does not snap");
let sticker = obj({left:200,top:200,gfxVector:true}); cv._o.push(sticker); G.onModified(cv,{target:sticker,action:"drag"});
assert(!sticker.gfxInSlot,"stickers and clipart are ignored");
G.onModified(cv,{target:card,action:"drag"}); assert(!card.gfxInSlot,"a frame is never put into a frame");
G.onModified(cv,{target:{type:"activeSelection"},action:"drag"}); assert(true,"group selection ignored without error");

// 9. two overlapping frames: nearest spot wins; photo below its frame in z-order goes just above it
let cardB = obj({left:240,top:200,width:100,height:138,gfxVector:true,gfxSlot:Object.assign({},SLOT,{key:"k2"})});
let p4 = obj({left:230,top:190,width:200,height:200});
let cv2 = canvas([p4, card, cardB]); G.onModified(cv2,{target:p4,action:"drag"});
assert(p4.gfxInSlot==="k2","nearest frame chosen (k2)");
assert(cv2._o.indexOf(p4)===cv2._o.indexOf(cardB)+1,"photo placed right above frame k2");

// 10. photos ADDED from the Images list (tap or drag from the list)
function frame(x,y,key){ return obj({left:x,top:y,width:100,height:138,gfxVector:true,gfxSlot:Object.assign({},SLOT,{key:key})}); }
// two rows of two frames, listed in a mixed order on purpose
const f1=frame(100,100,"a"), f2=frame(300,100,"b"), f3=frame(100,300,"c"), f4=frame(300,300,"d");
let cv3 = canvas([f4,f2,f3,f1]); cv3.getActiveObject=()=>null;
assert(G.emptyFrames(cv3).map(f=>f.card.gfxSlot.key).join("")==="abcd","empty frames are in reading order (a b c d)");
let c1 = G.chooseFrame(cv3,null); assert(c1.card===f1,"tap: first empty frame is the top-left one");
// fill it, the next tap goes to the next empty frame
let ph1 = obj({left:100,top:100,width:300,height:200}); cv3._o.push(ph1); G.fillFrame(cv3,ph1,c1);
assert(G.chooseFrame(cv3,null).card===f2,"tap again: next empty frame (b)");
// a selected frame wins, even if it already has a photo
cv3.getActiveObject=()=>f1; assert(G.chooseFrame(cv3,null).card===f1,"selected frame is chosen first");
cv3.getActiveObject=()=>null;
// dropped at a point: that frame, even if not the first empty one
assert(G.chooseFrame(cv3,{x:310,y:310}).card===f4,"drop at a point picks the frame under it (d)");
assert(G.chooseFrame(cv3,{x:700,y:700})===null,"drop away from frames: no frame, photo stays free");
// all frames full: tap adds a free photo
[f2,f3,f4].forEach((f,i)=>{ const ph=obj({left:f.left,top:f.top,width:300,height:200}); cv3._o.push(ph); G.fillFrame(cv3,ph,G.chooseFrame(cv3,null)); });
assert(G.emptyFrames(cv3).length===0 && G.chooseFrame(cv3,null)===null,"all frames full: nothing chosen, photo is added free");
// no frames at all
let cv4=canvas([obj({})]); cv4.getActiveObject=()=>null; assert(G.chooseFrame(cv4,null)===null,"design without frames is not affected");
console.log(process.exitCode?"SOME TESTS FAILED":"ALL TESTS PASSED");
