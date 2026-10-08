/** Original vector category illustrations; no product-pack or brand imagery implied. */
export function foodIcon(category) {
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 80 80'); svg.setAttribute('width', '66'); svg.setAttribute('height', '66'); svg.setAttribute('aria-hidden', 'true');
  const shapes = {
    milk: [['path', {d:'M25 25L31 13H48L55 25V66H25Z',fill:'#fafcf7'}],['path',{d:'M25 25H55M31 13L38 25V66',fill:'none'}],['path',{d:'M38 37H55V53H38Z',fill:'#7b9e72'}]],
    pasta: [['rect',{x:20,y:12,width:40,height:57,rx:8,fill:'#ecd291'}],['rect',{x:27,y:24,width:26,height:30,rx:4,fill:'#fbf6df'}],['path',{d:'M32 29L40 47M39 29L47 47M29 40L43 33',fill:'none',stroke:'#b88f4d'}]],
    tomatoes: [['circle',{cx:40,cy:44,r:23,fill:'#c9694f'}],['path',{d:'M39 12L42 28M26 26L39 29L53 24L46 36L35 34Z',fill:'#6b8d53'}],['path',{d:'M26 43Q26 34 32 34',fill:'none',stroke:'#eb9d79'}]],
    water: [['path',{d:'M33 12H47V24L53 32V64Q53 69 47 69H33Q27 69 27 64V32L33 24Z',fill:'#d9e9ed'}],['path',{d:'M33 12H47V20H33Z',fill:'#7b97b5'}],['path',{d:'M27 42H53V56H27Z',fill:'#95b8c6'}]],
    eggs: [['ellipse',{cx:40,cy:42,rx:20,ry:27,fill:'#e7cfac'}]],
    oats: [['path',{d:'M20 36H60L54 64H26Z',fill:'#d9c6a0'}],['path',{d:'M40 17V42M31 20L40 29L49 20M31 30L40 39L49 30',fill:'none',stroke:'#a99056'}]]
  };
  for (const [tag, attrs] of shapes[category] ?? shapes.oats) { const shape = document.createElementNS(ns, tag); shape.setAttribute('stroke','#33594d'); shape.setAttribute('stroke-width','2.5'); shape.setAttribute('stroke-linejoin','round'); for (const [key,value] of Object.entries(attrs)) shape.setAttribute(key,String(value)); svg.append(shape); }
  return svg;
}
