const {SpeakerCard,Button,Badge,Icon}=window.NXTSpeakerDesignSystem_f20208;

const SPEAKERS=[
  {name:'Thabo Mokoena',title:'Rebuilding trust after a public failure',category:'Leadership',fee:'R85 000',location:'Johannesburg'},
  {name:'Naledi Khumalo',title:'What AI actually changes about your operating model',category:'AI',fee:'R120 000',location:'Cape Town'},
  {name:'Sipho Dlamini',title:'Designing products for the next billion users',category:'Innovation',fee:'R64 000',location:'Durban'},
  {name:'Zanele Mahlangu',title:'Decarbonising a business that still has to make money',category:'Sustainability',fee:'R95 000',location:'Pretoria'},
  {name:'Ayanda Nkosi',title:'High performance without the burnout theatre',category:'High Performance',fee:'R72 000',location:'Cape Town'},
  {name:'Kagiso Radebe',title:'Change management when nobody trusts the memo',category:'Change Management',fee:'R58 000',location:'Bloemfontein'}
];

function Eyebrow({children,tone}){
  return <span style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-2xs)',textTransform:'uppercase',
    letterSpacing:'var(--tracking-widest)',color:tone==='dark'?'var(--color-secondary)':'var(--color-secondary)'}}>{children}</span>;
}

function Featured({onNavigate,onOpen}){
  return (
    <section style={{background:'#fff',padding:'var(--space-24) 0'}}>
      <div style={{maxWidth:'var(--container-max)',margin:'0 auto',padding:'0 var(--gutter)'}}>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:'var(--space-8)',flexWrap:'wrap'}}>
          <div>
            <Eyebrow>Featured this month</Eyebrow>
            <h2 style={{margin:'var(--space-3) 0 0',font:'var(--type-h2)',color:'var(--color-primary)'}}>Speakers people rebook</h2>
          </div>
          <Button variant="ghost" onClick={()=>onNavigate('speakers')}>See all 184 →</Button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',
          gap:'var(--space-6)',marginTop:'var(--space-8)'}}>
          {SPEAKERS.slice(0,3).map(s=><SpeakerCard key={s.name} {...s} onBook={()=>onOpen(s)}/>)}
        </div>
      </div>
    </section>
  );
}

function HowItWorks(){
  const steps=[
    ['01','Search without a wall','Every profile shows the real fee in rand, formats, and past events. No "contact us for pricing".'],
    ['02','Send one brief','Tell the speaker about the audience, date and budget. It reaches them directly.'],
    ['03','Confirm and pay a deposit','Terms, hospitality rider and deposit are handled in the platform. Your event, your paperwork.']
  ];
  return (
    <section style={{background:'var(--color-soft)',padding:'var(--space-24) 0',borderTop:'1px solid var(--color-line)',borderBottom:'1px solid var(--color-line)'}}>
      <div style={{maxWidth:'var(--container-max)',margin:'0 auto',padding:'0 var(--gutter)'}}>
        <Eyebrow>How it works</Eyebrow>
        <h2 style={{margin:'var(--space-3) 0 var(--space-12)',font:'var(--type-h2)',color:'var(--color-primary)'}}>Brief once. Compare fast. Book direct.</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'var(--space-8)'}}>
          {steps.map(([n,t,d])=>
            <div key={n} style={{borderTop:'2px solid var(--color-secondary)',paddingTop:'var(--space-4)'}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-2xs)',letterSpacing:'var(--tracking-widest)',color:'var(--color-secondary)'}}>{n}</span>
              <h3 style={{margin:'var(--space-3) 0 var(--space-2)',fontFamily:'var(--font-display)',fontWeight:'var(--weight-extrabold)',
                fontSize:'var(--text-xl)',color:'var(--color-primary)',letterSpacing:'var(--tracking-tight)'}}>{t}</h3>
              <p style={{margin:0,font:'var(--type-small)',color:'var(--color-ink)',lineHeight:'var(--leading-body)'}}>{d}</p>
            </div>)}
        </div>
      </div>
    </section>
  );
}

function ForSpeakers({onNavigate}){
  return (
    <section style={{background:'#fff',padding:'var(--space-24) 0'}}>
      <div style={{maxWidth:'var(--container-max)',margin:'0 auto',padding:'0 var(--gutter)',
        display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'var(--space-16)',alignItems:'center'}}>
        <div>
          <Eyebrow>For speakers</Eyebrow>
          <h2 style={{margin:'var(--space-3) 0 var(--space-4)',font:'var(--type-h2)',color:'var(--color-primary)'}}>Own your calendar and your rate card</h2>
          <p style={{margin:'0 0 var(--space-6)',font:'var(--type-body)'}}>Set your own fee, publish your hospitality rider once, and get briefs that already match your topics and availability.</p>
          <div style={{display:'flex',gap:'var(--space-2)',flexWrap:'wrap',marginBottom:'var(--space-6)'}}>
            {['Your fee, published','Rider stored once','Direct client chat','Deposit tracking'].map(t=><Badge key={t}>{t}</Badge>)}
          </div>
          <Button variant="gold" onClick={()=>onNavigate('login')}>Apply to join</Button>
        </div>
        <div style={{background:'var(--color-primary)',borderRadius:'var(--radius-lg)',padding:'var(--space-8)'}}>
          {[['Average brief-to-confirm','6 days'],['Bookings kept by speaker','100%'],['Platform fee','Flat, published']].map(([l,v],i)=>
            <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',
              padding:'var(--space-4) 0',borderTop:i?'1px solid rgba(255,255,255,.12)':'none'}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-10)',textTransform:'uppercase',
                letterSpacing:'var(--tracking-label)',color:'var(--color-secondary)'}}>{l}</span>
              <span style={{fontFamily:'var(--font-display)',fontWeight:'var(--weight-black)',fontSize:'var(--text-xl)',color:'#fff'}}>{v}</span>
            </div>)}
        </div>
      </div>
    </section>
  );
}

function Footer(){
  const cols=[['Discover',['Browse speakers','Topics','Fee bands','Availability']],
    ['For speakers',['Apply to join','Hospitality riders','Earnings','Speaker terms']],
    ['Company',['About','Contact','Privacy','Terms']]];
  return (
    <footer style={{background:'var(--color-primary)',padding:'var(--space-16) 0 var(--space-8)'}}>
      <div style={{maxWidth:'var(--container-max)',margin:'0 auto',padding:'0 var(--gutter)',
        display:'grid',gridTemplateColumns:'2fr repeat(3,1fr)',gap:'var(--space-8)'}}>
        <div>
          <img src="../../assets/logo-badge-white.png" alt="NXT Speaker" width="48" height="48"/>
          <p style={{margin:'var(--space-4) 0 0',maxWidth:260,font:'var(--type-small)',color:'rgba(255,255,255,.6)'}}>
            South Africa's disruptive speaker booking platform.</p>
        </div>
        {cols.map(([h,items])=>
          <div key={h}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-10)',textTransform:'uppercase',
              letterSpacing:'var(--tracking-label)',color:'var(--color-secondary)',marginBottom:'var(--space-4)'}}>{h}</div>
            {items.map(i=><a key={i} href="#" onClick={e=>e.preventDefault()}
              style={{display:'block',marginBottom:8,font:'var(--type-small)',color:'rgba(255,255,255,.7)',
                textDecoration:'none',fontWeight:'var(--weight-regular)'}}>{i}</a>)}
          </div>)}
      </div>
      <div style={{maxWidth:'var(--container-max)',margin:'var(--space-12) auto 0',padding:'var(--space-6) var(--gutter) 0',
        borderTop:'1px solid rgba(255,255,255,.12)',display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:'var(--space-4)'}}>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-10)',color:'rgba(255,255,255,.4)'}}>© 2026 NXT SPEAKER (PTY) LTD</span>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-10)',color:'rgba(255,255,255,.4)'}}>MADE IN SOUTH AFRICA</span>
      </div>
    </footer>
  );
}
Object.assign(window,{Featured,HowItWorks,ForSpeakers,Footer,Eyebrow,SPEAKERS});
