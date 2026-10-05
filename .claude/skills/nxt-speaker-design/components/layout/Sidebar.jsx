import React from 'react';
import { Icon } from '../ui/Icon.jsx';
import { Logo } from '../brand/Logo.jsx';

/* Mirrors src/components/layout/Sidebar.tsx: 256px navy column, white logo at the top over a
   white/10 rule, Space Mono portal label in teal/70, nav rows at 4px radius where the active
   row is white/10 with a 2px orange left border, and a user + Sign Out block at the foot. */
export const clientNav=[
  {label:'Dashboard',href:'/client/dashboard',icon:'layout-dashboard'},
  {label:'Find Speakers',href:'/client/discover',icon:'search'},
  {label:'My Bookings',href:'/client/bookings',icon:'calendar-check'}
];
export const speakerNav=[
  {label:'Dashboard',href:'/speaker/dashboard',icon:'layout-dashboard'},
  {label:'My Bookings',href:'/speaker/bookings',icon:'calendar-check'},
  {label:'My Profile',href:'/speaker/profile',icon:'user'},
  {label:'Hospitality Rider',href:'/speaker/rider',icon:'utensils'},
  {label:'Earnings',href:'/speaker/earnings',icon:'dollar-sign'}
];
export const adminNav=[
  {label:'Dashboard',href:'/admin/dashboard',icon:'layout-dashboard'},
  {label:'Users',href:'/admin/users',icon:'users-2'},
  {label:'Bookings',href:'/admin/bookings',icon:'calendar-check'},
  {label:'Speakers',href:'/admin/speakers',icon:'search'}
];
const portalLabels={CLIENT:'Client Portal',SPEAKER:'Speaker Portal',ADMIN:'Admin Portal'};
const navFor={CLIENT:clientNav,SPEAKER:speakerNav,ADMIN:adminNav};

export function Sidebar({role='CLIENT',userName='User',active,onNavigate,assetBase='assets',style,...rest}){
  const items=navFor[role]||clientNav;
  return (
    <aside {...rest} style={{width:256,flex:'0 0 256px',display:'flex',flexDirection:'column',
      background:'#031E57',minHeight:0,...style}}>
      <div style={{padding:'var(--space-6)',borderBottom:'1px solid rgba(255,255,255,.1)'}}>
        <Logo variant="white" size={32} orientation="horizontal" assetBase={assetBase}/>
      </div>
      <div style={{padding:'var(--space-4) var(--space-6) var(--space-2)',display:'flex',alignItems:'center',gap:'var(--space-2)'}}>
        {role==='ADMIN'&&<Icon name="shield-check" size={10} color="rgba(98,157,171,.7)"/>}
        <span style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-10)',fontWeight:'var(--weight-semibold)',
          textTransform:'uppercase',letterSpacing:'var(--tracking-widest)',color:'rgba(98,157,171,.7)'}}>{portalLabels[role]}</span>
      </div>
      <nav style={{flex:1,padding:'var(--space-2) var(--space-3)',display:'flex',flexDirection:'column',gap:2,overflowY:'auto'}}>
        {items.map(it=>{const on=active===it.href;
          return <a key={it.href} href={it.href}
            onClick={e=>{if(onNavigate){e.preventDefault();onNavigate(it.href)}}}
            style={{display:'flex',alignItems:'center',gap:'var(--space-3)',padding:'10px 12px 10px 10px',
              borderRadius:'var(--radius-md)',fontSize:'var(--text-sm)',fontWeight:'var(--weight-medium)',
              fontFamily:'var(--font-body)',textDecoration:'none',transition:'all var(--dur-fast) ease',
              borderLeft:'2px solid '+(on?'var(--color-accent)':'transparent'),
              background:on?'rgba(255,255,255,.1)':'transparent',
              color:on?'#fff':'rgba(255,255,255,.6)'}}>
            <Icon name={it.icon} size={16}/>
            <span>{it.label}</span>
          </a>;})}
      </nav>
      <div style={{padding:'var(--space-4)',borderTop:'1px solid rgba(255,255,255,.1)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'var(--space-3)',marginBottom:'var(--space-3)'}}>
          <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(98,157,171,.2)',
            display:'flex',alignItems:'center',justifyContent:'center',flex:'0 0 auto'}}>
            <span style={{fontSize:'var(--text-xs)',fontWeight:'var(--weight-bold)',color:'var(--color-secondary)'}}>{userName.charAt(0).toUpperCase()}</span>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:0,fontSize:'var(--text-xs)',fontWeight:'var(--weight-semibold)',color:'#fff',
              whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{userName}</p>
            <p style={{margin:0,fontSize:'var(--text-10)',color:'rgba(255,255,255,.4)',textTransform:'capitalize'}}>{role.toLowerCase()}</p>
          </div>
        </div>
        <button style={{display:'flex',alignItems:'center',gap:'var(--space-2)',width:'100%',
          padding:'8px 12px',fontSize:'var(--text-xs)',fontFamily:'var(--font-body)',
          color:'rgba(255,255,255,.5)',background:'transparent',border:'none',
          borderRadius:'var(--radius-md)',cursor:'pointer'}}>
          <Icon name="log-out" size={14}/>Sign Out
        </button>
      </div>
    </aside>
  );
}
