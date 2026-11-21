// Catálogo de referencia de nutrición de resistencia comercializada en Colombia.
// Consulta de fichas oficiales y catálogos colombianos: 21/11/2026.
// Los portafolios locales no garantizan inventario en tiempo real ni todas las variantes.
// Porción = un sobre/gel/tableta según la ficha; null = dato no confirmado.
const colombia = 'https://wefuelco.com/collections/nutricion';
const x = (id,nombre,tipo,carbohidratosG,sodioMg,cafeinaMg,fuenteFabricante,fuenteColombia=colombia,nota='') => ({
  id,nombre,tipo,carbohidratosG,sodioMg,cafeinaMg,fuente:'Ficha del fabricante',
  fuenteFabricante,fuenteColombia,mercado:'Colombia · comercializador encontrado',
  disponibilidad:'por confirmar por producto, variante y fecha',
  verificadoFabricante:true,estimado:false,nota
});

export const PRODUCTOS_MERCADO_CO = Object.freeze([
  x('maurten-100','Maurten Gel 100','gel',25,null,0,'https://www.maurten.com/products/gel-100-box-us'),
  x('maurten-100-caf','Maurten Gel 100 CAF 100','gel',25,null,100,'https://www.maurten.com/es/products/gel-100-caf-100-box-us'),
  x('maurten-160','Maurten Gel 160','gel',40,null,0,'https://www.maurten.com/faq/general-product'),
  x('maurten-drink-320','Maurten Drink Mix 320','bebida',80,null,0,'https://www.maurten.com/faq/general-product'),
  x('sis-beta-gel','SiS Beta Fuel Gel','gel',40,null,0,'https://www.scienceinsport.com/shop-sis/all-products/beta-fuel-gel-pack'),
  x('never-c30','Neversecond C30 Gel','gel',30,200,0,'https://never2.com/products/c30-energy-gel-12ct-60ml','https://never2colombia.com/tiendas-autorizadas/'),
  x('never-c30-caf','Neversecond C30+ Caffeine Gel','gel',30,200,75,'https://never2.com/products/c30-energy-gel-caffeine-12ct-60ml','https://never2colombia.com/tiendas-autorizadas/'),
  x('precision-pf30','Precision Fuel PF 30 Gel','gel',30,null,0,'https://www.precisionhydration.com/us/en/products/pf-30-gel/'),
  x('precision-pf90','Precision Fuel PF 90 Gel','gel',90,null,0,'https://www.precisionhydration.com/collections/pf-energy-gels/'),
  x('precision-ph1000','Precision Hydration PH 1000 · una tableta en 500 ml','sales',0,500,0,'https://www.precisionhydration.com/performance-advice/hydration/precision-hydration-packaging/',colombia,
    'PH 1000 expresa 1.000 mg de sodio POR LITRO de mezcla. Una tableta para 500 ml aporta 500 mg.'),
  x('skratch-hydration','Skratch Labs Hydration Sport Drink Mix · una porción','bebida',20,400,0,'https://www.skratchlabs.com/products/hydration-sport-drink-mix',colombia,
    'Algunos sabores y presentaciones varían entre 19 y 20 g de carbohidratos; cotejar la bolsa.'),
  x('226-high-energy','226ERS High Energy Gel 76 g · versión base','gel',50,null,0,'https://www.226ers.com/en/products/high-energy-gel-76g-62291','https://wefuelco.com/collections/226ers',
    'No equiparar automáticamente con geles Cherry/Strawberry históricos del plan Cartagena.'),
  x('226-cherry-official','226ERS High Energy Gel CHERRY 76 g · cafeína','gel',50,null,160,'https://www.226ers.com/en/products/high-energy-gel-76g-62291','https://wefuelco.com/collections/226ers',
    'El Excel de Cartagena consigna 55 g CH; ficha actual del fabricante indica 50 g para el formato 76 g.'),
  // Productos reconocidos con formulaciones variables: se incluyen sin inventar números por sabor.
  {id:'gu-original',nombre:'GU Original Energy Gel · elegir sabor',tipo:'gel',carbohidratosG:null,sodioMg:null,cafeinaMg:null,
    fuente:'Ficha oficial · rango 21–23 g CH, 60–125 mg sodio según sabor',fuenteFabricante:'https://guenergy.com/products/energy-gel',fuenteColombia:colombia,
    mercado:'Colombia · marca listada',disponibilidad:'por confirmar',verificadoFabricante:false,estimado:false,
    nota:'La cafeína y el sodio cambian por sabor; no sumar valores de una variante a otra.'},
  {id:'hammer-gel',nombre:'Hammer Gel · elegir sabor',tipo:'gel',carbohidratosG:null,sodioMg:null,cafeinaMg:null,
    fuente:'Ficha oficial por sabor',fuenteFabricante:'https://hammernutrition.com/products/hammer-gel',fuenteColombia:null,
    mercado:'Disponibilidad en Colombia no corroborada',disponibilidad:'por confirmar',verificadoFabricante:false,estimado:false},
  {id:'huma-gel',nombre:'Huma Chia Energy Gel · elegir sabor',tipo:'gel',carbohidratosG:null,sodioMg:null,cafeinaMg:null,
    fuente:'Producto listado por distribuidor colombiano; ficha por sabor pendiente',fuenteFabricante:null,fuenteColombia:colombia,
    mercado:'Colombia · marca listada',disponibilidad:'por confirmar',verificadoFabricante:false,estimado:false},
  {id:'saltstick-caps',nombre:'SaltStick Electrolyte Caps · elegir presentación',tipo:'sales',carbohidratosG:null,sodioMg:null,cafeinaMg:null,
    fuente:'Catálogo colombiano; etiqueta precisa pendiente',fuenteFabricante:null,fuenteColombia:'https://wefuelco.com/',
    mercado:'Colombia · referencia listada',disponibilidad:'por confirmar',verificadoFabricante:false,estimado:false}
].map(p=>Object.freeze(p)));
