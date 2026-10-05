import React from 'react';

/* Wrapper for Lucide (the icon set the app uses via lucide-react). In this design system the
   same glyphs come from the Lucide UMD build loaded from CDN, so names match 1:1 with the
   codebase imports — <Icon name="calendar-check" /> is lucide-react's CalendarCheck. */
export function Icon({name,size=16,color='currentColor',strokeWidth=2,style,...rest}){
  const ref=React.useRef(null);
  React.useEffect(()=>{
    const el=ref.current; if(!el) return;
    const render=()=>{ if(window.lucide&&window.lucide.createIcons){ el.innerHTML='<i data-lucide="'+name+'"></i>';
      window.lucide.createIcons({nameAttr:'data-lucide',attrs:{width:size,height:size,stroke:color,'stroke-width':strokeWidth},root:el}); } };
    if(window.lucide) render(); else { const t=setInterval(()=>{if(window.lucide){render();clearInterval(t)}},60); return ()=>clearInterval(t); }
  },[name,size,color,strokeWidth]);
  return <span ref={ref} aria-hidden style={{display:'inline-flex',width:size,height:size,flex:'0 0 auto',...style}} {...rest}/>;
}
