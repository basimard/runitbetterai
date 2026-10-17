import Website from "../../website";
export const metadata = {title:"Your business sample | RunItBetterAI", robots:{index:false,follow:false}};
export default async function SamplePage({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params;
 return <Website sampleSlug={slug} />;
}
