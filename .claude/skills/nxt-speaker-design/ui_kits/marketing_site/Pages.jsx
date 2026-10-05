const {SpeakerCard,SpeakerFilters,Button,Badge,Modal,Input,Textarea,Select,Icon,Logo,BookingStatusBadge}=window.NXTSpeakerDesignSystem_f20208;

function SpeakersPage({onOpen}){
  const [filters,setFilters]=React.useState({search:'',expertise:[],available:null,format:'',minFee:0,maxFee:200000,sort:'rating_desc'});
  const list=window.SPEAKERS.filter(s=>{
    const q=filters.search.toLowerCase();
    const okQ=!q||s.name.toLowerCase().includes(q)||s.title.toLowerCase().includes(q);
    const okE=filters.expertise.length===0||filters.expertise.includes(s.category);
    return okQ&&okE;});
  return (
    <div style={{background:'#fff'}}>
      <div style={{background:'var(--color-soft)',borderBottom:'1px solid var(--color-line)',padding:'var(--space-12) 0'}}>
        <div style={{maxWidth:'var(--container-max)',margin:'0 auto',padding:'0 var(--gutter)'}}>
          <window.Eyebrow>Directory</window.Eyebrow>
          <h1 style={{margin:'var(--space-3) 0 var(--space-6)',font:'var(--type-h2)',textTransform:'none',color:'var(--color-primary)'}}>Browse speakers</h1>
          <SpeakerFilters filters={filters} onChange={setFilters}/>
        </div>
      </div>
      <div style={{maxWidth:'var(--container-max)',margin:'0 auto',padding:'var(--space-8) var(--gutter) var(--space-24)'}}>
        <p style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-2xs)',textTransform:'uppercase',
          letterSpacing:'var(--tracking-label)',color:'var(--color-muted)'}}>{list.length} of {window.SPEAKERS.length} speakers</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'var(--space-6)'}}>
          {list.map(s=><SpeakerCard key={s.name} {...s} onClick={()=>onOpen(s)} onBook={()=>onOpen(s)}/>)}
        </div>
        {list.length===0&&<p style={{font:'var(--type-body)',color:'var(--color-muted)'}}>No speakers match those filters yet.</p>}
      </div>
    </div>
  );
}

function ProfilePage({speaker,onBook}){
  const s=speaker||window.SPEAKERS[0];
  return (
    <div style={{background:'#fff'}}>
      <div style={{background:'var(--color-primary)',padding:'var(--space-16) 0'}}>
        <div style={{maxWidth:'var(--container-max)',margin:'0 auto',padding:'0 var(--gutter)',
          display:'grid',gridTemplateColumns:'220px 1fr',gap:'var(--space-12)',alignItems:'center'}}>
          <div style={{width:220,aspectRatio:'1',borderRadius:'var(--radius-lg)',background:'rgba(255,255,255,.08)',
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontFamily:'var(--font-display)',fontWeight:'var(--weight-black)',fontSize:88,color:'rgba(255,255,255,.25)'}}>{s.name.charAt(0)}</span>
          </div>
          <div>
            <span style={{padding:'4px 12px',borderRadius:'var(--radius-pill)',background:'var(--color-support)',
              color:'var(--color-primary)',fontFamily:'var(--font-mono)',fontSize:'var(--text-2xs)',
              textTransform:'uppercase',letterSpacing:'var(--tracking-label)'}}>{s.category}</span>
            <h1 style={{margin:'var(--space-4) 0 var(--space-3)',fontFamily:'var(--font-display)',
              fontWeight:'var(--weight-black)',fontSize:'var(--text-h1)',textTransform:'uppercase',
              letterSpacing:'var(--tracking-tight)',lineHeight:'var(--leading-tight)',color:'#fff'}}>{s.name}</h1>
            <p style={{margin:'0 0 var(--space-6)',font:'var(--type-lead)',color:'rgba(255,255,255,.75)'}}>{s.title}</p>
            <div style={{display:'flex',alignItems:'center',gap:'var(--space-6)',flexWrap:'wrap'}}>
              <div>
                <div style={{font:'var(--type-price)',fontSize:'var(--text-2xl)',color:'#fff'}}>{s.fee}</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-9)',color:'var(--color-secondary)'}}>PER EVENT</div>
              </div>
              <Button variant="gold" size="lg" onClick={onBook}>Request this speaker</Button>
              <span style={{display:'inline-flex',alignItems:'center',gap:6,fontFamily:'var(--font-mono)',
                fontSize:'var(--text-10)',textTransform:'uppercase',letterSpacing:'var(--tracking-label)',color:'var(--color-secondary)'}}>
                <Icon name="map-pin" size={12} color="var(--color-secondary)"/>{s.location}</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{maxWidth:'var(--container-max)',margin:'0 auto',padding:'var(--space-16) var(--gutter)',
        display:'grid',gridTemplateColumns:'minmax(0,1.6fr) minmax(0,1fr)',gap:'var(--space-16)'}}>
        <div>
          <window.Eyebrow>Talks</window.Eyebrow>
          <h2 style={{margin:'var(--space-3) 0 var(--space-6)',font:'var(--type-h3)',color:'var(--color-primary)'}}>Signature sessions</h2>
          {[['Keynote · 45 min',s.title],['Workshop · 3 hrs','A working session for the leadership team, with the awkward questions left in.'],['Fireside · 30 min','Moderated conversation, no slides.']].map(([f,d])=>
            <div key={f} style={{padding:'var(--space-4) 0',borderTop:'1px solid var(--color-line)'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-10)',textTransform:'uppercase',
                letterSpacing:'var(--tracking-label)',color:'var(--color-secondary)',marginBottom:6}}>{f}</div>
              <p style={{margin:0,font:'var(--type-body)'}}>{d}</p>
            </div>)}
        </div>
        <aside>
          <div style={{background:'var(--color-soft)',border:'1px solid var(--color-line)',
            borderRadius:'var(--radius-lg)',padding:'var(--space-6)'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-10)',textTransform:'uppercase',
              letterSpacing:'var(--tracking-label)',color:'var(--color-secondary)',marginBottom:'var(--space-4)'}}>At a glance</div>
            {[['Formats','In-person · Virtual'],['Languages','English · isiZulu'],['Events delivered','61'],['Travels from',s.location]].map(([k,v])=>
              <div key={k} style={{display:'flex',justifyContent:'space-between',gap:'var(--space-4)',padding:'8px 0',
                font:'var(--type-small)'}}>
                <span style={{color:'var(--color-muted)'}}>{k}</span>
                <span style={{color:'var(--color-primary)',fontWeight:'var(--weight-semibold)'}}>{v}</span></div>)}
          </div>
          <div style={{marginTop:'var(--space-4)',display:'flex',alignItems:'center',gap:'var(--space-2)'}}>
            <BookingStatusBadge status="CONFIRMED"/>
            <span style={{font:'var(--type-small)',color:'var(--color-muted)'}}>Available Q4 2026</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function BookingModal({open,speaker,onClose,onSubmit}){
  const s=speaker||{};
  return (
    <Modal open={open} onClose={onClose} title={'Request '+(s.name||'speaker')} maxWidth="2xl">
      <div style={{padding:'var(--space-6)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--space-4)'}}>
        <Input label="Organisation" placeholder="Acme Group"/>
        <Input label="Event name" placeholder="Annual leadership summit"/>
        <Input label="Event date" type="date"/>
        <Select label="Format" options={['In-Person','Virtual','Hybrid']}/>
        <Input label="City" placeholder="Johannesburg"/>
        <Input label="Audience size" type="number" placeholder="350"/>
        <div style={{gridColumn:'1 / -1'}}>
          <Textarea label="Brief" rows={3} placeholder="Who is in the room, and what should they leave with?"/>
        </div>
        <div style={{gridColumn:'1 / -1',display:'flex',alignItems:'center',justifyContent:'space-between',
          gap:'var(--space-4)',paddingTop:'var(--space-4)',borderTop:'1px solid var(--color-line)'}}>
          <div>
            <div style={{font:'var(--type-price)',color:'var(--color-secondary)'}}>{s.fee}</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-9)',color:'var(--color-muted)'}}>QUOTED FEE · DEPOSIT 25%</div>
          </div>
          <div style={{display:'flex',gap:'var(--space-2)'}}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="gold" onClick={onSubmit}>Send request</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function LoginPage({onNavigate}){
  return (
    <div style={{minHeight:'70vh',display:'grid',gridTemplateColumns:'1fr 1fr'}}>
      <div style={{background:'var(--color-primary)',position:'relative',overflow:'hidden',padding:'var(--space-16)'}}>
        <img src="../../assets/logo-badge-white.png" alt="" aria-hidden
          style={{position:'absolute',left:-120,bottom:-120,width:460,opacity:.15,transform:'rotate(8deg)'}}/>
        <Logo variant="white" size={34} orientation="horizontal" assetBase="../../assets"/>
        <h2 style={{margin:'var(--space-16) 0 var(--space-4)',fontFamily:'var(--font-display)',
          fontWeight:'var(--weight-black)',fontSize:'var(--text-h2)',textTransform:'uppercase',
          letterSpacing:'var(--tracking-tight)',color:'#fff',position:'relative'}}>Welcome back</h2>
        <p style={{margin:0,maxWidth:320,font:'var(--type-body)',color:'rgba(255,255,255,.7)',position:'relative'}}>
          Sign in to manage briefs, bookings and deposits.</p>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'var(--space-16)'}}>
        <div style={{width:'100%',maxWidth:360,display:'flex',flexDirection:'column',gap:'var(--space-4)'}}>
          <Input label="Email" type="email" placeholder="you@company.co.za"/>
          <Input label="Password" type="password" placeholder="••••••••"/>
          <Button variant="gold" size="lg" onClick={()=>onNavigate('speakers')}>Sign in</Button>
          <p style={{margin:0,font:'var(--type-small)',color:'var(--color-muted)'}}>
            No account yet? <a href="#" onClick={e=>e.preventDefault()}>Create one</a></p>
        </div>
      </div>
    </div>
  );
}
Object.assign(window,{SpeakersPage,ProfilePage,BookingModal,LoginPage});
