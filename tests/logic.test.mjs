import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {validateInput,recommend,summary,whatsappUrl,attribution,campaignUrl,priceLabel,COMMUNES} from '../assets/logic.mjs';

const valid={name:'José',commune:'Petorca',crop:'Paltos',area:'2.5',goal:'visita',concern:'Quiero revisar el riego.',urgency:'Esta semana'};
test('Los datos incompletos no generan una recomendación válida',()=>{
 const checked=validateInput({});
 assert.equal(checked.valid,false);
 for(const field of ['commune','crop','concern'])assert.ok(checked.errors[field],field);
});
test('Superficie admite decimales y rechaza cero, negativos y valores no finitos',()=>{
 assert.equal(validateInput({...valid,area:'0,5'}).data.area,.5);
 for(const area of ['-1','0','Infinity','1e8','error'])assert.equal(validateInput({...valid,area}).valid,false,area);
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


test('Con tres datos se prepara una consulta sin inventar precio ni superficie',()=>{
 const checked=validateInput({commune:'Cabildo',crop:'Paltos',concern:'Quiero revisar mi cultivo.'});
 assert.equal(checked.valid,true);assert.equal(checked.data.area,null);
 const plan=recommend(checked.data);
 assert.equal(plan.price,null);assert.equal(plan.afc,null);
 assert.equal(priceLabel(plan),'Modalidad y valor por confirmar');
 const message=summary(checked.data,plan);
 assert.doesNotMatch(message,/undefined|NaN|null|0 ha|\$0/);
 assert.doesNotMatch(message,/Valor publicado de referencia/);
 assert.match(message,/por definir contigo/);
});
test('Modalidad conocida sin superficie muestra un rango',()=>{
 const checked=validateInput({commune:'Petorca',crop:'Frutales',concern:'Necesito revisar el riego.',goal:'visita'});
 const plan=recommend(checked.data);
 assert.equal(plan.price,null);assert.equal(plan.minPrice,29990);assert.equal(plan.maxPrice,49990);
 assert.match(priceLabel(plan),/29.990/);assert.match(priceLabel(plan),/49.990/);
});
test('La superficie por sí sola no selecciona un servicio',()=>{
 const plan=recommend({area:2,goal:''});assert.equal(plan.goal,'');assert.equal(plan.price,null);
});
test('El formulario inicial solo exige tres antecedentes',async()=>{
 const html=await readFile(path.join(root,'index.html'),'utf8');
 const form=html.slice(html.indexOf('<form id="lead-form"'),html.indexOf('</form>'));
 const tags=[...form.matchAll(/<(?:input|select|textarea)[^>]*>/g)].map(m=>m[0]);
 const required=tags.filter(t=>/\srequired(?:\s|>)/.test(t)).map(t=>t.match(/name="([^"]+)"/)[1]).sort();
 assert.deepEqual(required,['commune','concern','crop']);assert.ok(form.includes('<details id="optional-details"'));
});
test('Las imágenes son JPEG locales con enlaces de procedencia',async()=>{
 const source=JSON.parse(await readFile(path.join(root,'assets/instagram/sources.json'),'utf8'));
 assert.equal(source.items.length,3);
 for(const item of source.items){
  const data=await readFile(path.join(root,'assets/instagram',item.file));
  assert.equal(data[0],255);assert.equal(data[1],216);
  assert.ok(item.url.startsWith('https://www.instagram.com/agrointegra.consultores/p/'));
 }
});

test('Las opciones de comuna del HTML coinciden con las admitidas por la lógica',async()=>{
 const html=await readFile(path.join(root,'index.html'),'utf8');
 const select=html.match(/<select id="commune"[^>]*>([\s\S]*?)<\/select>/)[1];
 const options=[...select.matchAll(/<option(?:\s[^>]*)?>([^<]+)<\/option>/g)].slice(1).map(m=>m[1]);
 assert.deepEqual(options,COMMUNES);
});
