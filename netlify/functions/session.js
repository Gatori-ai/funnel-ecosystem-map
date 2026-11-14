import {authorized,valid,sessionCookie} from '../../server/auth.js';
export default async req => {
  const url=new URL(req.url);
  const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
  if(url.searchParams.has('ticket')) {
    if(!valid(url.searchParams.get('ticket'),'launch')) return new Response('This access link expired. Open the prototype from your Mac again.',{status:401,headers});
    return new Response(null,{status:303,headers:{...headers,'Set-Cookie':sessionCookie(),Location:'/?opened=1'}});
  }
  return Response.json({authorized:authorized(req),configured:Boolean(process.env.OPENAI_API_KEY)},{headers});
};
export const config={path:'/api/session',method:'GET',rateLimit:{windowLimit:30,windowSize:60,aggregateBy:['ip','domain']}};
