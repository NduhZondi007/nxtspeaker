import React from 'react';

/* Mirrors src/components/ui/Button.tsx. Radius is 3px on every size; `gold` is the
   historical name of the orange CTA variant and is kept for parity with the codebase. */
const variants={
  gold:{background:'var(--color-accent)',color:'#fff',fontWeight:'var(--weight-semibold)',border:'1px solid var(--color-accent)',boxShadow:'0 1px 2px rgba(3,30,87,.05)'},
  primary:{background:'var(--color-primary)',color:'#fff',fontWeight:'var(--weight-semibold)',border:'1px solid var(--color-primary)'},
  outline:{background:'#fff',color:'var(--color-primary)',fontWeight:'var(--weight-medium)',border:'1px solid var(--color-secondary)'},
  ghost:{background:'transparent',color:'var(--color-secondary)',fontWeight:'var(--weight-medium)',border:'1px solid transparent'},
  soft:{background:'var(--color-support)',color:'var(--color-primary)',fontWeight:'var(--weight-medium)',border:'1px solid transparent'},
  danger:{background:'var(--color-danger)',color:'#fff',fontWeight:'var(--weight-semibold)',border:'1px solid var(--color-danger)'}
};
const hovers={
  gold:{background:'var(--color-accent-hover)'},
  primary:{background:'var(--color-primary-hover)'},
  outline:{background:'var(--color-soft)'},
  ghost:{background:'var(--color-soft)',color:'var(--color-primary)'},
  soft:{background:'var(--color-support-hover)'},
  danger:{opacity:.9}
};
const sizes={
  sm:{padding:'6px 12px',fontSize:'var(--text-xs)'},
  md:{padding:'12px 22px',fontSize:'var(--text-sm)'},
  lg:{padding:'14px 32px',fontSize:'var(--text-base)'}
};

export function Button({variant='primary',size='md',loading=false,disabled=false,as='button',children,style,...rest}){
  const [hover,setHover]=React.useState(false);
  const off=disabled||loading;
  const Tag=as;
  const dis=variant==='gold'
    ?{background:'var(--color-accent-disabled)',color:'var(--color-accent-disabled-text)',borderColor:'var(--color-accent-disabled)'}
    :{opacity:.5};
  return (
    <Tag {...rest} disabled={Tag==='button'?off:undefined}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'var(--space-2)',
        fontFamily:'var(--font-body)',borderRadius:'var(--radius-button)',cursor:off?'not-allowed':'pointer',
        userSelect:'none',textDecoration:'none',transition:'all var(--dur-fast) ease',
        ...sizes[size],...variants[variant],...(hover&&!off?hovers[variant]:null),...(off?dis:null),...style}}>
      {loading&&<span style={{width:16,height:16,border:'2px solid currentColor',borderTopColor:'transparent',
        borderRadius:'50%',animation:'spin 1s linear infinite'}}/>}
      {children}
    </Tag>
  );
}
