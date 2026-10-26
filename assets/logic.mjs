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
  const data = {
    name: clean(raw.name, 80), commune: clean(raw.commune, 80),
    crop: clean(raw.crop, 80), area: Number(String(raw.area ?? '').replace(',','.')),
    goal: clean(raw.goal, 20), concern: clean(raw.concern, 600),
    urgency: clean(raw.urgency, 30)
  };
  if (data.name.length < 2) errors.name = 'Escribe tu nombre (al menos dos letras).';
  if (!COMMUNES.includes(data.commune)) errors.commune = 'Selecciona una comuna.';
  if (data.crop.length < 2) errors.crop = 'Indica tu cultivo o actividad.';
  if (!Number.isFinite(data.area) || data.area <= 0 || data.area > 100000) errors.area = 'Indica una superficie mayor a 0 y hasta 100.000 hectáreas.';
  if (!goals.has(data.goal)) errors.goal = 'Selecciona cómo te gustaría recibir apoyo.';
  if (data.concern.length < 10) errors.concern = 'Cuéntanos el problema en al menos diez caracteres.';
  if (!['Esta semana','Durante el mes','Estoy planificando'].includes(data.urgency)) errors.urgency = 'Selecciona cuándo necesitas apoyo.';
  return {data, errors, valid: Object.keys(errors).length === 0};
}

export function recommend(data) {
  const afc = data.area > 0 && data.area < 5;
  const goal = goals.has(data.goal) ? data.goal : 'online';
  return {
    goal, afc, name: names[goal], price: rates[goal][afc ? 0 : 1],
    unit: {online:'consulta',visita:'visita',mensual:'mes'}[goal],
    note: goal === 'visita' ? 'La cobertura, el desplazamiento y la duración se confirman antes de reservar.'
      : goal === 'mensual' ? 'Antes de contratar se acuerdan alcance, disponibilidad y condiciones del seguimiento.'
      : 'La duración, los antecedentes necesarios y el alcance se confirman antes de reservar.'
  };
}

export function attribution(search = '') {
  const params = new URLSearchParams(search);
  const safe = key => (params.get(key) || '').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60);
  return {source: safe('utm_source') || 'web', medium: safe('utm_medium') || 'organic', campaign: safe('utm_campaign') || 'consulta'};
}

export function summary(data, plan = recommend(data), source = attribution()) {
  return [
    'Hola José Ignacio, me interesa una asesoría de AgroIntegra.',
    '', 'Nombre: ' + data.name, 'Comuna: ' + data.commune,
    'Cultivo o actividad: ' + data.crop, 'Superficie: ' + data.area + ' ha',
    'Necesito: ' + data.concern, 'Cuándo: ' + data.urgency,
    '', 'Modalidad de interés: ' + plan.name,
    'Valor publicado de referencia: ' + pesos(plan.price) + ' / ' + plan.unit + (plan.afc ? ' (tramo menor a 5 ha)' : ''),
    'Quisiera confirmar cobertura, alcance, valor final y disponibilidad.',
    '', 'Referencia: ' + source.source + ' / ' + source.medium + ' / ' + source.campaign
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
