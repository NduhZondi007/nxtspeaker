import React from 'react';
import { Icon } from './Icon.jsx';

/* Mirrors src/components/ui/Toast.tsx: white card, hairline border, 8px radius,
   bottom-right stack, lucide glyph tinted per type. Auto-dismiss is 4000ms in the app. */
const typeConfig={
  success:{icon:'check-circle',color:'var(--color-success)'},
  error:{icon:'x-circle',color:'var(--color-danger)'},
  warning:{icon:'alert-circle',color:'var(--color-accent)'},
  info:{icon:'info',color:'var(--color-secondary)'}
};

export function Toast({type='info',title,message,onDismiss,style,...rest}){
  const cfg=typeConfig[type];
  return (
    <div {...rest} role="status" style={{display:'flex',gap:'var(--space-3)',width:320,
      padding:'var(--space-4)',background:'#fff',border:'1px solid var(--color-line)',
      borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-toast)',
      animation:'toast-enter var(--dur-slide) var(--ease-out)',...style}}>
      <span style={{color:cfg.color,marginTop:2,display:'flex'}}><Icon name={cfg.icon} size={20} color={cfg.color}/></span>
      <div style={{flex:1,minWidth:0}}>
        <p style={{margin:0,fontSize:'var(--text-sm)',fontWeight:'var(--weight-semibold)',color:'var(--color-ink)'}}>{title}</p>
        {message&&<p style={{margin:'2px 0 0',fontSize:'var(--text-xs)',color:'var(--color-muted)'}}>{message}</p>}
      </div>
      {onDismiss&&<button onClick={onDismiss} aria-label="Dismiss" style={{all:'unset',cursor:'pointer',
        color:'var(--color-muted)',display:'flex',flex:'0 0 auto'}}><Icon name="x" size={16}/></button>}
    </div>
  );
}

export function ToastStack({toasts=[],onDismiss,style,...rest}){
  return <div {...rest} style={{position:'fixed',bottom:24,right:24,zIndex:100,display:'flex',
    flexDirection:'column',gap:'var(--space-3)',...style}}>
    {toasts.map(t=><Toast key={t.id} {...t} onDismiss={()=>onDismiss&&onDismiss(t.id)}/>)}
  </div>;
}
