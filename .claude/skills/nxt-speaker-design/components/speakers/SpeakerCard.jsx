import React from 'react';
import { Icon } from '../ui/Icon.jsx';

/* Mirrors src/components/speakers/SpeakerCard.tsx exactly: 4:3 image, lavender category chip,
   Archivo 900 uppercase name, one-line topic, footer with Space Mono teal fee + orange Book button.
   Hover lifts 3px and swaps to the teal glow shadow. */
export function SpeakerCard({name='Speaker',title,category='Speaker',fee,photo,location,onBook,style,...rest}){
  const [hover,setHover]=React.useState(false);
  return (
    <div {...rest} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{background:'#fff',border:'1px solid var(--color-line)',borderRadius:'var(--radius-card)',
        overflow:'hidden',cursor:'pointer',transition:'all var(--dur-base) ease',
        transform:hover?'translateY(var(--lift-card))':'none',
        boxShadow:hover?'var(--shadow-card-hover)':'var(--shadow-card)',...style}}>
      <div style={{position:'relative',width:'100%',aspectRatio:'4 / 3',background:'var(--color-soft)',overflow:'hidden'}}>
        {photo
          ?<img src={photo} alt={name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          :<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',
              background:'rgba(3,30,87,.1)'}}>
             <span style={{fontFamily:'var(--font-display)',fontWeight:'var(--weight-black)',fontSize:48,
               color:'rgba(3,30,87,.2)',textTransform:'uppercase'}}>{name.charAt(0)}</span>
           </div>}
        {location&&<div style={{position:'absolute',bottom:8,left:8,display:'flex',alignItems:'center',gap:4,
          padding:'2px 8px',background:'rgba(0,0,0,.4)',borderRadius:'var(--radius-pill)',backdropFilter:'blur(4px)'}}>
          <Icon name="map-pin" size={9} color="rgba(255,255,255,.8)"/>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-9)',color:'rgba(255,255,255,.9)'}}>{location}</span>
        </div>}
      </div>
      <div style={{padding:'var(--space-4)',display:'flex',flexDirection:'column',gap:'var(--space-2)'}}>
        <span style={{alignSelf:'flex-start',display:'inline-flex',alignItems:'center',padding:'2px 8px',
          borderRadius:'var(--radius-pill)',fontFamily:'var(--font-mono)',fontSize:'var(--text-10)',
          textTransform:'uppercase',letterSpacing:'var(--tracking-widest)',
          background:'var(--color-support)',color:'var(--color-primary)'}}>{category}</span>
        <h3 style={{margin:0,fontFamily:'var(--font-display)',fontWeight:'var(--weight-black)',
          fontSize:'var(--text-lg)',color:'var(--color-primary)',textTransform:'uppercase',
          letterSpacing:'var(--tracking-tight)',lineHeight:'var(--leading-tight)',
          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</h3>
        <p style={{margin:0,fontSize:'var(--text-sm)',color:'var(--color-ink)',lineHeight:'var(--leading-snug)',
          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{title}</p>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          paddingTop:'var(--space-3)',marginTop:'var(--space-1)',borderTop:'1px solid var(--color-line)'}}>
          <div>
            <p style={{margin:0,font:'var(--type-price)',color:'var(--color-secondary)'}}>{fee}</p>
            <p style={{margin:'2px 0 0',fontFamily:'var(--font-mono)',fontSize:'var(--text-9)',color:'var(--color-muted)'}}>per event</p>
          </div>
          <button onClick={e=>{e.stopPropagation();onBook&&onBook()}}
            style={{padding:'6px 12px',fontSize:'var(--text-xs)',fontWeight:'var(--weight-semibold)',
              fontFamily:'var(--font-body)',color:'#fff',background:'var(--color-accent)',border:'none',
              borderRadius:'var(--radius-button)',cursor:'pointer',transition:'background-color var(--dur-fast) ease'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--color-accent-hover)'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--color-accent)'}>Book</button>
        </div>
      </div>
    </div>
  );
}
