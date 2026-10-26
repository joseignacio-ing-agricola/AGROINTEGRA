import { SITE } from '../config.mjs';

export const COMMUNES = ['Petorca', 'La Ligua', 'Cabildo', 'Papudo', 'Zapallar', 'Otra comuna'];
const goals = new Set(['online', 'visita', 'mensual']);
const names = {online: 'Consulta online', visita: 'Visita técnica', mensual: 'Acompañamiento mensual'};
const rates = {online: [9990, 19990], visita: [29990, 49990], mensual: [99990, 179990]};
export const pesos = value => new Intl.NumberFormat('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value);

function clean(value, max) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max) : '';
}

export function validateInput(raw) {
  const errors = {};
  const rawArea = String(raw.area ?? '').trim();
  const data = {
    name: clean(raw.name,80), commune:clean(raw.commune,80), crop:clean(raw.crop,80),
    area: rawArea === '' ? null : Number(rawArea.replace(',','.')),
    goal:clean(raw.goal,20), concern:clean(raw.concern,600), urgency:clean(raw.urgency,30)
  };
  if (!COMMUNES.includes(data.commune)) errors.commune='Selecciona una comuna.';
  if (data.crop.length<2) errors.crop='Indica tu cultivo o actividad.';
  if (data.concern.length<10) errors.concern='Cuéntanos el problema en al menos diez caracteres.';
  if (data.area !== null && (!Number.isFinite(data.area)||data.area<=0||data.area>100000)) errors.area='Indica una superficie mayor a 0 y hasta 100.000 hectáreas, o deja este dato vacío.';
  if (data.goal && !goals.has(data.goal)) errors.goal='Selecciona una modalidad o deja este dato sin definir.';
  if (data.urgency && !['Esta semana','Durante el mes','Estoy planificando'].includes(data.urgency)) errors.urgency='Selecciona una opción de la lista.';
  return {data,errors,valid:Object.keys(errors).length===0};
}

export function recommend(data) {
  const hasArea=typeof data.area==='number'&&Number.isFinite(data.area)&&data.area>0;
  const afc=hasArea ? data.area<5 : null;
  const goal=goals.has(data.goal)?data.goal:'';
  if (!goal) return {goal:'',afc,name:'Consulta lista para coordinar',price:null,minPrice:null,maxPrice:null,unit:'',note:'José Ignacio revisará tu caso contigo para definir si conviene una consulta online, una visita o seguimiento.'};
  return {
    goal,afc,name:names[goal],price:hasArea ? rates[goal][afc?0:1] : null,
    minPrice:rates[goal][0],maxPrice:rates[goal][1],
    unit:{online:'consulta',visita:'visita',mensual:'mes'}[goal],
    note:!hasArea ? 'El tramo de precio depende de la superficie del predio. Puedes confirmarla al conversar.'
      : goal==='visita' ? 'La cobertura, el desplazamiento y la duración se confirman antes de reservar.'
      : goal==='mensual' ? 'Antes de contratar se acuerdan alcance, disponibilidad y condiciones del seguimiento.'
      : 'La duración, los antecedentes necesarios y el alcance se confirman antes de reservar.'
  };
}

export function priceLabel(plan) {
  if (plan.price!==null) return pesos(plan.price)+' / '+plan.unit;
  if (plan.minPrice!==null) return pesos(plan.minPrice)+'–'+pesos(plan.maxPrice)+' / '+plan.unit;
  return 'Modalidad y valor por confirmar';
}

export function attribution(search = '') {
  const params = new URLSearchParams(search);
  const safe = key => (params.get(key) || '').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60);
  return {source: safe('utm_source') || 'web', medium: safe('utm_medium') || 'organic', campaign: safe('utm_campaign') || 'consulta'};
}

export function summary(data,plan=recommend(data),source=attribution()) {
  return [
    'Hola José Ignacio, me interesa una asesoría de AgroIntegra.',
    '',...(data.name?['Nombre: '+data.name]:[]),'Comuna: '+data.commune,
    'Cultivo o actividad: '+data.crop,'Necesito: '+data.concern,
    ...(Number.isFinite(data.area)&&data.area>0?['Superficie: '+data.area+' ha']:[]),
    ...(data.urgency?['Cuándo: '+data.urgency]:[]),
    '', 'Modalidad de interés: '+(plan.goal?plan.name:'por definir contigo'),
    ...(plan.price!==null?['Valor publicado de referencia: '+pesos(plan.price)+' / '+plan.unit+(plan.afc?' (tramo menor a 5 ha)':'')]:[]),
    'Quisiera confirmar cobertura, alcance, valor final y disponibilidad.',
    '', 'Referencia: '+source.source+' / '+source.medium+' / '+source.campaign
  ].join('\n');
}

export function whatsappUrl(message) {
  const url = new URL('https://wa.me/' + SITE.phone);
  url.searchParams.set('text', message);
  return url.href;
}

export function campaignUrl(source, campaign = 'consulta') {
  const url = new URL(SITE.baseUrl);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium','organic');
  url.searchParams.set('utm_campaign',campaign);
  return url.href;
}
