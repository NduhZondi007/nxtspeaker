import React from 'react';
import { Icon } from '../ui/Icon.jsx';

/* Mirrors src/components/speakers/SpeakerFilters.tsx — search + sort + Filters toggle,
   then an expandable panel of expertise chips (orange when selected), availability and
   format radios, and a ZAR fee range. */
export const ALL_EXPERTISE=['Leadership','AI','Digital Transformation','Sustainability','ESG',
  'Innovation','Future of Work','Neuroscience','High Performance','Strategy','Entrepreneurship','Change Management'];

const ctrl={padding:'10px 12px',fontSize:'var(--text-sm)',fontFamily:'var(--font-body)',
  borderRadius:'var(--radius-md)',background:'#fff',color:'var(--color-primary)',outline:'none',
  border:'1px solid var(--color-secondary)',transition:'all var(--dur-fast) ease'};
const legend={margin:'0 0 var(--space-2)',fontFamily:'var(--font-mono)',fontSize:'var(--text-xs)',
  fontWeight:'var(--weight-semibold)',color:'var(--color-primary)',textTransform:'uppercase',
  letterSpacing:'var(--tracking-wide)'};

function RadioRow({label,checked,onChange}){
  return <label style={{display:'flex',alignItems:'center',gap:'var(--space-2)',cursor:'pointer',marginBottom:6}}>
    <input type="radio" checked={checked} onChange={onChange} style={{accentColor:'#FF5700'}}/>
    <span style={{fontSize:'var(--text-sm)',color:'var(--color-primary)'}}>{label}</span>
  </label>;
}

export function SpeakerFilters({filters={},onChange,style,...rest}){
  const [open,setOpen]=React.useState(false);
  const f={search:'',expertise:[],available:null,format:'',minFee:0,maxFee:200000,sort:'rating_desc',...filters};
  const update=patch=>onChange&&onChange({...f,...patch});
  const active=f.search||f.expertise.length>0||f.available!==null||f.format||f.minFee>0||f.maxFee<200000;
  return (
    <div {...rest} style={{display:'flex',flexDirection:'column',gap:'var(--space-3)',...style}}>
      <div style={{display:'flex',gap:'var(--space-3)',flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:'1 1 260px',minWidth:0}}>
          <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',display:'flex',color:'var(--color-muted)'}}>
            <Icon name="search" size={16} color="var(--color-muted)"/></span>
          <input type="text" placeholder="Search speakers by name or topic..." value={f.search}
            onChange={e=>update({search:e.target.value})} style={{...ctrl,width:'100%',paddingLeft:36}}/>
        </div>
        <select value={f.sort} onChange={e=>update({sort:e.target.value})} style={{...ctrl,cursor:'pointer'}}>
          <option value="rating_desc">Top Rated</option>
          <option value="fee_asc">Fee: Low to High</option>
          <option value="fee_desc">Fee: High to Low</option>
          <option value="events_desc">Most Events</option>
        </select>
        <button onClick={()=>setOpen(!open)} style={{...ctrl,display:'inline-flex',alignItems:'center',
          gap:'var(--space-2)',cursor:'pointer',
          border:'1px solid '+(open?'var(--color-secondary)':'var(--color-line)'),
          background:open?'rgba(98,157,171,.1)':'#fff',
          color:open?'var(--color-secondary)':'var(--color-primary)'}}>
          <Icon name="sliders-horizontal" size={16}/>Filters
          {active&&<span style={{width:16,height:16,borderRadius:'50%',background:'var(--color-accent)',
            color:'#fff',fontSize:'var(--text-9)',fontWeight:'var(--weight-bold)',display:'flex',
            alignItems:'center',justifyContent:'center'}}>✓</span>}
        </button>
        {active&&<button onClick={()=>update({search:'',expertise:[],available:null,format:'',minFee:0,maxFee:200000,sort:'rating_desc'})}
          style={{...ctrl,display:'inline-flex',alignItems:'center',gap:4,cursor:'pointer',
            border:'1px solid var(--color-line)',color:'var(--color-muted)'}}>
          <Icon name="x" size={14}/>Clear</button>}
      </div>
      {open&&<div style={{background:'#fff',border:'1px solid var(--color-line)',borderRadius:'var(--radius-md)',
        padding:'var(--space-4)',animation:'slide-up .2s ease-out'}}>
        <p style={legend}>Expertise</p>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:'var(--space-4)'}}>
          {ALL_EXPERTISE.map(tag=>{const on=f.expertise.indexOf(tag)>=0;
            return <button key={tag} onClick={()=>update({expertise:on?f.expertise.filter(e=>e!==tag):[...f.expertise,tag]})}
              style={{padding:'4px 10px',fontSize:'var(--text-xs)',fontFamily:'var(--font-body)',
                borderRadius:'var(--radius-pill)',cursor:'pointer',transition:'all var(--dur-fast) ease',
                background:on?'var(--color-accent)':'transparent',color:on?'#fff':'var(--color-primary)',
                fontWeight:on?'var(--weight-semibold)':'var(--weight-regular)',
                border:'1px solid '+(on?'var(--color-accent)':'var(--color-line)')}}>{tag}</button>})}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'var(--space-4)'}}>
          <div>
            <p style={legend}>Availability</p>
            {[{label:'All',value:null},{label:'Available Now',value:true},{label:'Unavailable',value:false}]
              .map(o=><RadioRow key={String(o.value)} label={o.label} checked={f.available===o.value} onChange={()=>update({available:o.value})}/>)}
          </div>
          <div>
            <p style={legend}>Format</p>
            {[{label:'Any Format',value:''},{label:'In-Person',value:'in-person'},{label:'Virtual',value:'virtual'},{label:'Hybrid',value:'hybrid'}]
              .map(o=><RadioRow key={o.value} label={o.label} checked={f.format===o.value} onChange={()=>update({format:o.value})}/>)}
          </div>
          <div>
            <p style={legend}>Fee Range (ZAR)</p>
            <div style={{display:'flex',gap:'var(--space-2)',alignItems:'center'}}>
              <input type="number" placeholder="Min" value={f.minFee||''} onChange={e=>update({minFee:Number(e.target.value)||0})}
                style={{...ctrl,width:'100%',padding:'6px 8px',fontSize:'var(--text-xs)',border:'1px solid var(--color-line)'}}/>
              <span style={{color:'var(--color-muted)',fontSize:'var(--text-xs)'}}>–</span>
              <input type="number" placeholder="Max" value={f.maxFee===200000?'':f.maxFee} onChange={e=>update({maxFee:Number(e.target.value)||200000})}
                style={{...ctrl,width:'100%',padding:'6px 8px',fontSize:'var(--text-xs)',border:'1px solid var(--color-line)'}}/>
            </div>
          </div>
        </div>
      </div>}
    </div>
  );
}
