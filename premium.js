/* Presentación: iconos SVG consistentes, sin sustitución de contenido funcional. */
(function(){
const vectors={"plan703":"<path d=\"M3 18h18M5 18l3-6 4 4 3-7 4 4\"/><circle cx=\"18\" cy=\"5\" r=\"2\"/>","inicio":"<rect x=\"3\" y=\"3\" width=\"7\" height=\"9\" rx=\"1\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"5\" rx=\"1\"/><rect x=\"14\" y=\"12\" width=\"7\" height=\"9\" rx=\"1\"/><rect x=\"3\" y=\"16\" width=\"7\" height=\"5\" rx=\"1\"/>","semana":"<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01\"/>","datos":"<path d=\"M3 12h4l3-8 4 16 3-8h4\"/>","temporada":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>","analitica":"<path d=\"M3 3v18h18M7 16l5-6 4 3 5-8\"/>","motor":"<path d=\"M12 18V5a3 3 0 0 0-6 0 4 4 0 0 0-2 7 4 4 0 0 0 2 7 3 3 0 0 0 6-1ZM12 18V5a3 3 0 0 1 6 0 4 4 0 0 1 2 7 4 4 0 0 1-2 7 3 3 0 0 1-6-1Z\"/>","ruta":"<path d=\"m3 20 6-10 4 5 3-4 5 9H3ZM9 10l2-4 3 5\"/>"};
Object.assign(vectors,{
  plan:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  rendimiento:'<path d="M3 19V5m0 14h18M6 15l5-6 4 3 5-7"/>',
  competencias:'<path d="M5 21V4m0 1c5-3 9 4 14 0v11c-5 4-9-3-14 0"/>',
  nutricion:'<path d="M12 20c-6 0-9-5-9-10 0-4 3-7 6-7 2 0 3 2 3 2s1-2 3-2c4 0 6 3 6 7 0 5-3 10-9 10Z"/><path d="M12 5c0-2 1-3 3-4"/>'
});
function apply(){
 document.querySelectorAll('.navbtn[data-v]').forEach(b=>{
 const slot=b.querySelector('.ni'),name=b.dataset.v;
 if(slot&&vectors[name]&&!slot.querySelector('svg')){
 slot.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+vectors[name]+'</svg>';
 }
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
