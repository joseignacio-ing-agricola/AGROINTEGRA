import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {validateInput,recommend,summary,whatsappUrl,attribution,campaignUrl} from '../assets/logic.mjs';

const valid={name:'José',commune:'Petorca',crop:'Paltos',area:'2.5',goal:'visita',concern:'Quiero revisar el riego.',urgency:'Esta semana'};
test('Los datos incompletos no generan una recomendación válida',()=>{
 const checked=validateInput({});
 assert.equal(checked.valid,false);
 for(const field of ['name','commune','crop','area','goal','concern','urgency'])assert.ok(checked.errors[field],field);
});
test('Superficie admite decimales y rechaza cero, negativos y valores no finitos',()=>{
 assert.equal(validateInput({...valid,area:'0,5'}).data.area,.5);
 for(const area of ['','-1','0','Infinity','1e8','error'])assert.equal(validateInput({...valid,area}).valid,false,area);
});
test('El umbral menor a 5 ha se aplica a las tres modalidades',()=>{
 const expected={online:[9990,19990],visita:[29990,49990],mensual:[99990,179990]};
 for(const goal of Object.keys(expected)){
  assert.equal(recommend({goal,area:4.999}).price,expected[goal][0]);
  assert.equal(recommend({goal,area:5}).price,expected[goal][1]);
  assert.equal(recommend({goal,area:6}).afc,false);
 }
});
test('Valores manipulados y comunas desconocidas se rechazan',()=>{
 assert.equal(validateInput({...valid,goal:'gratis'}).valid,false);
 assert.equal(validateInput({...valid,commune:'<script>'}).valid,false);
 assert.equal(validateInput({...valid,urgency:'Ahora mismo'}).valid,false);
});
test('WhatsApp conserva tildes, saltos y símbolos sin modificar el destinatario',()=>{
 const data=validateInput({...valid,name:'José & Ana',concern:'Riego & cultivo #1: ¿podemos revisar?'}).data;
 const message=summary(data,recommend(data),attribution('?utm_source=guia&utm_campaign=riego'));
 const url=new URL(whatsappUrl(message));
 assert.equal(url.hostname,'wa.me');
 assert.equal(url.pathname,'/56971505118');
 assert.equal(url.searchParams.get('text'),message);
 assert.match(message,/José & Ana/);
 assert.match(message,/guia \/ organic \/ riego/);
 assert.match(message,/confirmar cobertura/);
});
test('La atribución limita longitud, caracteres y parámetros almacenados',()=>{
 const a=attribution('?utm_source=%3Cscript%3E&utm_medium=grupo&utm_campaign='+ 'a'.repeat(200)+'&email=privado');
 assert.equal(a.source,'script');
 assert.equal(a.campaign.length,60);
 assert.deepEqual(Object.keys(a),['source','medium','campaign']);
 assert.equal(attribution().source,'web');
});
test('Los enlaces de referido contienen etiquetas orgánicas',()=>{
 const url=new URL(campaignUrl('referido','productores'));
 assert.equal(url.searchParams.get('utm_source'),'referido');
 assert.equal(url.searchParams.get('utm_medium'),'organic');
});
const root=fileURLToPath(new URL('..',import.meta.url));
test('Los enlaces, anclas y recursos locales de todas las páginas existen',async()=>{
 const pages=(await readdir(root)).filter(p=>p.endsWith('.html'));
 for(const page of pages){
  const html=await readFile(path.join(root,page),'utf8');
  assert.match(html,/<html lang="es-CL"/,page);
  for(const [,value] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
   if(/^(?:https?:|mailto:|tel:|data:)/.test(value))continue;
   const u=new URL(value,'https://local.test/'+page);
   let file=decodeURIComponent(u.pathname).replace(/^\//,'');
   if(!file||file.endsWith('/'))file+='index.html';
   await stat(path.join(root,file));
   if(u.hash && file.endsWith('.html')){
    const target=await readFile(path.join(root,file),'utf8');
    assert.ok(target.includes('id="'+u.hash.slice(1)+'"'),page+' → '+value);
   }
  }
 }
});
test('Todos los sitemaps y referencias sociales señalan recursos publicados',async()=>{
 const xml=await readFile(path.join(root,'sitemap.xml'),'utf8');
 assert.equal((xml.match(/<url>/g)||[]).length,6);
 for(const [,url] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)){
  const name=new URL(url).pathname.replace('/AGROINTEGRA/','')||'index.html';
  await stat(path.join(root,name));
 }
 await stat(path.join(root,'assets/compartir.png'));
});
