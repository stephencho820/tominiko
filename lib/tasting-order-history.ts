export type SavedTastingOrder={id:string;token:string;savedAt:number};
export const TASTING_HISTORY_KEY="casa-tasting-order-history-v1";
export function saveTastingOrder(id:string,token:string){
 if(typeof window==="undefined"||!id||!token)return;
 try{
  const raw=JSON.parse(localStorage.getItem(TASTING_HISTORY_KEY)||"[]");
  const entries:Array<SavedTastingOrder>=Array.isArray(raw)?raw.filter((v:SavedTastingOrder)=>v&&typeof v.id==="string"&&typeof v.token==="string"):[];
  localStorage.setItem(TASTING_HISTORY_KEY,JSON.stringify([{id,token,savedAt:Date.now()},...entries.filter(v=>v.id!==id)].slice(0,30)));
  localStorage.setItem("tasting-last-order",JSON.stringify({id,token}));
 }catch{}
}
export function getSavedTastingOrders():SavedTastingOrder[]{
 try{
  const raw=JSON.parse(localStorage.getItem(TASTING_HISTORY_KEY)||"[]");
  const entries:Array<SavedTastingOrder>=Array.isArray(raw)?raw.filter((v:SavedTastingOrder)=>v&&typeof v.id==="string"&&typeof v.token==="string"):[];
  const last=JSON.parse(localStorage.getItem("tasting-last-order")||"null");
  if(last?.id&&last?.token&&!entries.some(v=>v.id===last.id))entries.unshift({id:last.id,token:last.token,savedAt:0});
  return entries.slice(0,30);
 }catch{return []}
}
