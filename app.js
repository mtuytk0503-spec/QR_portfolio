import {parseQr,validate,QrGate,PendingStore} from './core.js';
import {demoApi} from './demo.js';
const $=id=>document.getElementById(id), demo=true;
let token='', user=null, settings={}, fields=[], store=null, method='手入力', busy=false, scanner=null, cameraBusy=false, cameraRunning=false, prepared=null;
const gate=new QrGate(), controls=new Map();
function notice(text,error=false){$('message').hidden=false;$('message').textContent=text;$('message').classList.toggle('error',error);}
function networkStatus(){$('connection').textContent=navigator.onLine?'オンライン':'オフライン';}
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
async function api(action,payload={}) { return demoApi(action,payload); }

function values(){return Object.fromEntries([...controls].map(([id,el])=>[id,el.value.trim()]));}
function resetForm(){for(const f of fields)controls.get(f.id).value=f.defaultValue??'';for(const e of document.querySelectorAll('.field-error'))e.textContent='';$('qrInput').value='';method='手入力';}
function renderFields(){controls.clear();$('fields').replaceChildren();for(const f of fields){
  const wrap=node('div',undefined,f.important?'field-important':'');const label=node('label',f.name);label.htmlFor='f-'+f.id;
  if(f.required)label.append(node('span','必須','required'));
  const input=document.createElement(f.type==='select'?'select':'input');input.id='f-'+f.id;
  if(f.type==='select'){input.append(new Option('選択してください',''));for(const option of f.options)input.append(new Option(option,option));}
  else {input.type=f.type;input.maxLength=2000;if(f.type==='number')input.step='any';}
  input.disabled=!f.manual; input.required=f.required;input.value=f.defaultValue??'';
  const error=node('div',undefined,'field-error');error.id='err-'+f.id;input.setAttribute('aria-describedby',error.id);
  wrap.append(label,input,error);controls.set(f.id,input);$('fields').append(wrap);
}}
function showErrors(errors){for(const e of document.querySelectorAll('.field-error'))e.textContent='';for(const e of errors){const el=$('err-'+e.fieldId);if(el)el.textContent=e.message;}notice(errors.map(e=>e.message).join('\n'),true);}
async function bootstrap(){
  try{const r=await api('bootstrap');if(!r.success)throw Error(r.message||'ログインできません。');
    user=r.user;settings=r.settings;fields=r.fields;
    store=new PendingStore(localStorage,'public-demo:'+new URL('.',location.href).pathname+':'+user.sub);
    $('appName').textContent=settings.appName;$('user').textContent='体験ユーザー（ログイン不要）';
    renderFields();$('login').hidden=true;$('app').hidden=false;renderPending();await history();
  }catch(e){notice(e.message,true);}
}
function setBusy(value){busy=value;$('formFields').disabled=value;$('retryAll').disabled=value;$('cameraStart').disabled=value||cameraBusy||cameraRunning;$('parse').disabled=value;$('logout').disabled=value;renderPending();}
function renderPending(){if(!store)return;try{
  const rows=store.list();$('pendingCount').textContent=rows.length;$('pending').replaceChildren();$('retryAll').disabled=busy||!rows.length;
  if(!rows.length)$('pending').append(node('p','未送信データはありません。','muted'));
  for(const item of rows){const wrap=node('div',undefined,'pending-item');
    wrap.append(node('p',new Date(item.createdAt).toLocaleString('ja-JP')+' / '+Object.entries(item.payload.values).map(([k,v])=>(fields.find(f=>f.id===k)?.name||k)+': '+v).join(' · ')),node('p',item.payload.clientRequestId,'pending-id'));
    if(item.lastError)wrap.append(node('p',item.lastError));
    const actions=node('div',undefined,'actions'), retry=node('button','この1件を再送','small'), remove=node('button','削除','small');
    retry.disabled=remove.disabled=busy;retry.onclick=()=>resend([item]);remove.onclick=()=>{if(confirm('未送信データを端末から削除します。Sheets側の保存済みデータは削除されません。よろしいですか？')){try{store.remove(item.payload.clientRequestId);renderPending();}catch(e){notice(e.message,true);}}};actions.append(retry,remove);wrap.append(actions);$('pending').append(wrap);
  }
}catch(e){notice(e.message,true);}}
async function history(){try{const r=await api('history');if(!r.success)throw Error(r.message||'履歴を取得できません。');$('history').replaceChildren();if(!r.records.length){$('history').append(node('p','登録履歴はまだありません。','muted'));return;}
  const headers=[...new Set(r.records.flatMap(Object.keys))].filter(h=>h!=='送信ID');const table=node('table'),head=node('thead'),tr=node('tr');for(const h of headers)tr.append(node('th',h));head.append(tr);table.append(head);const body=node('tbody');for(const row of r.records){const tr=node('tr');for(const h of headers){const td=node('td',String(row[h]??''));td.title=String(row[h]??'');tr.append(td);}body.append(tr);}table.append(body);$('history').append(table);
}catch(e){$('history').textContent='履歴を取得できません。登録結果とは別の処理です。「更新」で再確認してください。';}}
async function transmit(item){
  try{const r=await api('register',item.payload);
    if(!r.success){item.lastError=(r.errors||[]).map(e=>e.message).join(' / ')||r.message||'登録できません。';store.put(item);return {ok:false,text:item.lastError,type:r.type};}
    store.remove(item.payload.clientRequestId);return {ok:true,text:(r.alreadyRegistered?'保存済みを確認しました：':'登録しました：')+r.receptionNumber};
  }catch(e){item.lastError=e.message;try{store.put(item);}catch{ return {ok:false,text:'保存結果または端末保存を確認できません。画面を閉じず「書き出す」で控えを保存してください。'};}return {ok:false,text:item.lastError};}
}
async function resend(items){if(busy||!items.length)return;if(!confirm(items.length+'件を手動再送します。よろしいですか？'))return;setBusy(true);await stopCamera();let done=0;
  try{for(const item of items){const result=await transmit(item);if(result.ok)done++;else if(['auth','permission'].includes(result.type))break;}notice(done+' / '+items.length+'件の保存を確認しました。残りは未送信一覧を確認してください。',done!==items.length);await history();}finally{setBusy(false);}}
function applyQr(text){if(busy||$('confirm').open)return false;
  try{const parsed=parseQr(text,fields);const qrErrors=validate(parsed.values,fields.filter(f=>Object.hasOwn(parsed.values,f.id)));if(qrErrors.length){showErrors(qrErrors);return false;}if(!gate.accept(text,settings.sameQrIgnoreSeconds??3))return false;
    // 別のQRの残り値を混ぜない。既定値へ戻してから今回の値を設定。
    resetForm();for(const [k,v] of Object.entries(parsed.values))controls.get(k).value=v;$('qrInput').value=text;method='QR';
    notice(parsed.unknown.length?'読み取りました。未定義キーは反映していません：'+parsed.unknown.join(', '):'読み取りました。内容を確認して登録してください。');return true;
  }catch(e){notice(e.message,true);return false;}}
async function stopCamera(){if(cameraBusy)return; if(!scanner||!cameraRunning)return;cameraBusy=true;
  try{await scanner.stop();cameraRunning=false;scanner.clear();$('reader').append(node('div','読み取りを停止しました。','camera-placeholder'));}catch(e){notice('カメラの停止を確認できません。ページを閉じてください。',true);}finally{cameraBusy=false;$('cameraStart').disabled=busy||cameraRunning;$('cameraStop').disabled=!cameraRunning;}}
async function startCamera(){if(busy||cameraBusy||cameraRunning)return;
  if(!window.isSecureContext){notice('カメラはHTTPSのURLで開いてください。',true);return;}
  if(!window.Html5Qrcode){notice('QRライブラリを読み込めません。ページを再読み込みしてください。',true);return;}
  cameraBusy=true;$('cameraStart').disabled=true;
  try{$('reader').replaceChildren();scanner=new Html5Qrcode('reader',{formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE],verbose:false});
    const selection=$('cameraSelect').value;
    await scanner.start(selection||{facingMode:'environment'},{fps:10,qrbox:(w,h)=>{const size=Math.floor(Math.min(w,h)*.75);return {width:size,height:size};}},text=>{if(cameraBusy||!cameraRunning)return;if(applyQr(text))void stopCamera();},()=>{});
    cameraRunning=true;$('cameraStop').disabled=false;
    try{const cameras=await Html5Qrcode.getCameras();$('cameraSelect').replaceChildren(new Option('背面カメラを優先',''));for(const c of cameras)$('cameraSelect').append(new Option(c.label||'カメラ',c.id));$('cameraSelect').value=selection;}catch{}
  }catch(e){notice('カメラを開始できません。カメラ権限を許可し、SafariまたはChromeで開いてください。カメラを選び直すこともできます。',true);}
  finally{cameraBusy=false;$('cameraStart').disabled=busy||cameraRunning;if(document.hidden&&cameraRunning)await stopCamera();}
}
$('cameraStart').onclick=startCamera;$('cameraStop').onclick=stopCamera;
$('parse').onclick=()=>applyQr($('qrInput').value);$('qrInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();applyQr(e.target.value);}});
$('reset').onclick=resetForm;
$('form').onsubmit=async e=>{e.preventDefault();if(busy)return;await stopCamera();const v=values(),errors=validate(v,fields);if(errors.length){showErrors(errors);return;}
  prepared={clientRequestId:crypto.randomUUID(),values:v,registrationMethod:method,deviceType:/Android|iPhone|iPad/i.test(navigator.userAgent)?'スマホ':'PC'};
  $('confirmation').replaceChildren();for(const f of fields)$('confirmation').append(node('dt',f.name),node('dd',v[f.id]||'—'));$('confirm').showModal();};
$('cancelConfirm').onclick=()=>{$('confirm').close();prepared=null;};
$('commit').onclick=async()=>{if(busy||!prepared)return;const item={createdAt:new Date().toISOString(),payload:prepared,lastError:''};
  // 永続化できるまで送信しない。保存不能時は入力を残す。
  try{store.put(item);}catch(e){notice('端末に保存できないため送信していません。空き容量・ブラウザ設定を確認してください。',true);$('confirm').close();return;}
  prepared=null;$('confirm').close();setBusy(true);resetForm();
  try{const r=await transmit(item);notice(r.text+(r.ok?'':'\n未送信一覧から手動で再送できます。'),!r.ok);if(r.ok)await history();}finally{setBusy(false);}};
$('retryAll').onclick=()=>{try{resend(store.list());}catch(e){notice(e.message,true);}};$('refresh').onclick=history;
$('export').onclick=()=>{try{const rows=store.list();const url=URL.createObjectURL(new Blob([JSON.stringify(rows,null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download='qr-unsent-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){notice(e.message,true);}};
$('logout').onclick=async()=>{await stopCamera();token='';user=null;store=null;controls.clear();$('fields').replaceChildren();$('pending').replaceChildren();$('history').replaceChildren();$('app').hidden=true;$('login').hidden=false;notice('ログアウトしました。未送信データは同じGoogleアカウントで再ログインすると確認できます。');if(demo)location.href='./index.html';};
$('sample').onclick=()=>applyQr('ID=CAMERA001|NAME=カメラ読取テスト|QTY=15|TYPE=入庫');
window.addEventListener('online',()=>{networkStatus();notice('通信が回復しました。未送信データを確認して、手動再送してください。');renderPending();});
window.addEventListener('offline',networkStatus);window.addEventListener('storage',renderPending);
window.addEventListener('pagehide',()=>{if(scanner&&cameraRunning)void scanner.stop().catch(()=>{});});
document.addEventListener('visibilitychange',()=>{if(document.hidden)void stopCamera();});
networkStatus();
$('mode').textContent='公開デモ / 端末内だけに保存';$('demoTools').hidden=false;await bootstrap();notice('ログイン不要の公開デモです。架空データをこのブラウザだけに保存します。');
