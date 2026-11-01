'use strict';
// Cara de caca - servidor online (sin dependencias: solo Node.js 18+)
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const PORT=process.env.PORT||3000;
const ENGINE=fs.readFileSync(path.join(__dirname,'engine.js'),'utf8');
const GUID='258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/* ---------- HTTP ---------- */
const server=http.createServer((req,res)=>{
  if(req.url==='/health'){res.end('ok');return}
  fs.readFile(path.join(__dirname,'index.html'),(e,d)=>{
    if(e){res.writeHead(500);res.end('Falta index.html');return}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(d);
  });
});

/* ---------- WebSocket mínimo ---------- */
const conns=new Set();
class Conn{
  constructor(s){this.s=s;this.buf=Buffer.alloc(0);this.alive=true;conns.add(this);
    s.on('data',d=>{this.buf=Buffer.concat([this.buf,d]);this.parse()});
    s.on('close',()=>this.close());s.on('error',()=>this.close())}
  parse(){
    for(;;){
      const b=this.buf;if(b.length<2)return;
      let len=b[1]&127,o=2;
      if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);o=4}
      else if(len===127){this.close();return}
      const masked=(b[1]&128)!==0,need=o+(masked?4:0)+len;
      if(len>65536){this.close();return}
      if(b.length<need)return;
      let p=Buffer.from(b.slice(o+(masked?4:0),need));
      if(masked){const m=b.slice(o,o+4);for(let i=0;i<p.length;i++)p[i]^=m[i&3]}
      this.buf=b.slice(need);
      const op=b[0]&15;
      if(op===8){this.close();return}
      if(op===9){this.frame(10,p);continue}
      if(op===1){let m;try{m=JSON.parse(p.toString())}catch(e){continue}
        try{this.onmsg&&this.onmsg(m)}catch(e){console.error('error',e)}}
    }
  }
  frame(op,p){
    if(!this.alive)return;const n=p.length;let h;
    if(n<126)h=Buffer.from([0x80|op,n]);else{h=Buffer.alloc(4);h[0]=0x80|op;h[1]=126;h.writeUInt16BE(n,2)}
    try{this.s.write(Buffer.concat([h,p]))}catch(e){}
  }
  send(o){this.frame(1,Buffer.from(JSON.stringify(o)))}
  close(){if(!this.alive)return;this.alive=false;conns.delete(this);try{this.s.destroy()}catch(e){}this.onclose&&this.onclose()}
}
server.on('upgrade',(req,sock)=>{
  const k=req.headers['sec-websocket-key'];if(!k){sock.destroy();return}
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+
    crypto.createHash('sha1').update(k+GUID).digest('base64')+'\r\n\r\n');
  handle(new Conn(sock));
});
setInterval(()=>conns.forEach(c=>c.frame(9,Buffer.alloc(0))),25000);

/* ---------- Salas ---------- */
const rooms=new Map(),MAXP=6,MINP=3;
const clean=s=>String(s||'').replace(/[<>&"'`\\]/g,'').trim().slice(0,12)||'Jugador';
function newCode(){let c;do{c=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('')}while(rooms.has(c));return c}
function lobbyMsg(r,i){return{t:'lobby',code:r.code,seats:r.seats.map((s,k)=>({n:s.name,bot:s.bot,host:s===r.host})),you:i,host:r.seats[i]===r.host,diff:r.diff}}
function sendLobby(r){r.seats.forEach((s,i)=>s.c&&s.c.send(lobbyMsg(r,i)))}
function sync(r){if(!r.ctx||r.dead)return;r.seats.forEach((s,i)=>{if(s.c)s.c.send({t:'state',s:r.ctx.API.snap(i)})})}
function startGame(r){
  while(r.seats.length<MINP)r.seats.push({c:null,bot:true,name:'Bot '+(r.seats.filter(s=>s.bot).length+1)});
  const host={sync:()=>sync(r),fx:o=>r.seats.forEach(s=>s.c&&s.c.send({t:'fx',...o}))};
  const ctx=vm.createContext({HOST:host,setTimeout,Math,console});
  vm.runInContext(ENGINE,ctx);r.ctx=ctx;r.started=true;
  ctx.API.newGame(r.seats.map(s=>({name:s.name,bot:s.bot})),r.diff);
}
function leave(r,seat){
  const i=r.seats.indexOf(seat);if(i<0)return;seat.c=null;
  if(!r.started){
    r.seats.splice(i,1);
    if(!r.seats.some(s=>!s.bot)){rooms.delete(r.code);return}
    if(r.host===seat)r.host=r.seats.find(s=>!s.bot);
    sendLobby(r);return;
  }
  seat.bot=true;
  if(!r.seats.some(s=>s.c)){r.dead=true;r.ctx.API.stop();rooms.delete(r.code);return}
  if(r.host===seat)r.host=r.seats.find(s=>s.c);
  r.ctx.API.kick(i);
}
function handle(c){
  let r=null,seat=null;
  c.onclose=()=>{if(r&&seat)leave(r,seat)};
  c.onmsg=m=>{
    const err=t=>c.send({t:'err',m:t});
    if(!r){
      if(m.t==='create'){
        r={code:newCode(),seats:[],diff:'m',started:false,ctx:null,host:null};
        seat={c,bot:false,name:clean(m.name)};r.seats.push(seat);r.host=seat;rooms.set(r.code,r);sendLobby(r);
      }else if(m.t==='join'){
        const q=rooms.get(String(m.code||'').toUpperCase());
        if(!q)return err('No existe esa sala');
        if(q.started)return err('La partida ya empezó');
        if(q.seats.length>=MAXP)return err('La sala está llena');
        r=q;seat={c,bot:false,name:clean(m.name)};r.seats.push(seat);sendLobby(r);
      }
      return;
    }
    const i=r.seats.indexOf(seat),isHost=r.host===seat;
    if(!r.started){
      if(!isHost&&m.t!=='noop')return;
      if(m.t==='addbot'&&r.seats.length<MAXP){r.seats.push({c:null,bot:true,name:'Bot '+(r.seats.filter(s=>s.bot).length+1)});sendLobby(r)}
      else if(m.t==='rmbot'){for(let k=r.seats.length-1;k>0;k--)if(r.seats[k].bot){r.seats.splice(k,1);break}sendLobby(r)}
      else if(m.t==='diff'&&['f','m','d'].includes(m.d)){r.diff=m.d;sendLobby(r)}
      else if(m.t==='start')startGame(r);
      return;
    }
    const a=r.ctx.API,ids=Array.isArray(m.ids)?m.ids.filter(x=>Number.isInteger(x)).slice(0,30):[];
    switch(m.t){
      case 'play':a.play(i,ids);break;
      case 'zap':a.zap(i,ids);break;
      case 'blind':a.blind(i);break;
      case 'take':a.take(i);break;
      case 'down':if(Number.isInteger(m.k))a.down(i,m.k);break;
      case 'cede':a.cede(i);break;
      case 'again':
        if(!a.over())break;
        a.stop();r.started=false;r.ctx=null;
        r.seats=r.seats.filter(s=>s.c||s.name.startsWith('Bot '));
        r.seats.forEach(s=>{s.bot=!s.c});
        sendLobby(r);break;
    }
  };
}
server.listen(PORT,()=>console.log('Cara de caca en http://localhost:'+PORT));
