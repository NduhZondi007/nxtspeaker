import React from 'react';
import { Icon } from '../ui/Icon.jsx';

/* Mirrors src/components/layout/TopBar.tsx — sticky, 90% white with a 20px backdrop blur,
   hairline bottom border, Archivo bold uppercase title, trailing slot then the bell. */
export function TopBar({title,subtitle,children,style,...rest}){
  return (
    <header {...rest} style={{position:'sticky',top:0,zIndex:30,display:'flex',alignItems:'center',
      justifyContent:'space-between',gap:'var(--space-4)',padding:'var(--space-4) var(--space-6)',
      borderBottom:'1px solid var(--color-line)',background:'rgba(255,255,255,.9)',
      backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',...style}}>
      <div style={{minWidth:0}}>
        {title&&<h1 style={{margin:0,fontFamily:'var(--font-display)',fontWeight:'var(--weight-bold)',
          fontSize:'var(--text-2xl)',color:'var(--color-primary)',textTransform:'uppercase',
          letterSpacing:'var(--tracking-tight)',lineHeight:'var(--leading-tight)',
          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{title}</h1>}
        {subtitle&&<p style={{margin:'2px 0 0',fontSize:'var(--text-xs)',color:'var(--color-muted)'}}>{subtitle}</p>}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'var(--space-3)',flex:'0 0 auto'}}>
        {children}
        <button aria-label="Notifications" style={{all:'unset',cursor:'pointer',padding:8,
          borderRadius:'var(--radius-md)',color:'var(--color-muted)',display:'flex'}}>
          <Icon name="bell" size={18}/></button>
      </div>
    </header>
  );
}
