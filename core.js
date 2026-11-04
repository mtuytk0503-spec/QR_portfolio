export function parseQr(raw,fields) {
  raw=String(raw||'').trim();
  if(!raw || raw.length>8000) throw Error('QR内容を1〜8000文字で入力してください。');
  let data;
  if(raw.startsWith('{')) {
    try {data=JSON.parse(raw);} catch {throw Error('QRのJSON形式が正しくありません。');}
    if(!data || Array.isArray(data) || typeof data!=='object') throw Error('QRの形式が正しくありません。');
  } else if(/^https?:\/\//i.test(raw)) {
    try {data=Object.fromEntries(new URL(raw).searchParams);} catch {throw Error('QRのURLが正しくありません。');}
  } else if(raw.includes('=')) {
    data=Object.fromEntries(raw.split('|').filter(p=>p.includes('=')).map(p=>{const i=p.indexOf('=');return [p.slice(0,i),p.slice(i+1)];}));
  } else data={ID:raw};
  const normalized=Object.create(null);
  for(const [key,value] of Object.entries(data)) {
    if(value!==null && typeof value==='object') throw Error('QRの値には文字列または数値を使用してください。');
    normalized[key.trim().toUpperCase()]=String(value??'').trim();
  }
  const known=fields.map(f=>f.qrKey.toUpperCase());
  const values=Object.create(null);
  for(const f of fields) if(Object.hasOwn(normalized,f.qrKey.toUpperCase())) values[f.id]=normalized[f.qrKey.toUpperCase()];
  if(!Object.keys(values).length) throw Error('設定に一致するQR項目がありません。');
  return {values,unknown:Object.keys(normalized).filter(k=>!known.includes(k))};
}
export function validate(values,fields) {
  const errors=[];
  for(const f of fields) {
    const v=String(values[f.id]??'').trim(); let message='';
    if(!v && f.required) message='必須項目です。';
    else if(v) {
      if(v.length>2000) message='2000文字以内で入力してください。';
      else if(f.type==='number' && (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(v)||!Number.isFinite(Number(v)))) message='数値で入力してください。';
      else if(f.type==='date' && (!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)) message='実在する日付を入力してください。';
      else if(f.type==='select' && !f.options.includes(v)) message='設定された選択肢から選んでください。';
    }
    if(message) errors.push({fieldId:f.id,message:f.name+'：'+message});
  }
  return errors;
}
export class QrGate {
  constructor(){this.seen=new Map();}
  accept(text,seconds,now=Date.now()) {
    const key=String(text).trim(), until=this.seen.get(key);
    if(until!==undefined && now<until) return false;
    for(const [k,v] of this.seen) if(v<=now) this.seen.delete(k);
    this.seen.set(key,now+Math.max(0,seconds)*1000); return true;
  }
}
export class PendingStore {
  constructor(storage,namespace){this.storage=storage;this.prefix='qr:v1:'+namespace+':';}
  list(){const rows=[];for(let i=0;i<this.storage.length;i++){const k=this.storage.key(i);if(k?.startsWith(this.prefix)){try{const r=JSON.parse(this.storage.getItem(k));if(!r?.payload?.clientRequestId) throw Error();rows.push(r);}catch{throw Error('未送信データを読めません。ブラウザの保存データを消さず管理者に連絡してください。');}}}return rows.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));}
  put(item){const k=this.prefix+item.payload.clientRequestId;const s=JSON.stringify(item);this.storage.setItem(k,s);if(this.storage.getItem(k)!==s) throw Error('端末へ保存できません。');}
  remove(id){this.storage.removeItem(this.prefix+id);}
}
