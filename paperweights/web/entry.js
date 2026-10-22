// Keep shared competitive URLs and the scenario selector usable as deep links.
// Households draws the village map; Rover keeps the Jezero contours.
const scenario=new URLSearchParams(location.search).get('scenario');
if(scenario==='sentences'){
 const url=new URL('sentences.html',location.href);url.search=location.search;location.replace(url);
}else{
 await import('./competitive.js');
 await import(scenario==='households'?'../../households/village-map.js':'./shared-map.js');
}
