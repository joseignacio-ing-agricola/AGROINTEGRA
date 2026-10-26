import {SITE} from '../config.mjs';
import {COMMUNES, attribution, recommend, pesos, summary, validateInput, whatsappUrl, campaignUrl} from './logic.mjs';

const $ = selector => document.querySelector(selector);
const emit = (name, detail = {}) => window.dispatchEvent(new CustomEvent('agrointegra:conversion', {detail:{event:name,...detail}}));
let origin = attribution(location.search);
try {
  if (new URLSearchParams(location.search).has('utm_source')) sessionStorage.setItem('agrointegra-source', JSON.stringify(origin));
  else {
    const saved = JSON.parse(sessionStorage.getItem('agrointegra-source') || 'null');
    if (saved && typeof saved.source === 'string') origin = attribution(new URLSearchParams({utm_source:saved.source,utm_medium:saved.medium||'organic',utm_campaign:saved.campaign||'consulta'}).toString());
  }
} catch { /* El flujo funciona con almacenamiento bloqueado. */ }

const themeButton = $('#theme-toggle');
if (themeButton) {
  const root = document.documentElement;
  let saved;
  try {saved = localStorage.getItem('agrointegra-theme');} catch {}
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
  const render = () => {
    themeButton.textContent = isDark() ? '☀' : '◐';
    themeButton.setAttribute('aria-label', isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  };
  themeButton.hidden = false;
  render();
  themeButton.addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try {localStorage.setItem('agrointegra-theme',root.dataset.theme);} catch {}
    render();
  });
}

const menuButton = $('#menu-toggle'), menu = $('#menu');
if (menuButton && menu) {
  const setMenu = open => {
    menu.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menuButton.textContent = open ? '×' : '☰';
  };
  menuButton.hidden = false;
  document.body.classList.add('nav-ready');
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => {if(e.key === 'Escape' && menu.classList.contains('open')) {setMenu(false);menuButton.focus();}});
}

document.querySelectorAll('[data-whatsapp]').forEach(link => {
  const commune = link.dataset.commune;
  link.href = whatsappUrl('Hola José Ignacio, me interesa una asesoría de AgroIntegra' + (commune ? ' en ' + commune : '') + '. Quisiera consultar modalidades y disponibilidad.\nReferencia: ' + origin.source + ' / ' + origin.medium + ' / ' + origin.campaign);
  link.target = '_blank'; link.rel = 'noopener noreferrer';
  link.addEventListener('click', () => emit('whatsapp_open',{placement:commune || 'directo'}));
});

const form = $('#lead-form'), result = $('#result');
let currentMessage = '';
if (form && result) {
  const status = $('#action-status');
  const prefill = new URLSearchParams(location.search).get('comuna');
  if (COMMUNES.includes(prefill)) form.elements.commune.value = prefill;
  document.querySelectorAll('[data-plan]').forEach(link => link.addEventListener('click', () => {form.hidden=false;result.hidden=true;form.elements.goal.value=link.dataset.plan;}));
  document.querySelectorAll('[data-topic]').forEach(link => link.addEventListener('click', () => {form.hidden=false;result.hidden=true;if(!form.elements.concern.value.trim())form.elements.concern.value=link.dataset.topic;}));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const checked = validateInput(Object.fromEntries(new FormData(form)));
    const errorBox = $('#form-errors');
    form.querySelectorAll('[aria-invalid]').forEach(el => {el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby');});
    form.querySelectorAll('.field-error').forEach(el => {el.textContent='';});
    if (!checked.valid) {
      errorBox.textContent = 'Revisa los campos señalados antes de continuar.';
      errorBox.hidden=false;
      for (const [key,message] of Object.entries(checked.errors)) {
        const field=form.elements[key];field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby',key+'-error');$('#'+key+'-error').textContent=message;
      }
      errorBox.focus();return;
    }
    errorBox.hidden=true;
    const plan=recommend(checked.data);
    currentMessage=summary(checked.data,plan,origin);
    $('#result-title').textContent=plan.name;
    $('#result-price').textContent=pesos(plan.price)+' / '+plan.unit;
    $('#result-note').textContent=plan.note;
    $('#message-preview').value=currentMessage;
    $('#send-whatsapp').href=whatsappUrl(currentMessage);
    form.hidden=true;result.hidden=false;status.textContent='';result.focus();
    emit('consulta_preparada',{modality:plan.goal,tier:plan.afc?'menor_5ha':'general',source:origin.source});
  });
  $('#edit-form').addEventListener('click',()=>{form.hidden=false;result.hidden=true;status.textContent='';form.elements.name.focus();});
  $('#send-whatsapp').addEventListener('click',()=>{status.textContent='Si WhatsApp se abrió, revisa el mensaje y pulsa Enviar allí. Abrir el enlace no confirma una reserva.';emit('whatsapp_open',{placement:'asistente'});});
  $('#copy-message').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(currentMessage);status.textContent='Mensaje copiado. Puedes pegarlo en WhatsApp.';}
    catch{$('#message-preview').focus();$('#message-preview').select();status.textContent='Seleccionamos el mensaje. Usa la opción Copiar de tu navegador.';}
  });
  $('#download-message').addEventListener('click',()=>{
    const blob=new Blob([currentMessage],{type:'text/plain;charset=utf-8'}), url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url;a.download='mi-consulta-agrointegra.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='Resumen preparado para descargar. No se envió la consulta.';
  });
}

const share=$('#share-site');
if(share){
  share.hidden=false;
  share.addEventListener('click',async()=>{
    const url=campaignUrl('referido','productores'), status=$('#share-status');
    try{
      if(navigator.share){await navigator.share({title:'AgroIntegra · Asesoría agrícola',text:'Una opción de apoyo técnico para tu campo.',url});status.textContent='';}
      else{await navigator.clipboard.writeText(url);status.textContent='Enlace copiado para compartir.';}
    }catch(error){
      if(error.name==='AbortError')return;
      const fallback=$('#share-fallback');fallback.hidden=false;fallback.value=url;fallback.focus();fallback.select();status.textContent='Copia este enlace para compartirlo.';
    }
  });
}
const printButton=$('#print-guide');
if(printButton){printButton.hidden=false;printButton.addEventListener('click',()=>window.print());}
const year=$('#year');if(year)year.textContent=String(new Date().getFullYear());
