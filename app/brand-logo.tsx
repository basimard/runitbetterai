export function BrandLogo({dark=false,className=""}:{dark?:boolean;className?:string}){
 return <a className={className} href="/" aria-label="RunItBetterAI home"><img src={dark?"/runitbetterai-logo-light.svg":"/runitbetterai-logo.svg"} width={232} height={43} alt="RunItBetter AI" style={{display:"block",width:"100%",height:"auto",maxWidth:232}}/></a>;
}
