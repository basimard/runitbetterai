"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import de from './locales/de.json';
import it from './locales/it.json';
import es from './locales/es.json';
import mx from './locales/es-MX.json';
import ar from './locales/ar.json';
import nl from './locales/nl.json';
export const languages=[{code:'en',label:'English'},{code:'de',label:'Deutsch'},{code:'it',label:'Italiano'},{code:'es',label:'Español (España)'},{code:'ar',label:'العربية'},{code:'es-MX',label:'Español (México)'},{code:'nl',label:'Nederlands'}] as const;
type Locale=typeof languages[number]['code'];
const catalogs:Record<string,Record<string,string>>={en:{},de,it,es,'es-MX':mx,ar,nl};
const normalize=(text:string)=>text.trim().replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ');
const normalizedCatalogs=Object.fromEntries(Object.entries(catalogs).map(([locale,catalog])=>[locale,Object.fromEntries(Object.entries(catalog).map(([key,value])=>[normalize(key).toLowerCase(),value]))]));
const LocaleContext=createContext<{locale:Locale;setLocale:(v:Locale)=>void}>({locale:'en',setLocale:()=>{}});
export function LanguageProvider({children}:{children:ReactNode}){
 const [locale,setLocale]=useState<Locale>('en');
 useEffect(()=>{try{const saved=localStorage.getItem('runitbetter-language');if(languages.some(l=>l.code===saved))setLocale(saved as Locale);}catch{}},[]);
 useEffect(()=>{document.documentElement.lang=locale;document.documentElement.dir=locale==='ar'?'rtl':'ltr';document.title=locale==='en'?'RunItBetterAI | Less busywork. Better business.':'RunItBetterAI | '+catalogs[locale]['Less busywork. Better business.'];},[locale]);
 const choose=(next:Locale)=>{setLocale(next);try{localStorage.setItem('runitbetter-language',next);}catch{}};
 return <LocaleContext.Provider value={{locale,setLocale:choose}}>{children}</LocaleContext.Provider>;
}
export function useTranslation(){
 const {locale,setLocale}=useContext(LocaleContext);
 function translate(text:string):string{
  const key=normalize(text);
  const catalog=catalogs[locale];
  const exact=catalog[key];if(exact)return exact;
  const folded=normalizedCatalogs[locale][key.toLowerCase()];if(folded)return folded;
  for(const prefix of ['Automation for ','Help finding sample: '])if(key.startsWith(prefix)){const template=catalog[prefix+'{value}'];if(template)return template.replace('{value}',translate(key.slice(prefix.length)));}
  return text;
 }
 function tr<T>(value:T):T{return (typeof value==='string'?translate(value):value) as T;}
 return {locale,setLocale,tr};
}
export function LanguageSelector(){const {locale,setLocale,tr}=useTranslation();return <label className="language-selector"><span>{tr('Language')}</span><select aria-label={tr('Language')} value={locale} onChange={e=>setLocale(e.target.value as Locale)}>{languages.map(l=><option key={l.code} value={l.code} lang={l.code}>{l.label}</option>)}</select></label>;}
