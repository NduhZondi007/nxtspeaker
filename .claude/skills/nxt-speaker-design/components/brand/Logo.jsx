import React from 'react';

/* Renders the supplied NXT Speaker badge files. Never redraw or recolour the mark —
   pick the variant that matches the background. The 2026 badge pack contains circular
   badge lockups only; there is no horizontal lockup file, so `orientation="horizontal"`
   sets the badge beside a typographic NXT SPEAKER wordmark in Archivo 900. */
const files={
  navy:'logo-badge-navy.png',
  orange:'logo-badge-orange.png',
  white:'logo-badge-white.png',
  onNavy:'logo-badge-on-navy.jpg',
  onOrange:'logo-badge-on-orange.jpg'
};

export function Logo({variant='navy',size=44,orientation='badge',assetBase='assets',style,...rest}){
  const src=String(assetBase).replace(/\/$/,'')+'/'+files[variant];
  const onDark=variant==='white';
  return (
    <span {...rest} style={{display:'inline-flex',alignItems:'center',gap:'var(--space-3)',...style}}>
      <img src={src} alt="NXT Speaker" width={size} height={size}
        style={{display:'block',borderRadius:variant.indexOf('on')===0?'50%':0}}/>
      {orientation==='horizontal'&&
        <span style={{fontFamily:'var(--font-display)',fontWeight:'var(--weight-black)',
          fontSize:Math.round(size*0.4),lineHeight:1,letterSpacing:'var(--tracking-tight)',
          textTransform:'uppercase',color:onDark?'#fff':'var(--color-primary)'}}>NXT Speaker</span>}
    </span>
  );
}
