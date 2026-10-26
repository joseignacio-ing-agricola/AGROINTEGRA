# AgroIntegra
Sitio estático para captar y ordenar consultas agrícolas a través de WhatsApp normal.

## Qué funciona sin servicios externos
- Página principal responsive, con modo claro/oscuro y navegación accesible.
- Asistente que organiza antecedentes, muestra modalidad y precio publicado, y prepara un mensaje.
- Tramo menor a 5 ha: consulta $9.990, visita $29.990, mensual $99.990. Desde 5 ha: $19.990, $49.990 y $179.990.
- Copiar o descargar el resumen y abrir WhatsApp con el texto listo.
- Referencia de origen (UTM) incluida en los mensajes para identificar consultas reales.
- Guía imprimible, páginas de Petorca, La Ligua y Cabildo, metadatos sociales y sitemap.
- Los campos del formulario permanecen en memoria del navegador. No hay base de clientes ni backend.

## Límite de WhatsApp normal
El visitante debe pulsar Enviar en WhatsApp y el consultor responde allí. Un enlace abierto no equivale a un mensaje enviado, una reserva ni una venta. No se implementan bots sobre WhatsApp Web ni envíos automáticos. El asistente no diagnostica problemas agronómicos ni prescribe tratamientos.

## Publicación en GitHub Pages
El sitio se sirve desde la raíz de la rama elegida en Settings → Pages, sin compilación. El archivo principal es index.html; AGROINTEGRA.html conserva el enlace anterior y traslada sus parámetros y ancla.
La base usada es https://joseignacio-ing-agricola.github.io/AGROINTEGRA/.
Si cambias de dominio, actualiza config.mjs, canonical/og:url/og:image en los HTML, robots.txt y sitemap.xml.
GitHub Pages solo lee robots.txt en la raíz del dominio: en un proyecto /AGROINTEGRA/ el archivo es una referencia; agrega la directiva Sitemap en el repositorio raíz de tu sitio de usuario si lo administras. Presenta sitemap.xml directamente en Search Console.

## Ejecutar localmente y comprobar
Requiere Node.js 20 o superior, sin instalar paquetes.
Desde la raíz: `node --test tests/logic.test.mjs`.
Para previsualizar sirve esta carpeta con cualquier servidor HTTP estático. Los módulos ES no se ejecutan correctamente al abrir index.html mediante file://.

## Mantenimiento
- config.mjs: teléfono, correo y URL base. Los datos públicos y metadatos HTML deben mantenerse sincronizados.
- assets/logic.mjs: validación, reglas de precios, mensajes y atribución.
- assets/app.mjs: interacción de la web. Ningún campo del cliente se inserta mediante innerHTML.
- assets/styles.css: diseño y variables de ambos temas.
- docs/CAPTACION_ORGANICA.md: enlaces y textos listos para difusión manual.

Los eventos agrointegra:conversion son eventos del navegador sin datos del formulario; no se envían ni acumulan en un servicio de analítica. No confundir un clic con una conversión real. Cuenta consultas recibidas, reuniones acordadas y clientes contratados.

No hay claves, píxeles publicitarios, formularios de terceros ni servicios de pago configurados. La ilustración, el icono y la imagen social fueron creados para este sitio; los testimonios anteriores permanecen únicamente en el historial Git.

## Instagram
Las tres imágenes proceden de @agrointegra.consultores, incorporadas por solicitud del titular. Las publicaciones originales se enlazan en la galería. Su procedencia y las etiquetas observadas se conservan en assets/instagram/sources.json. No se presentan como casos de éxito o retratos del consultor.
El formulario solo exige comuna, cultivo y motivo. Nombre, superficie, modalidad y plazo son opcionales. Si faltan datos de precio, se muestra un rango o se deja el valor por confirmar.
