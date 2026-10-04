// Local development gateway. API credentials remain server-side; never in Pages or presets.
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildAIRequest,readAIResponse} from '../animals/design/AnimalDesignAI.js';
export function createAnimalAIServer({apiKey=process.env.OPENAI_API_KEY,model=process.env.ANIMAL_AI_MODEL,port=8787,fetchImpl=fetch,allowedOrigins=[]}={}){
 const root=fileURLToPath(new URL('../',import.meta.url)),origins=new Set([`http://127.0.0.1:${port}`,`http://localhost:${port}`,...allowedOrigins]);let active=false;
 return http.createServer(async(req,res)=>{
  const origin=req.headers.origin,isAPI=req.url?.startsWith('/api/');
  const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  if(isAPI&&origin&&!origins.has(origin)){json(403,{error:'Deze studio-origin is niet toegestaan op de AI-server.'});return;}
  if(isAPI&&origin)res.setHeader('Access-Control-Allow-Origin',origin);
  if(isAPI&&req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type'});res.end();return;}
  if(req.url==='/api/animal-design/status'){json(200,{configured:!!apiKey&&!!model});return;}
  if(req.url==='/api/animal-design'||req.url==='/api/animal-skin'){
   if(req.method!=='POST'){json(405,{error:'Gebruik POST.'});return;}
   if(!apiKey||!model){json(503,{error:'AI is nog niet aangesloten. Stel OPENAI_API_KEY en ANIMAL_AI_MODEL op de server in, of ontwerp via onze chat.'});return;}
   if(active){json(429,{error:'Er loopt al een AI-opdracht. Wacht tot deze klaar is.'});return;}
   let body;try{let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>20000000){json(413,{error:'Referenties zijn te groot.'});return;}chunks.push(chunk);}body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{json(400,{error:'Ongeldige JSON-opdracht.'});return;}
   const skin=req.url==='/api/animal-skin';let request;try{request=buildAIRequest(body,{model,skin});}catch(e){json(400,{error:e.message});return;}
   active=true;try{const response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(skin?230000:170000)});if(!response.ok){json(502,{error:`AI-dienst antwoordde met ${response.status}. Controleer de serverconfiguratie en API-toegang.`});return;}const data=await response.json();json(200,readAIResponse(data,{skin}));}catch(e){json(502,{error:e.name==='TimeoutError'?'AI-opdracht duurde te lang. Probeer een kleinere stap.':'AI-antwoord kon niet worden verwerkt. Probeer opnieuw met minder wijzigingen.'});}finally{active=false;}return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  // Serve project assets only; never expose credentials, git data, dependencies or server code.
  let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
  if(rel.split('/').some(p=>p.startsWith('.')||['node_modules','scripts','tests'].includes(p))){res.writeHead(404);res.end();return;}
  if(rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,'.'+rel);if(!file.startsWith(root+path.sep)){res.writeHead(404);res.end();return;}
  try{const content=await fs.readFile(file),ext=path.extname(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'})[ext]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:content);}catch{res.writeHead(404);res.end();}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.ANIMAL_AI_PORT)||8787,allowedOrigins=(process.env.ANIMAL_AI_ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);createAnimalAIServer({port,allowedOrigins}).listen(port,'127.0.0.1',()=>console.log(`Animal Studio: http://127.0.0.1:${port}/animal-studio/workbench.html · AI ${process.env.OPENAI_API_KEY&&process.env.ANIMAL_AI_MODEL?'configured':'not configured'}`));
}
