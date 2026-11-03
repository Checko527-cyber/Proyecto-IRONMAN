/* Presentación: iconos SVG consistentes, sin sustitución de contenido funcional. */
(function(){
const vectors={"inicio":"<rect x=\"3\" y=\"3\" width=\"7\" height=\"9\" rx=\"1\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"5\" rx=\"1\"/><rect x=\"14\" y=\"12\" width=\"7\" height=\"9\" rx=\"1\"/><rect x=\"3\" y=\"16\" width=\"7\" height=\"5\" rx=\"1\"/>","semana":"<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01\"/>","datos":"<path d=\"M3 12h4l3-8 4 16 3-8h4\"/>","analitica":"<path d=\"M3 3v18h18M7 16l5-6 4 3 5-8\"/>","motor":"<path d=\"M12 18V5a3 3 0 0 0-6 0 4 4 0 0 0-2 7 4 4 0 0 0 2 7 3 3 0 0 0 6-1ZM12 18V5a3 3 0 0 1 6 0 4 4 0 0 1 2 7 4 4 0 0 1-2 7 3 3 0 0 1-6-1Z\"/>","ruta":"<path d=\"m3 20 6-10 4 5 3-4 5 9H3ZM9 10l2-4 3 5\"/>"};
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
