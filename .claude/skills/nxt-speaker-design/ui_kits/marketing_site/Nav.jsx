const {Logo,Button}=window.NXTSpeakerDesignSystem_f20208;

function Nav({page,onNavigate}){
  const links=[['Speakers','speakers'],['How it works','how'],['For speakers','forspeakers']];
  return (
    <header style={{position:'sticky',top:0,zIndex:40,background:'rgba(255,255,255,.92)',
      backdropFilter:'blur(20px)',borderBottom:'1px solid var(--color-line)'}}>
      <div style={{maxWidth:'var(--container-max)',margin:'0 auto',padding:'14px var(--gutter)',
        display:'flex',alignItems:'center',justifyContent:'space-between',gap:'var(--space-6)'}}>
        <a href="#" onClick={e=>{e.preventDefault();onNavigate('home')}} style={{textDecoration:'none'}}>
          <Logo variant="navy" size={38} orientation="horizontal" assetBase="../../assets"/>
        </a>
        <nav style={{display:'flex',alignItems:'center',gap:'var(--space-8)'}}>
          {links.map(([label,key])=>
            <a key={key} href="#" onClick={e=>{e.preventDefault();onNavigate(key)}}
              style={{fontFamily:'var(--font-body)',fontSize:'var(--text-sm)',fontWeight:'var(--weight-medium)',
                textDecoration:'none',color:page===key?'var(--color-primary)':'var(--color-ink)'}}>{label}</a>)}
          <a href="#" onClick={e=>{e.preventDefault();onNavigate('login')}}
            style={{fontFamily:'var(--font-body)',fontSize:'var(--text-sm)',fontWeight:'var(--weight-medium)',
              textDecoration:'none',color:'var(--color-ink)'}}>Sign in</a>
          <Button variant="gold" size="md" onClick={()=>onNavigate('speakers')}>Book a speaker</Button>
        </nav>
      </div>
    </header>
  );
}
Object.assign(window,{Nav});
