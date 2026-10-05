const {Button,Logo}=window.NXTSpeakerDesignSystem_f20208;

/* Momentum direction: navy hero band, oversized uppercase Archivo, the badge used
   oversized at 15% opacity as a watermark. */
function Hero({onNavigate}){
  return (
    <section style={{position:'relative',background:'var(--color-primary)',overflow:'hidden'}}>
      <img src="../../assets/logo-badge-white.png" alt="" aria-hidden
        style={{position:'absolute',right:-140,top:-90,width:620,opacity:.15,transform:'rotate(-12deg)',pointerEvents:'none'}}/>
      <div style={{position:'relative',maxWidth:'var(--container-max)',margin:'0 auto',
        padding:'var(--space-24) var(--gutter)'}}>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-2xs)',textTransform:'uppercase',
          letterSpacing:'var(--tracking-widest)',color:'var(--color-secondary)'}}>South Africa · Est. 2026</span>
        <h1 style={{margin:'var(--space-4) 0 0',maxWidth:900,fontFamily:'var(--font-display)',
          fontWeight:'var(--weight-black)',fontSize:'clamp(40px,6vw,var(--text-hero))',lineHeight:'var(--leading-tight)',
          letterSpacing:'var(--tracking-tight)',textTransform:'uppercase',color:'#fff'}}>
          Book the speaker.<br/>Not the agency.</h1>
        <p style={{margin:'var(--space-6) 0 0',maxWidth:560,font:'var(--type-lead)',color:'rgba(255,255,255,.75)'}}>
          Verified speakers, real fees in rand, and a booking request that lands with the speaker — no gatekeepers, no commission games.</p>
        <div style={{display:'flex',gap:'var(--space-3)',marginTop:'var(--space-8)',flexWrap:'wrap'}}>
          <Button variant="gold" size="lg" onClick={()=>onNavigate('speakers')}>Find a speaker</Button>
          <Button variant="outline" size="lg" onClick={()=>onNavigate('forspeakers')}
            style={{background:'transparent',color:'#fff',borderColor:'var(--color-secondary)'}}>I am a speaker</Button>
        </div>
        <div style={{display:'flex',gap:'var(--space-12)',marginTop:'var(--space-16)',flexWrap:'wrap'}}>
          {[['184','Verified speakers'],['R0','Agency commission'],['48 hrs','Median reply time']].map(([v,l])=>
            <div key={l}>
              <div style={{fontFamily:'var(--font-display)',fontWeight:'var(--weight-black)',fontSize:'var(--text-3xl)',
                letterSpacing:'var(--tracking-tight)',color:'#fff'}}>{v}</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-10)',textTransform:'uppercase',
                letterSpacing:'var(--tracking-label)',color:'var(--color-secondary)',marginTop:6}}>{l}</div>
            </div>)}
        </div>
      </div>
    </section>
  );
}
Object.assign(window,{Hero});
