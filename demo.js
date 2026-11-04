import {validate} from './core.js';
export const demoFields=[
  {id:'ITEM001',name:'管理番号',qrKey:'ID',type:'text',required:true,manual:true,important:true,defaultValue:'',options:[]},
  {id:'ITEM002',name:'品名',qrKey:'NAME',type:'text',required:true,manual:true,defaultValue:'',options:[]},
  {id:'ITEM003',name:'数量',qrKey:'QTY',type:'number',required:true,manual:true,defaultValue:'',options:[]},
  {id:'ITEM004',name:'日付',qrKey:'DATE',type:'date',required:false,manual:true,defaultValue:'',options:[]},
  {id:'ITEM005',name:'区分',qrKey:'TYPE',type:'select',required:true,manual:true,defaultValue:'入庫',options:['入庫','出庫','点検']}
];
export async function demoApi(action,payload={}) {
  if(document.getElementById('simulateOffline').checked) throw Error('体験用の通信失敗です。未送信データを手動再送してください。');
  if(action==='bootstrap') return {success:true,user:{sub:'demo',email:'demo@local',displayName:'体験ユーザー'},settings:{appName:'QR業務登録システム',sameQrIgnoreSeconds:3,historyCount:20},fields:demoFields};
  const storageKey='qr:public-demo:'+new URL('.',location.href).pathname+':records';
  const records=JSON.parse(localStorage.getItem(storageKey)||'[]');
  if(action==='history') return {success:true,records:records.slice(-20).reverse()};
  const previous=records.find(r=>r['送信ID']===payload.clientRequestId);
  if(previous) return {success:true,alreadyRegistered:true,receptionNumber:previous['受付番号']};
  const errors=validate(payload.values,demoFields);if(errors.length)return{success:false,type:'validation',errors};
  const number='DEMO-'+String(records.length+1).padStart(3,'0');
  const row={'受付番号':number,'登録日時':new Date().toLocaleString('ja-JP'),'登録方法':payload.registrationMethod};
  for(const f of demoFields) row[f.name]=payload.values[f.id]||'';
  row['送信ID']=payload.clientRequestId;records.push(row);localStorage.setItem(storageKey,JSON.stringify(records));
  return {success:true,receptionNumber:number};
}
