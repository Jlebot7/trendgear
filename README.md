# TrendGear Dashboard — De la Data Sintética a la Web Funcional

Entregable del taller. Dashboard de analítica de clientes para **TrendGear** (tienda tecnológica ficticia), construido a partir de un dataset 100% sintético, siguiendo las tres fases de la guía metodológica: **ingeniería de datos → maquetación ágil → integración con Firebase**.

> ⚠️ Todos los datos de clientes son sintéticos (nombres, correos con dominio `example.com`, montos y fechas generados algorítmicamente). No contienen información real.

---

## 1. Estructura del proyecto

```
trendgear-dashboard/
├── index.html                     # Estructura (header / main / footer)
├── css/
│   └── styles.css                 # Estilos (arquitectura segregada)
├── js/
│   └── app.js                     # Fetch a Firebase + render + filtros + gráficos
├── data/
│   ├── paso1_muestra_cruda.psv     # Fase I - Paso 1: muestra inicial (con errores intencionales)
│   ├── paso2_muestra_limpia.psv    # Fase I - Paso 2: muestra limpia
│   ├── one_shot_prompt_dataset.txt # Fase I - Paso 3: prompt de one-shot usado para escalar el dataset
│   ├── trendgear_dataset.psv/.csv/.json      # 60 registros generados a partir del one-shot
│   ├── trendgear_full_dataset.psv/.csv/.json # Dataset FINAL (muestra + generados) = 66 registros
│   │                                          # el .json trae el envoltorio {"customers": {...}} -> importar en la RAIZ
│   ├── trendgear_customers_only.json         # mismo dataset SIN envoltorio -> importar dentro del nodo /customers
│   └── reporte_validacion.txt      # Fase I - Paso 4: salida del checklist de integridad
├── scripts/
│   ├── generate_dataset.py         # Implementa las reglas del one-shot prompt vía script
│   └── validate_dataset.py         # Automatiza el checklist de validación
└── README.md
```

---

## 2. Fase I — Ingeniería y modelado de datos

Se siguieron los 4 pasos exigidos por la guía:

| Paso | Qué se hizo | Archivo |
|---|---|---|
| 1. Crear muestra | 7 registros manuales en PSV (con inconsistencias reales a propósito: duplicado, mayúsculas mixtas, ciudad con coma, edad fuera de rango, fecha inconsistente) | `data/paso1_muestra_cruda.psv` |
| 2. Limpiar muestra | Se corrigieron duplicados, categorías normalizadas (Title Case) y rangos inválidos | `data/paso2_muestra_limpia.psv` |
| 3. One-shot prompting | Prompt único, sin iteración, para escalar la muestra a 60 registros nuevos | `data/one_shot_prompt_dataset.txt` (texto completo abajo) |
| 4. Revisión | Script que valida el checklist completo (números, fechas, categorías, unicidad, coherencia cruzada) | `scripts/validate_dataset.py` → `data/reporte_validacion.txt` |

Se usaron **PSV** (`|`) en lugar de CSV porque varios campos (ej. `Bogotá, D.C.`, `Cartagena, Bolívar`) contienen comas — exactamente el caso que la guía señala como razón para preferir PSV.

La guía ofrece dos rutas equivalentes para el paso 3 (escalar la muestra): pedírselo a una IA en un solo mensaje ("Archivo Directo"), o automatizarlo con un script de Python. Aquí se documentan **ambas**: el prompt de one-shot listo para usar contra cualquier modelo, y `scripts/generate_dataset.py`, que implementa exactamente las mismas 11 reglas del prompt para poder reproducir el dataset sin depender de una API externa.

### 📋 Prompt de one-shot — generación del dataset (Fase I, paso 3)

```text
Actúa como un generador de datasets sintéticos para un e-commerce de tecnología llamado TrendGear.

Te entrego una muestra ya limpia y validada en formato PSV (separador "|"), con 11 columnas:
Customer ID | Name | Email | Product Purchased | Purchase Date | Amount Spent ($) | Age | City | Payment Method | Last Login Date | Membership Status

MUESTRA:
[... 6 filas de la muestra limpia, ver data/paso2_muestra_limpia.psv ...]

Genera 60 registros ADICIONALES (no repitas los de la muestra) que respeten estas reglas sin excepción:
1. Customer ID: único, correlativo, con prefijo "TG-" (continúa desde TG-1007).
2. Name: nombres y apellidos hispanos verosímiles, sin repetir la combinación completa.
3. Email: minúsculas, formato nombre.apellido@example.com, coherente con el campo Name.
4. Product Purchased: solo productos de un catálogo tecnológico cerrado.
5. Purchase Date: formato ISO YYYY-MM-DD, ninguna fecha posterior a hoy.
6. Amount Spent ($): número entero >= 0, coherente con el precio real del producto en COP.
7. Age: entero entre 13 y 100.
8. City: solo de un catálogo cerrado de ciudades de Colombia.
9. Payment Method: normalizado en Title Case (Credit Card, Debit Card, PayPal, Bank Transfer, Cash).
10. Last Login Date: ISO, siempre igual o posterior a Purchase Date, sin fechas futuras.
11. Membership Status: normalizado en Title Case (Bronze, Silver, Gold, Platinum).

Entrega ÚNICAMENTE el resultado final en formato PSV, con la misma fila de encabezado,
sin explicaciones, sin texto adicional antes o después.
```

*(texto completo, sin truncar, en `data/one_shot_prompt_dataset.txt`)*

### ✅ Resultado de la validación (Paso 4)

```
Registros analizados: 66
IDs unicos: 66

Resultado: el dataset PASA las 6 verificaciones del checklist de integridad.
 - Numeros (Age 13-100, Amount Spent >= 0): OK
 - Fechas (ISO, Purchase <= Last Login, sin fechas futuras): OK
 - Categorias normalizadas (Payment Method, Membership Status): OK
 - Unicidad de Customer ID: OK
 - Coherencia cruzada (dominio de email, ciudad del catalogo): OK
```

Durante la primera corrida, el propio script detectó 2 inconsistencias reales de fecha en la muestra limpia (Purchase Date posterior a Last Login Date) — se corrigieron antes de congelar el dataset final. Esto es justamente lo que el paso de "Revisión" busca prevenir.

---

## 3. Fase II — Maquetación ágil (Priming + Meta-prompting + One-shot)

Siguiendo la guía, la conversación con la IA se estructuró en 3 momentos:

1. **Priming** — *"¿Puedes escribir código para un sitio web atractivo si te explico cómo quiero que se vea?"*
2. **Meta-prompting** — *"¿Cuál es el mejor formato para entregarte las instrucciones?"* → esto arrojó los 7 requisitos (estructura, colores, tipografía, navegación, interactividad, medios, responsive).
3. **One-shot** — con los 7 requisitos ya resueltos, se entregó **un único prompt** con toda la especificación para generar el código completo y segregado de una sola vez.

### 📋 Prompt de one-shot — generación de la interfaz (Fase II/III)

```text
Genera el código completo de un dashboard web para "TrendGear", una tienda tecnológica.
Entrégalo en 3 archivos independientes (HTML, CSS y JS separados, sin frameworks):

1. ESTRUCTURA: header (logo + navegación + estado de conexión), main (KPIs +
   panel de filtros/gráficos + tabla de clientes) y footer.
2. COLORES: fondo #1E1E1E, acento #007BFF, superficies un poco más claras que
   el fondo para tarjetas y tabla, colores distintos por nivel de membresía
   (Bronze/Silver/Gold/Platinum) para que se reconozcan de un vistazo.
3. TIPOGRAFÍA: Roboto para todo el texto; una variante monoespaciada para IDs,
   fechas y montos, de forma que los datos numéricos queden alineados.
4. NAVEGACIÓN: menú horizontal en escritorio que se convierte en menú tipo
   "hamburguesa" en móviles (breakpoint 720px).
5. INTERACTIVO: buscador por nombre/email, filtros por ciudad/membresía/método
   de pago, botón para limpiar filtros, hover en filas de la tabla.
6. MEDIOS: sin imágenes externas; usa 2 gráficos de barras en SVG generados
   por JS (distribución de membresías e histograma de edades).
7. RESPONSIVE: la tabla de 11 columnas debe convertirse en tarjetas apiladas
   en móvil (usar atributos data-label), no solo hacer scroll horizontal.

Para el JS: obtén los datos con fetch() desde una URL de Firebase Realtime
Database configurable en una constante al inicio del archivo; si esa URL no
está configurada o falla, haz fallback automático a un JSON local, mostrando
en el header si el dashboard está "Conectado a Firebase" o en "Modo
demostración". Recorre los datos con forEach y arma cada fila con un
template literal, sin tocar el DOM elemento por elemento.
```

Este es el prompt que reproduce exactamente la arquitectura de `index.html`, `css/styles.css` y `js/app.js` incluidos en este repositorio.

### Especificaciones de marca aplicadas

| Elemento | Valor |
|---|---|
| Fondo | `#1E1E1E` |
| Acento | `#007BFF` |
| Tipografía | Roboto (400/500/700/900) + Roboto Mono para datos |
| Navegación | Horizontal en desktop → hamburguesa en `≤720px` |
| Arquitectura | HTML / CSS / JS en archivos independientes |

---

## 4. Fase III — Integración con Firebase

`js/app.js` está listo para conectarse a un proyecto real de Firebase:

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/) y habilita **Realtime Database**.
2. Importa el dataset. Hay **2 archivos**, según dónde hagas clic en "Import JSON":
   - `data/trendgear_full_dataset.json` → clic derecho en la **raíz** de la base (trae el envoltorio `{ "customers": { "TG_1001": {...}, ... } }` y Firebase crea el nodo `customers` automáticamente).
   - `data/trendgear_customers_only.json` → clic derecho **ya dentro** del nodo `/customers` (sin envoltorio, directamente `{ "TG_1001": {...}, ... }`).

   Usar el archivo equivocado en el lugar equivocado duplica el nivel `customers` o lo ubica mal — si tras importar el dashboard carga datos "vacíos", es la primera causa a revisar.
3. Configura las reglas de lectura pública (solo para este entorno de pruebas):
   ```json
   { "rules": { ".read": true, ".write": false } }
   ```
4. En `js/app.js`, reemplaza la constante `CONFIG.FIREBASE_URL` por la URL real, terminada en `.json`:
   ```js
   FIREBASE_URL: "https://tu-proyecto-default-rtdb.firebaseio.com/customers.json"
   ```
5. Recarga `index.html` — el indicador junto al menú cambiará de 🟡 *"Modo demostración"* a 🟢 *"Conectado a Firebase"*.

Mientras no configures tu URL, el dashboard funciona igual de bien porque `app.js` hace **fallback automático** al dataset local (`data/trendgear_full_dataset.json`), así puedes revisarlo y presentarlo sin depender de credenciales.

**Protocolo de depuración asistida:** cualquier error de fetch queda registrado en la consola del navegador (`console.warn` / `console.error`) con el mensaje exacto de Firebase — cópialo junto con el fragmento de `loadCustomers()` si necesitas pedirle ayuda a una IA para resolverlo.

---

### ⚠️ Troubleshooting: "Archivo JSON no válido — las claves no pueden estar vacías ni contener `$#[]./`"

Firebase Realtime Database prohíbe esos caracteres en los **nombres de los campos**, no en los valores. La primera versión de este dataset usaba la columna `Amount Spent ($)` también como clave dentro del JSON, y el `$` la invalidaba. Se corrigió así:

- **CSV / PSV** (`data/trendgear_full_dataset.csv` / `.psv`): conservan el encabezado `Amount Spent ($)` tal como lo pide la guía — ahí no es una "clave" de objeto, es solo texto de columna, así que no hay problema.
- **JSON** (los 3 archivos en `data/`): el campo se renombró a `Amount Spent COP` (sin `$`). `js/app.js` ya lee ese nombre.
- Los IDs de nodo (`TG_1001`, etc.) usan guion bajo en vez de guion, aunque el guion en realidad sí está permitido por Firebase — se dejó así por consistencia con el resto de identificadores del proyecto.

Si en el futuro agregas un campo nuevo al dataset y lo vas a llevar a Firebase, evita `. $ # [ ] /` en su nombre de columna al momento de generar el JSON (sí puedes usarlos libremente en CSV/PSV).

## 5. Cómo ejecutar

No requiere build ni dependencias. Basta con servir la carpeta como archivos estáticos (abrir `index.html` directamente también funciona, aunque algunos navegadores restringen `fetch` a `file://`; se recomienda un servidor simple):

```bash
cd trendgear-dashboard
python3 -m http.server 8000
# abrir http://localhost:8000
```

Para regenerar o revalidar el dataset:

```bash
python3 scripts/generate_dataset.py     # Fase I, paso 3 (ruta script)
python3 scripts/validate_dataset.py     # Fase I, paso 4
```

---

## 6. Autoevaluación contra la rúbrica

| Criterio | Evidencia |
|---|---|
| Uso de técnicas de IA | Priming + Meta-prompting + One-shot documentados arriba, con los 2 prompts completos |
| Calidad del dataset | 4 pasos completos + validación automatizada sin errores (`data/reporte_validacion.txt`) |
| Maquetación | Estructura header/main/footer, paleta y tipografía especificadas, responsive con hamburguesa + tabla→tarjetas |
| Integración JS/Firebase | `fetch` a Realtime Database con fallback local, render por `forEach` + template literals, estados de carga/error/vacío |
