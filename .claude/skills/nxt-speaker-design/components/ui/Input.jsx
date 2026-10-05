import React from 'react';

/* Mirrors src/components/ui/Input.tsx: Space Mono uppercase label, 4px radius,
   teal border that turns orange on focus with an orange 20% ring. */
function shell(label,hint,error,inputId,control){
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      {label&&<label htmlFor={inputId} style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-xs)',
        fontWeight:'var(--weight-semibold)',color:'var(--color-primary)',textTransform:'uppercase',
        letterSpacing:'var(--tracking-wide)'}}>{label}</label>}
      {control}
      {error&&<p style={{margin:0,fontSize:'var(--text-xs)',color:'var(--color-danger)'}}>{error}</p>}
      {hint&&!error&&<p style={{margin:0,fontSize:'var(--text-xs)',color:'var(--color-muted)'}}>{hint}</p>}
    </div>
  );
}
function fieldStyle(focus,error,extra){
  return {width:'100%',padding:'10px 12px',fontFamily:'var(--font-body)',fontSize:'var(--text-sm)',
    color:'var(--color-primary)',background:'#fff',borderRadius:'var(--radius-input)',
    border:'1px solid '+(error?'var(--color-danger)':focus?'var(--color-accent)':'var(--color-secondary)'),
    boxShadow:focus?(error?'0 0 0 2px rgba(196,122,106,.2)':'var(--ring-focus)'):'none',
    outline:'none',transition:'all var(--dur-fast) ease',...extra};
}

export function Input({label,hint,error,id,iconLeft,style,...rest}){
  const [focus,setFocus]=React.useState(false);
  const inputId=id||(label?label.toLowerCase().replace(/\s+/g,'-'):undefined);
  const input=<input {...rest} id={inputId}
    onFocus={e=>{setFocus(true);rest.onFocus&&rest.onFocus(e)}}
    onBlur={e=>{setFocus(false);rest.onBlur&&rest.onBlur(e)}}
    style={fieldStyle(focus,error,{paddingLeft:iconLeft?36:12,...style})}/>;
  const control=iconLeft
    ?<span style={{position:'relative',display:'block'}}>
       <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--color-muted)',display:'flex'}}>{iconLeft}</span>
       {input}
     </span>
    :input;
  return shell(label,hint,error,inputId,control);
}

export function Textarea({label,hint,error,id,style,...rest}){
  const [focus,setFocus]=React.useState(false);
  const inputId=id||(label?label.toLowerCase().replace(/\s+/g,'-'):undefined);
  return shell(label,hint,error,inputId,
    <textarea {...rest} id={inputId}
      onFocus={e=>{setFocus(true);rest.onFocus&&rest.onFocus(e)}}
      onBlur={e=>{setFocus(false);rest.onBlur&&rest.onBlur(e)}}
      style={fieldStyle(focus,error,{resize:'vertical',minHeight:80,lineHeight:'var(--leading-body)',...style})}/>);
}

export function Select({label,hint,error,id,options=[],style,...rest}){
  const [focus,setFocus]=React.useState(false);
  const inputId=id||(label?label.toLowerCase().replace(/\s+/g,'-'):undefined);
  return shell(label,hint,error,inputId,
    <select {...rest} id={inputId}
      onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
      style={fieldStyle(focus,error,{cursor:'pointer',...style})}>
      {options.map(o=>{const v=typeof o==='string'?o:o.value,l=typeof o==='string'?o:o.label;
        return <option key={v} value={v}>{l}</option>})}
    </select>);
}
