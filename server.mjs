import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = fileURLToPath(new URL('.', import.meta.url));
try { const env = await readFile(resolve(root, '.env'), 'utf8'); for (const line of env.split(/\r?\n/)) { const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['\"]|['\"]$/g, ''); } } catch {}
const dbPath = process.env.FRANCOIS_DB_PATH || resolve(root, 'data', 'francois.sqlite');
await mkdir(resolve(dbPath, '..'), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  correct INTEGER NOT NULL DEFAULT 0
);`);
const insertSession = db.prepare('INSERT INTO sessions (item_id,item_type,completed_at,correct) VALUES (?,?,?,?)');

const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml' };
const publicFiles = new Set(['/index.html','/app.js','/styles.css','/content/catalog.json','/Retrato intelectual na biblioteca azul.png']);
const send = (res, status, body, type='application/json; charset=utf-8') => { res.writeHead(status, {'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff'}); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
async function bodyJson(req) { let data=''; for await (const chunk of req) { data += chunk; if (data.length > 1_000_000) throw new Error('Payload excede 1 MB'); } return JSON.parse(data || '{}'); }

const server = createServer(async (req,res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/health' && req.method === 'GET') return send(res,200,{status:'ok',storage:'sqlite',chatConfigured:Boolean(process.env.OPENROUTER_API_KEY)});
  if (url.pathname === '/api/state' && req.method === 'GET') {
    const sessions=db.prepare('SELECT id,item_id AS itemId,item_type AS itemType,completed_at AS completedAt,correct FROM sessions ORDER BY id DESC LIMIT 500').all();
    return send(res,200,{sessions,chatConfigured:Boolean(process.env.OPENROUTER_API_KEY)});
  }
  if (url.pathname === '/api/session' && req.method === 'POST') {
    try { const b=await bodyJson(req); if (!/^([PMG]\d{3}|SARTRE-\d{2})$/.test(b.itemId||'') || !['poema','musica','gramatica','sartre'].includes(b.itemType)) return send(res,400,{error:'Etapa inválida.'});
      const correct=b.correct===true?1:0; const result=insertSession.run(b.itemId,b.itemType,new Date().toISOString(),correct); return send(res,201,{id:Number(result.lastInsertRowid),saved:true});
    } catch(e) { return send(res,400,{error:e.message}); }
  }
  if (url.pathname === '/api/chat' && req.method === 'POST') {
    if (!process.env.OPENROUTER_API_KEY) return send(res,503,{error:'Conversa indisponível: OPENROUTER_API_KEY não configurada no servidor.'});
    try { const b=await bodyJson(req); if (typeof b.message!=='string' || !b.message.trim() || b.message.length>4000) return send(res,400,{error:'Escreva uma mensagem de até 4.000 caracteres.'});
      const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENROUTER_API_KEY}`,'Content-Type':'application/json','HTTP-Referer':'http://localhost','X-Title':'Francois — Nomos Ludens'},body:JSON.stringify({model:process.env.OPENROUTER_MODEL||'openai/gpt-4o-mini',messages:[{role:'system',content:'Você é Kaline Française, interlocutora culta, afetuosa e elegante para estudo de francês. Ajude com semântica, pronúncia, gramática e interpretação. Não invente citações nem atribuições. Diferencie fato e interpretação. Responda no idioma do aluno, incluindo exemplos franceses curtos e originais.'},{role:'user',content:b.message}]})});
      const payload=await response.json().catch(()=>({})); if(!response.ok) return send(res,502,{error:`Provedor de IA respondeu HTTP ${response.status}.`});
      return send(res,200,{reply:payload.choices?.[0]?.message?.content||'O provedor retornou uma resposta vazia.'});
    } catch { return send(res,502,{error:'Não foi possível alcançar o provedor de IA.'}); }
  }
  if (url.pathname.startsWith('/api/')) return send(res,404,{error:'Rota não encontrada.'});
  let requested=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  if (!publicFiles.has(requested)) return send(res,404,'Not found','text/plain; charset=utf-8');
  const path=resolve(root,`.${normalize(requested)}`);
  if (!path.startsWith(root)) return send(res,403,'Forbidden','text/plain; charset=utf-8');
  try { const file=await readFile(path); res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','x-content-type-options':'nosniff'}); return res.end(file); }
  catch { return send(res,404,'Not found','text/plain; charset=utf-8'); }
});
const port=Number(process.env.PORT||4173);
server.listen(port,'127.0.0.1',()=>console.log(`François local: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{server.close(()=>{db.close();process.exit(0);});});
