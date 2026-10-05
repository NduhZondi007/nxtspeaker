import React from 'react';

/* Two exports mirroring src/components/ui/Badge.tsx: the lavender Badge, and the
   booking-status badge with its six fixed statuses. */
export function Badge({children,style,...rest}){
  return <span {...rest} style={{display:'inline-flex',alignItems:'center',padding:'2px 8px',
    borderRadius:'var(--radius-pill)',fontFamily:'var(--font-mono)',fontSize:'var(--text-xs)',
    fontWeight:'var(--weight-medium)',textTransform:'uppercase',letterSpacing:'var(--tracking-wide)',
    background:'var(--color-support)',color:'var(--color-primary)',...style}}>{children}</span>;
}

const statusStyles={
  PENDING:{background:'rgba(98,157,171,.15)',color:'var(--color-secondary)',border:'1px solid rgba(98,157,171,.3)'},
  CONFIRMED:{background:'rgba(107,158,120,.15)',color:'var(--color-success)',border:'1px solid rgba(107,158,120,.3)'},
  DEPOSIT_PAID:{background:'rgba(3,30,87,.1)',color:'var(--color-primary)',border:'1px solid rgba(3,30,87,.2)'},
  COMPLETED:{background:'rgba(3,30,87,.2)',color:'var(--color-primary)',border:'1px solid rgba(3,30,87,.3)'},
  CANCELLED:{background:'rgba(196,122,106,.15)',color:'var(--color-danger)',border:'1px solid rgba(196,122,106,.3)'},
  DECLINED:{background:'rgba(154,161,176,.15)',color:'var(--color-muted)',border:'1px solid rgba(154,161,176,.3)'}
};
const statusLabels={PENDING:'Pending',CONFIRMED:'Confirmed',DEPOSIT_PAID:'Deposit Paid',
  COMPLETED:'Completed',CANCELLED:'Cancelled',DECLINED:'Declined'};

export function BookingStatusBadge({status='PENDING',style,...rest}){
  return <span {...rest} style={{display:'inline-flex',alignItems:'center',padding:'2px 10px',
    borderRadius:'var(--radius-pill)',fontFamily:'var(--font-mono)',fontSize:'var(--text-xs)',
    fontWeight:'var(--weight-semibold)',textTransform:'uppercase',letterSpacing:'var(--tracking-wide)',
    ...statusStyles[status],...style}}>{statusLabels[status]}</span>;
}
