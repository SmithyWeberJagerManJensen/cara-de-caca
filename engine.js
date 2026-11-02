'use strict';
let G=null,P=[],uid=0,BUSY=false,ORG=null;
const HOST=globalThis.HOST;
function render(){HOST.sync()}
function banner(t,c){HOST.fx({b:[t,c||'']})}
function snd(n){HOST.fx({s:n})}
function anim(i,cs,done){HOST.fx({a:{k:'play',i,cs:cs.map(vis),h:ORG}});ORG=null;done()}
function animTake(i,done){HOST.fx({a:{k:'take',i}});done()}
function animDraw(i,cs){if(cs.length)HOST.fx({a:{k:'draw',i,n:cs.length,cv:cs.map(vis)}})}
const R=['2','3','4','5','6','7','8','9','10','J','Q','K','A'],S=['♠','♥','♦','♣'];
const nm=c=>c.r==13?'Joker':R[c.r]+c.s;
const act=p=>p.h.length+p.u.length+p.d.length>0;
const tp=()=>G.pile[G.pile.length-1];
function ok(c){if(G.jk)return c.r==13;const t=tp();if(!t)return true;if(t.r==13)return c.r==13;if(c.r==0||c.r==8||c.r==13)return true;if(t.r==5)return c.r<=5;return c.r>=t.r}
const say=t=>{G.log.push(t);if(G.log.length>4)G.log.shift()};
const rm=(p,s,cs)=>cs.forEach(c=>p[s].splice(p[s].indexOf(c),1));
const phase=p=>p.h.length||G.deck.length?'h':p.u.length?'u':'d';
function nx(i,k=1){const n=P.length;let j=i;while(k--){let g=0;do{j=(j+G.dir+n)%n}while(!act(P[j])&&++g<=n)}return j}
function doZap(i,cs,s){const p=P[i];rm(p,s,cs);banner('⚡ ¡RELÁMPAGO!','zp');say(`⚡ ${p.n} lanza un relámpago`);play(i,cs)}
const ZP={f:.2,m:.55,d:.9},ZD=d=>(d=='f'?1100+Math.pow(Math.random(),1.4)*2600:d=='d'?650+Math.pow(Math.random(),1.8)*900:650+Math.pow(Math.random(),1.6)*1900)|0;
function schedZap(){
  if(G.over||G.jk||!G.pile.length)return;const t=tp();if(G.ls===t.id)return;G.ls=t.id;
  P.forEach((p,i)=>{
    if(!p.bot||!act(p)||Math.random()>ZP[G.diff||'m'])return;
    const tryz=n=>{
      if(G.over||G.jk||tp()!==t||!act(p)||G.cur==i)return;
      if(BUSY||G.resp){if(n<10)setTimeout(()=>tryz(n+1),250);return}
      const s=phase(p);if(s=='d')return;const m=p[s].filter(c=>c.r==t.r);if(!m.length)return;
      doZap(i,Math.random()<.7?m:m.slice(0,1+(Math.random()*m.length|0)),s);
    };
    setTimeout(()=>tryz(0),ZD(G.diff||'m'));
  });
}
function play(i,cs){anim(i,cs,()=>play2(i,cs))}
function play2(i,cs){
  const p=P[i],r=cs[0].r;if(r==13){G.jk=true;banner('¡JOKER!','jk')}else{G.pile.push(...cs);G.jk=false}G.last=i;
  say(`${p.n} juega ${cs.length>1?cs.length+'× '+(r==13?'Joker':R[r]):nm(cs[0])}`);
  snd('play');const drawn=[];while(p.h.length<3&&G.deck.length){const c=G.deck.pop();p.h.push(c);drawn.push(c)}
  let tail=0;for(let k=G.pile.length-1;k>=0&&r!=13&&G.pile[k].r==r;k--)tail++;
  const burn=r==8||tail>=4;let skip=0;
  if(burn){G.pile=[];banner('🔥 ¡QUEMADO! 🔥','fire');say(r==8?'🔥 El 10 quema el montón. Vuelve a jugar.':'🔥 4 iguales: montón eliminado. Vuelve a jugar.')}
  else if(r==6){skip=cs.length;snd('skip');say('⏭ Se salta al siguiente')}
  if(r==9&&cs.length%2){G.dir*=-1;snd('rev');say('🔄 Cambia el sentido')}
  if(!act(p))say(`✅ ${p.n} se quedó sin cartas`);
  const left=P.filter(act);
  if(left.length<=1){G.over=true;snd('over');G.loser=P.indexOf(left[0]);G.cur=null;return render()}
  if(G.first){G.first=false;if(!burn&&![6,9,13].includes(r)&&act(p)){G.resp={s:i};G.cur=null;turn();return animDraw(i,drawn)}}
  G.cur=burn&&act(p)?i:nx(i,1+skip);turn();animDraw(i,drawn);
}
function take(i){if(BUSY)return;animTake(i,()=>take2(i))}
function take2(i){
  const p=P[i];say(`${p.n} se lleva ${G.pile.length} cartas`);p.h.push(...G.pile);G.pile=[];G.jk=false;
  let s=G.last;if(s==null||s==i||!act(P[s])){G.dir*=-1;s=nx(i);G.dir*=-1}
  G.cur=s;turn();
}
function blind(i){if(BUSY)return;ORG='deck';const c=G.deck.pop();say(`${P[i].n} saca del mazo: ${nm(c)}`);if(ok(c))play(i,[c]);else anim(i,[c],()=>{banner('¡CASI!','casi');G.pile.push(c);take(i)})}
function down(i,k){if(BUSY)return;ORG=k;const p=P[i],c=p.d.splice(k,1)[0];say(`${p.n} voltea: ${nm(c)}`);if(ok(c))play(i,[c]);else anim(i,[c],()=>{G.pile.push(c);take(i)})}
const FD=[];for(let r=0;r<13;r++)for(let k=0;k<8;k++)FD.push({r});for(let k=0;k<4;k++)FD.push({r:13});
function botSmart(){
  const i=G.cur,p=P[i],s=phase(p),hard=G.diff=='d';
  if(s=='d')return down(i,Math.random()*p.d.length|0);
  const v=p[s].filter(ok);
  if(!v.length)return s=='h'&&G.deck.length?blind(i):take(i);
  const play1=g=>{rm(p,s,g);play(i,g)};
  if(!hard){const b=v[Math.random()*v.length|0],same=p[s].filter(c=>c.r==b.r);return play1(Math.random()<.5?[b]:same)}
  const left=q=>q.h.length+q.u.length+q.d.length,nxt=nx(i);
  if(false){
    const pr=FD.filter(ok).length/FD.length;
    if((G.pile.length<=5||pr>.9)&&((v.every(c=>c.r==0||c.r==8||c.r==13)&&pr>.55)||pr>.8)&&Math.random()<.6)return blind(i);
  }
  const jk=v.filter(c=>c.r==13);
  
  const e8=v.filter(c=>c.r==6);
  if(e8.length&&nxt!=i&&left(P[nxt])<=2)return play1([e8[0]]);
  const pf=c=>c.r==13?25:c.r==0?24:c.r==8?23:c.r==9?22:c.r==6?21:c.r==5?20:c.r;
  const b=Math.random()<.05?v[Math.random()*v.length|0]:v.reduce((a,c)=>pf(c)<pf(a)?c:a);
  play1(p[s].filter(c=>c.r==b.r));
}
function botMove(){if(G.diff&&G.diff!='m')return botSmart();
  const i=G.cur,p=P[i],s=phase(p);if(s=='d')return down(i,Math.random()*p.d.length|0);
  const v=p[s].filter(ok);if(!v.length)return s=='h'&&G.deck.length?blind(i):take(i);
  const pf=c=>c.r==13?25:c.r==0?24:c.r==8?23:c.r==9?22:c.r==6?21:c.r==5?20:c.r;
  const b=Math.random()<.2?v[Math.random()*v.length|0]:v.reduce((a,c)=>pf(c)<pf(a)?c:a),g=p[s].filter(c=>c.r==b.r);rm(p,s,g);play(i,g);
}
function setDir(j){G.dir=j==(G.resp.s+1)%P.length?1:-1;G.resp=null}
function resp(){
  const s=G.resp.s,n=P.length;
  const c=[(s+1)%n,(s-1+n)%n].filter(i=>act(P[i])&&P[i].h.some(ok));
  const hu=c.find(i=>!P[i].bot),bo=c.filter(i=>P[i].bot);
  if(hu!=null){G.cur=hu;G.resp.other=c.find(i=>i!=hu);say('Puedes responder tú o ceder.');return render()}
  if(bo.length){const j=bo[Math.random()*bo.length|0];setDir(j);G.cur=j}else{G.resp=null;G.dir=1;G.cur=nx(s)}
  turn();
}
function turn(){const t=G.t=(G.t||0)+1;render();if(G.over)return;schedZap();if(G.resp&&G.cur==null)return setTimeout(()=>{if(G.t==t)resp()},700);if(P[G.cur].bot)setTimeout(()=>{if(G.t==t&&!BUSY)botMove()},(G.diff=='f'?1000+Math.random()*1200:G.diff=='d'?600+Math.random()*700:700+Math.random()*900)|0)}

const lzOKs=i=>!G.over&&G.cur!==i&&!G.resp&&G.pile.length>0&&!G.jk&&phase(P[i])!='d'&&act(P[i]);
function newGame(seats,diff){
  const dk=[];for(let k=0;k<2;k++)for(const s of S)for(let r=0;r<13;r++)dk.push({r,s,id:uid++});
  for(let k=0;k<4;k++)dk.push({r:13,s:'',id:uid++});
  for(let i=dk.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[dk[i],dk[j]]=[dk[j],dk[i]]}
  P=seats.map(x=>({n:x.name,bot:x.bot,d:dk.splice(-3),u:dk.splice(-3),h:dk.splice(-3)}));
  G={diff,deck:dk,pile:[],dir:1,last:null,cur:0,over:false,first:true,resp:null,log:['¡Comienza la partida!']};
  let m=99;P.forEach(p=>p.h.forEach(c=>{if(c.r>0&&c.r<13)m=Math.min(m,c.r)}));
  const c=[];P.forEach((p,i)=>{if(p.h.some(x=>x.r==m))c.push(i)});
  G.cur=c.length?c[Math.random()*c.length|0]:0;
  say(`${P[G.cur].n} parte${m<99?' con el '+R[m]:''}`);turn();
}
const vis=c=>({r:c.r,s:c.s,id:c.id});
function snap(me){
  return{n:P.length,me,cur:G.cur,dir:G.dir,jk:!!G.jk,over:G.over,loser:G.loser==null?null:G.loser,diff:G.diff,log:G.log.slice(-3),
    deck:G.deck.length,pile:G.pile.length,top:G.pile.slice(-3).map(vis),
    resp:!!(G.resp&&G.cur===me&&G.resp.other!=null),
    pl:P.map((p,i)=>({n:p.n,bot:p.bot,h:i==me?p.h.map(vis):p.h.length,u:p.u.map(vis),d:p.d.length}))};
}
const API={newGame,snap,
  play(i,ids){if(G.over||G.cur!==i)return;const p=P[i],s=phase(p);if(s=='d')return;
    const cs=ids.map(id=>p[s].find(c=>c.id==id));if(!cs.length||cs.some(c=>!c||c.r!=cs[0].r))return;
    if(G.resp)setDir(i);rm(p,s,cs);
    if(ok(cs[0]))play(i,cs);else anim(i,cs,()=>{say(`${p.n} juega ${nm(cs[0])}, pero no sirve`);G.pile.push(...cs);take(i)})},
  zap(i,ids){if(!lzOKs(i))return;const p=P[i],s=phase(p),t=tp();
    const cs=ids.map(id=>p[s].find(x=>x.id==id)).filter(c=>c&&c.r==t.r);if(!cs.length)return;doZap(i,cs,s)},
  blind(i){if(G.over||G.cur!==i||phase(P[i])!='h'||!G.deck.length)return;blind(i)},
  take(i){if(G.over||G.cur!==i||G.resp||!(G.pile.length||G.jk))return;take(i)},
  down(i,k){if(G.over||G.cur!==i||phase(P[i])!='d'||!P[i].d[k])return;down(i,k)},
  cede(i){if(G.cur!==i||!G.resp||G.resp.other==null)return;const j=G.resp.other;setDir(j);G.cur=j;turn()},
  kick(i){P[i].bot=true;if(G.over)return;if(G.resp&&G.cur===i)setDir(i);if(G.cur===i)turn();else render()},
  over(){return !!(G&&G.over)},
  cur(){return G?{cur:G.cur,t:G.t,over:G.over,loser:G.loser}:null},
  unkick(i){if(P[i])P[i].bot=false},
  auto(i){if(G.over||G.cur!==i)return false;say(P[i].n+' tardó mucho: jugada automática');if(G.resp)setDir(i);botMove();return true},
  stop(){if(G){G.over=true;G.t=-1}}
};
globalThis.API=API;
