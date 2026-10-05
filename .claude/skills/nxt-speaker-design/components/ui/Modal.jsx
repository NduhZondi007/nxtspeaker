import React from 'react';
import { Icon } from './Icon.jsx';

/* Mirrors src/components/ui/Modal.tsx — ink/60 scrim with blur, 12px panel radius,
   Archivo black uppercase title, overshoot enter animation. */
const widths={sm:384,md:448,lg:512,xl:576,'2xl':672};

export function Modal({open=true,onClose,title,maxWidth='lg',children,style,...rest}){
  if(!open) return null;
  return (
    <div role="dialog" aria-modal="true" style={{position:'fixed',inset:0,zIndex:50,display:'flex',
      alignItems:'center',justifyContent:'center',padding:'var(--space-4)'}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'var(--overlay-scrim)',backdropFilter:'var(--blur-scrim)'}}/>
      <div {...rest} style={{position:'relative',width:'100%',maxWidth:widths[maxWidth],background:'#fff',
        borderRadius:'var(--radius-modal)',boxShadow:'var(--shadow-modal)',overflow:'hidden',
        animation:'modal-enter var(--dur-modal) var(--ease-overshoot)',...style}}>
        {title&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'var(--space-4) var(--space-6)',borderBottom:'1px solid var(--color-line)'}}>
          <h2 style={{margin:0,fontFamily:'var(--font-display)',fontWeight:'var(--weight-black)',
            fontSize:'var(--text-lg)',color:'var(--color-primary)',textTransform:'uppercase',
            letterSpacing:'var(--tracking-tight)'}}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{all:'unset',cursor:'pointer',padding:6,
            borderRadius:'var(--radius-md)',color:'var(--color-muted)',display:'flex'}}><Icon name="x" size={18}/></button>
        </div>}
        <div style={{overflowY:'auto',maxHeight:'85vh'}}>{children}</div>
      </div>
    </div>
  );
}
