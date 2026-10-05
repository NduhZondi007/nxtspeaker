const {TopBar,Button,Icon,BookingStatusBadge,SpeakerCard,SpeakerFilters,Modal,Input,Textarea,Select,Badge}=window.NXTSpeakerDesignSystem_f20208;

const SPEAKERS=[
  {id:'1',name:'Thabo Mokoena',title:'Rebuilding trust after a public failure',category:'Leadership',fee:'R85 000',location:'Johannesburg'},
  {id:'2',name:'Naledi Khumalo',title:'What AI actually changes about your operating model',category:'AI',fee:'R120 000',location:'Cape Town'},
  {id:'3',name:'Sipho Dlamini',title:'Designing products for the next billion users',category:'Innovation',fee:'R64 000',location:'Durban'},
  {id:'4',name:'Zanele Mahlangu',title:'Decarbonising a business that still has to make money',category:'Sustainability',fee:'R95 000',location:'Pretoria'},
  {id:'5',name:'Ayanda Nkosi',title:'High performance without the burnout theatre',category:'High Performance',fee:'R72 000',location:'Cape Town'},
  {id:'6',name:'Kagiso Radebe',title:'Change management when nobody trusts the memo',category:'Change Management',fee:'R58 000',location:'Bloemfontein'},
  {id:'7',name:'Refilwe Botha',title:'ESG reporting that survives an audit',category:'ESG',fee:'R78 000',location:'Sandton'},
  {id:'8',name:'Bongani Sithole',title:'The neuroscience of decisions under pressure',category:'Neuroscience',fee:'R110 000',location:'Cape Town'}
];

const BOOKINGS=[
  {id:'b1',event:'Annual Leadership Summit',speaker:'Thabo Mokoena',date:'12/11/2026',fee:'R85 000',status:'DEPOSIT_PAID'},
  {id:'b2',event:'Tech All-Hands Q4',speaker:'Naledi Khumalo',date:'03/12/2026',fee:'R120 000',status:'PENDING'},
  {id:'b3',event:'Sustainability Forum',speaker:'Zanele Mahlangu',date:'18/09/2026',fee:'R95 000',status:'CONFIRMED'},
  {id:'b4',event:'Product Offsite',speaker:'Sipho Dlamini',date:'02/07/2026',fee:'R64 000',status:'COMPLETED'},
  {id:'b5',event:'Sales Kickoff',speaker:'Ayanda Nkosi',date:'21/05/2026',fee:'R72 000',status:'CANCELLED'}
];

const card={background:'#fff',border:'1px solid var(--color-line)',borderRadius:'12px'};
const cardH2={margin:0,fontFamily:'var(--font-display)',fontWeight:'var(--weight-bold)',fontSize:'var(--text-lg)',color:'var(--color-primary)'};

function Dashboard({onNavigate}){
  const stats=[['Active Bookings','3','calendar-check','#FF5700'],['Events Completed','1','trending-up','#629DAB'],
    ['Total Spent','R64 000','dollar-sign','#031E57'],['Speakers Available','184','search','#629DAB']];
  return <div>
    <TopBar title="Good afternoon, Lerato" subtitle="Here's what's happening with your bookings"/>
    <div style={{padding:'var(--space-6)',display:'flex',flexDirection:'column',gap:'var(--space-8)'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'var(--space-4)'}}>
        {stats.map(([label,value,icon,color])=>
          <div key={label} style={{background:'#fff',border:'1px solid var(--color-line)',
            borderTop:'2px solid '+color,borderRadius:'var(--radius-card)',padding:'var(--space-4) 20px 18px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'var(--space-3)'}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-10)',textTransform:'uppercase',
                letterSpacing:'var(--tracking-label)',color:'var(--color-secondary)'}}>{label}</span>
              <span style={{width:26,height:26,borderRadius:'var(--radius-md)',flex:'0 0 auto',
                display:'flex',alignItems:'center',justifyContent:'center',background:'var(--color-soft)'}}>
                <Icon name={icon} size={14} color={color}/></span>
            </div>
            <p style={{margin:'14px 0 0',fontFamily:'var(--font-display)',fontWeight:'var(--weight-black)',
              fontSize:'var(--text-3xl)',lineHeight:'var(--leading-none)',letterSpacing:'var(--tracking-tight)',
              color:'var(--color-primary)'}}>{value}</p>
          </div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,2fr) minmax(0,1fr)',gap:'var(--space-6)',alignItems:'start'}}>
        <div style={{...card,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'var(--space-4) 20px',borderBottom:'1px solid var(--color-line)'}}>
            <h2 style={cardH2}>Recent Bookings</h2>
            <Button variant="ghost" size="sm" onClick={()=>onNavigate('/client/bookings')}>View all</Button>
          </div>
          {BOOKINGS.slice(0,4).map((b,i)=>
            <div key={b.id} style={{display:'flex',alignItems:'center',gap:'var(--space-4)',
              padding:'14px 20px',borderTop:i?'1px solid var(--color-line)':'none'}}>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:'var(--text-sm)',fontWeight:'var(--weight-semibold)',color:'var(--color-ink)'}}>{b.event}</p>
                <p style={{margin:'2px 0 0',fontSize:'var(--text-xs)',color:'var(--color-muted)'}}>{b.speaker} · {b.date}</p>
              </div>
              <div style={{textAlign:'right',flex:'0 0 auto'}}>
                <BookingStatusBadge status={b.status}/>
                <p style={{margin:'4px 0 0',fontFamily:'var(--font-mono)',fontSize:'var(--text-xs)',
                  fontWeight:'var(--weight-bold)',color:'var(--color-secondary)'}}>{b.fee}</p>
              </div>
            </div>)}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'var(--space-4)'}}>
          <div style={{...card,padding:20}}>
            <h2 style={{...cardH2,marginBottom:'var(--space-4)'}}>Quick Actions</h2>
            <div style={{display:'flex',flexDirection:'column',gap:'var(--space-2)'}}>
              <Button variant="gold" onClick={()=>onNavigate('/client/discover')} style={{width:'100%',justifyContent:'flex-start',gap:12}}>
                <Icon name="search" size={16}/> Find Speakers</Button>
              <Button variant="outline" onClick={()=>onNavigate('/client/bookings')} style={{width:'100%',justifyContent:'flex-start',gap:12}}>
                <Icon name="calendar-check" size={16}/> View Bookings</Button>
            </div>
          </div>
          <div style={{...card,overflow:'hidden'}}>
            <div style={{padding:'var(--space-4) 20px',borderBottom:'1px solid var(--color-line)'}}>
              <h2 style={cardH2}>Top Speakers</h2></div>
            {SPEAKERS.slice(0,3).map((s,i)=>
              <div key={s.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',
                borderTop:i?'1px solid var(--color-line)':'none'}}>
                <div style={{width:36,height:36,borderRadius:6,background:'rgba(98,157,171,.2)',display:'flex',
                  alignItems:'center',justifyContent:'center',flex:'0 0 auto',fontSize:'var(--text-sm)',
                  fontWeight:'var(--weight-bold)',color:'var(--color-secondary)'}}>{s.name.charAt(0)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:'var(--text-sm)',fontWeight:'var(--weight-medium)',color:'var(--color-ink)',
                    whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.name}</p>
                  <p style={{margin:0,fontSize:'var(--text-xs)',color:'var(--color-muted)',
                    whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.title}</p></div>
                <p style={{margin:0,fontFamily:'var(--font-mono)',fontSize:'var(--text-xs)',
                  fontWeight:'var(--weight-bold)',color:'var(--color-secondary)',flex:'0 0 auto'}}>{s.fee}</p>
              </div>)}
          </div>
        </div>
      </div>
    </div>
  </div>;
}

function Discover({onOpen}){
  const [filters,setFilters]=React.useState({search:'',expertise:[],available:null,format:'',minFee:0,maxFee:200000,sort:'rating_desc'});
  const list=SPEAKERS.filter(s=>{
    const q=filters.search.toLowerCase();
    return (!q||s.name.toLowerCase().includes(q)||s.title.toLowerCase().includes(q))
      &&(filters.expertise.length===0||filters.expertise.includes(s.category));});
  return <div>
    <TopBar title="Find Speakers" subtitle="Discover world-class speakers for your event"/>
    <div style={{padding:'var(--space-6)',display:'flex',flexDirection:'column',gap:'var(--space-6)'}}>
      <SpeakerFilters filters={filters} onChange={setFilters}/>
      {list.length===0
        ?<div style={{textAlign:'center',padding:'80px 0'}}>
          <Icon name="users" size={40} color="var(--color-line)"/>
          <h3 style={{margin:'var(--space-4) 0 0',fontFamily:'var(--font-display)',fontWeight:'var(--weight-black)',
            color:'var(--color-muted)',textTransform:'uppercase',letterSpacing:'var(--tracking-tight)'}}>No speakers found</h3>
          <p style={{margin:'var(--space-2) 0 0',fontSize:'var(--text-sm)',color:'var(--color-muted)'}}>Try adjusting your filters</p></div>
        :<>
          <p style={{margin:0,fontSize:'var(--text-xs)',color:'var(--color-muted)'}}>{list.length} speaker{list.length!==1?'s':''} found</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:'var(--space-4)'}}>
            {list.map(s=><SpeakerCard key={s.id} {...s} onClick={()=>onOpen(s)} onBook={()=>onOpen(s)}/>)}
          </div>
        </>}
    </div>
  </div>;
}

function Bookings({onOpen}){
  return <div>
    <TopBar title="My Bookings" subtitle="Every request, confirmation and completed event"/>
    <div style={{padding:'var(--space-6)'}}>
      <div style={{...card,overflow:'hidden'}}>
        {BOOKINGS.map((b,i)=>
          <div key={b.id} style={{display:'flex',alignItems:'center',gap:'var(--space-4)',padding:'16px 20px',
            borderTop:i?'1px solid var(--color-line)':'none'}}>
            <div style={{width:40,height:40,borderRadius:6,background:'rgba(3,30,87,.08)',flex:'0 0 auto',
              display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',
              fontWeight:'var(--weight-black)',color:'var(--color-primary)'}}>{b.speaker.charAt(0)}</div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{margin:0,fontSize:'var(--text-sm)',fontWeight:'var(--weight-semibold)',color:'var(--color-ink)'}}>{b.event}</p>
              <p style={{margin:'2px 0 0',fontSize:'var(--text-xs)',color:'var(--color-muted)'}}>{b.speaker} · {b.date}</p></div>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-sm)',fontWeight:'var(--weight-bold)',
              color:'var(--color-secondary)',flex:'0 0 auto'}}>{b.fee}</span>
            <BookingStatusBadge status={b.status}/>
            <Button variant="outline" size="sm" onClick={()=>onOpen(b)}>Open</Button>
          </div>)}
      </div>
    </div>
  </div>;
}

function SpeakerSheet({speaker,onClose,onBook}){
  if(!speaker) return null;
  return <Modal open onClose={onClose} maxWidth="2xl">
    <div>
      <div style={{background:'var(--color-primary)',padding:'var(--space-6)',display:'flex',gap:'var(--space-6)',alignItems:'center'}}>
        <div style={{width:88,height:88,borderRadius:8,background:'rgba(255,255,255,.1)',flex:'0 0 auto',
          display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',
          fontWeight:'var(--weight-black)',fontSize:36,color:'rgba(255,255,255,.3)'}}>{speaker.name.charAt(0)}</div>
        <div>
          <span style={{padding:'2px 8px',borderRadius:'var(--radius-pill)',background:'var(--color-support)',
            color:'var(--color-primary)',fontFamily:'var(--font-mono)',fontSize:'var(--text-10)',
            textTransform:'uppercase',letterSpacing:'var(--tracking-widest)'}}>{speaker.category}</span>
          <h2 style={{margin:'10px 0 4px',fontFamily:'var(--font-display)',fontWeight:'var(--weight-black)',
            fontSize:'var(--text-2xl)',textTransform:'uppercase',letterSpacing:'var(--tracking-tight)',color:'#fff'}}>{speaker.name}</h2>
          <p style={{margin:0,fontSize:'var(--text-sm)',color:'rgba(255,255,255,.7)'}}>{speaker.title}</p>
        </div>
      </div>
      <div style={{padding:'var(--space-6)',display:'flex',flexDirection:'column',gap:'var(--space-4)'}}>
        <div style={{display:'flex',gap:'var(--space-2)',flexWrap:'wrap'}}>
          {[speaker.category,'Keynote','Workshop','In-Person'].map(t=><Badge key={t}>{t}</Badge>)}</div>
        <p style={{margin:0,font:'var(--type-body)'}}>
          {speaker.name.split(' ')[0]} has delivered 61 events across South Africa and speaks to boards and
          all-hands audiences alike. Sessions are built from the client brief, not a fixed slide deck.</p>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'var(--space-4)',
          paddingTop:'var(--space-4)',borderTop:'1px solid var(--color-line)'}}>
          <div>
            <div style={{font:'var(--type-price)',fontSize:'var(--text-xl)',color:'var(--color-secondary)'}}>{speaker.fee}</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-9)',color:'var(--color-muted)'}}>PER EVENT</div></div>
          <div style={{display:'flex',gap:'var(--space-2)'}}>
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="gold" onClick={()=>onBook(speaker)}>Request booking</Button></div>
        </div>
      </div>
    </div>
  </Modal>;
}

function BookingWizard({speaker,onClose,onSubmit}){
  const [step,setStep]=React.useState(1);
  if(!speaker) return null;
  const steps=['Event','Logistics','Rider'];
  return <Modal open onClose={onClose} maxWidth="2xl" title={'Request '+speaker.name}>
    <div style={{padding:'var(--space-6)'}}>
      <div style={{display:'flex',gap:'var(--space-2)',marginBottom:'var(--space-6)'}}>
        {steps.map((s,i)=>
          <div key={s} style={{flex:1,paddingTop:8,borderTop:'2px solid '+(i+1<=step?'var(--color-accent)':'var(--color-line)'),
            fontFamily:'var(--font-mono)',fontSize:'var(--text-10)',textTransform:'uppercase',
            letterSpacing:'var(--tracking-label)',color:i+1<=step?'var(--color-primary)':'var(--color-muted)'}}>
            {String(i+1).padStart(2,'0')} {s}</div>)}
      </div>
      {step===1&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--space-4)'}}>
        <Input label="Event name" placeholder="Annual leadership summit"/>
        <Input label="Event date" type="date"/>
        <Select label="Format" options={['In-Person','Virtual','Hybrid']}/>
        <Input label="Audience size" type="number" placeholder="350"/>
        <div style={{gridColumn:'1 / -1'}}><Textarea label="Brief" rows={3} placeholder="Who is in the room, and what should they leave with?"/></div>
      </div>}
      {step===2&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--space-4)'}}>
        <Input label="Venue" placeholder="Sandton Convention Centre"/>
        <Input label="City" placeholder="Johannesburg"/>
        <Input label="Session start" type="time"/>
        <Input label="Session length" placeholder="45 minutes"/>
        <div style={{gridColumn:'1 / -1'}}><Textarea label="Travel notes" rows={2} placeholder="Flights, transfers, overnight requirements"/></div>
      </div>}
      {step===3&&<div style={{display:'flex',flexDirection:'column',gap:'var(--space-4)'}}>
        <div style={{background:'var(--color-soft)',border:'1px solid var(--color-line)',borderRadius:8,padding:'var(--space-4)'}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-10)',textTransform:'uppercase',
            letterSpacing:'var(--tracking-label)',color:'var(--color-secondary)',marginBottom:8}}>Hospitality rider</div>
          {[['Travel','Economy flights, airport transfer'],['Accommodation','4-star, night before'],['On site','Still water, lapel mic, 20 min green room']].map(([k,v])=>
            <div key={k} style={{display:'flex',justifyContent:'space-between',gap:16,padding:'6px 0',font:'var(--type-small)'}}>
              <span style={{color:'var(--color-muted)'}}>{k}</span>
              <span style={{color:'var(--color-primary)',textAlign:'right'}}>{v}</span></div>)}
        </div>
        <label style={{display:'flex',gap:10,alignItems:'flex-start',font:'var(--type-small)',cursor:'pointer'}}>
          <input type="radio" defaultChecked style={{accentColor:'#FF5700',marginTop:3}}/>
          <span>I accept the hospitality rider and the 25% deposit terms.</span></label>
      </div>}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'var(--space-4)',
        marginTop:'var(--space-6)',paddingTop:'var(--space-4)',borderTop:'1px solid var(--color-line)'}}>
        <div>
          <div style={{font:'var(--type-price)',color:'var(--color-secondary)'}}>{speaker.fee}</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-9)',color:'var(--color-muted)'}}>QUOTED FEE · DEPOSIT 25%</div></div>
        <div style={{display:'flex',gap:'var(--space-2)'}}>
          {step>1&&<Button variant="outline" onClick={()=>setStep(step-1)}>Back</Button>}
          {step<3
            ?<Button variant="gold" onClick={()=>setStep(step+1)}>Continue</Button>
            :<Button variant="gold" onClick={onSubmit}>Send request</Button>}
        </div>
      </div>
    </div>
  </Modal>;
}
Object.assign(window,{Dashboard,Discover,Bookings,SpeakerSheet,BookingWizard,SPEAKERS,BOOKINGS});
