// Opens a short-lived signed access link without printing credentials or URLs containing them.
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {ticket} from '../server/auth.js';
const access=JSON.parse(readFileSync(new URL('../.access.json',import.meta.url),'utf8'));
const server=http.createServer((req,res)=>{
  if(req.url!=='/open'){res.writeHead(404);return res.end();}
  res.writeHead(302,{'Location':`${access.url}/api/session?ticket=${ticket('launch',300,access.secret)}`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end();
});
server.listen(4187,'127.0.0.1',()=>{
  console.log('Prototype access launcher: http://127.0.0.1:4187/open (expires in 5 minutes)');
  if(!process.argv.includes('--no-open'))spawn('open',['-a','Google Chrome','http://127.0.0.1:4187/open'],{stdio:'ignore'});
});
setTimeout(()=>server.close(),300000).unref();
