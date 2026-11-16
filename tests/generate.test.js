import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/generate.js';

const map={title:'Test',nodes:[{id:'a',label:'Offer',kind:'offer',description:'',owner:'',status:'live'}],edges:[],summary:'Done'};
const makeRequest=(provider,key,origin='https://example.test')=>new Request('https://example.test/api/generate',{method:'POST',headers:{origin,'content-type':'application/json',...(key?{'x-ai-key':key,'x-ai-provider':provider}:{})},body:JSON.stringify({prompt:'Make a map',mode:'new',graph:{title:'',nodes:[],edges:[]}})});

test('personal provider requests are routed and validated',async()=>{
  const oldFetch=globalThis.fetch;
  try {
    for(const provider of ['openai','claude','gemini']) {
      let call;
      globalThis.fetch=async (url,options)=>{call={url:String(url),options};const data=provider==='openai'?{choices:[{message:{content:JSON.stringify(map)}}]}:provider==='claude'?{content:[{type:'text',text:JSON.stringify(map)}]}:{candidates:[{content:{parts:[{text:JSON.stringify(map)}]}}]};return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});};
      const response=await handler(makeRequest(provider,'test-key'));
      assert.equal(response.status,200);assert.equal((await response.json()).nodes[0].status,'idea');
      const expected={openai:'api.openai.com',claude:'api.anthropic.com',gemini:'generativelanguage.googleapis.com'};
      assert.equal(new URL(call.url).hostname,expected[provider]);
      const headers=new Headers(call.options.headers);
      assert.equal(provider==='openai'?headers.get('authorization'):headers.get(provider==='claude'?'x-api-key':'x-goog-api-key'),provider==='openai'?'Bearer test-key':'test-key');
      const body=JSON.parse(call.options.body);
      assert.ok(provider==='openai'?body.response_format:provider==='claude'?body.output_config.format.schema:body.generationConfig.responseJsonSchema);
    }
  } finally {globalThis.fetch=oldFetch;}
});

test('rejects unauthenticated, cross-origin and unknown provider requests',async()=>{
  assert.equal((await handler(makeRequest('openai',null))).status,401);
  assert.equal((await handler(makeRequest('claude','test-key','https://other.test'))).status,403);
  assert.equal((await handler(makeRequest('other','test-key'))).status,400);
});

test('invalid provider output does not produce a map',async()=>{
  const oldFetch=globalThis.fetch;
  try {globalThis.fetch=async()=>new Response(JSON.stringify({content:[{type:'text',text:'{"title":"bad"}'}]}),{headers:{'content-type':'application/json'}});assert.equal((await handler(makeRequest('claude','test-key'))).status,502);} finally {globalThis.fetch=oldFetch;}
});
