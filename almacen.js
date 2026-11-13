(() => {
'use strict';
const $=id=>document.getElementById(id), key='fixlab_warehouse_v1';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2);
let state={items:[...document.querySelectorAll('#piezas [data-part-name]')].map((e,i)=>({id:uid(),name:e.dataset.partName,supplier:e.dataset.partSupplier,stock:Number(e.dataset.partStock),price:Number(e.dataset.partPrice),min:[3,5,6,3][i]??3,target:12})),orders:[]};
let blocked=false;
try {const saved=FixDB.getItem(key);if(saved){const data=JSON.parse(saved);if(!Array.isArray(data.items)||!Array.isArray(data.orders)||!data.items.every(p=>typeof p.id==='string'&&typeof p.name==='string'&&[p.stock,p.min,p.target].every(Number.isSafeInteger)&&p.stock>=0&&p.min>=0&&p.target>p.min))throw Error();state=data;}}catch(e){blocked=true;$('wh-message').textContent='No se pudo leer el almacén guardado. No se sobrescribirán sus datos. Revisa el almacenamiento del navegador.';}
const pending=p=>state.orders.filter(o=>o.item===p.id&&o.status==='Pendiente').reduce((n,o)=>n+o.qty,0);
const need=p=>p.stock<=p.min?Math.max(0,p.target-p.stock-pending(p)):0;
function commit(next){if(blocked){alert('El almacenamiento no está disponible. No se guardaron cambios.');return false;}try{FixDB.setItem(key,JSON.stringify(next));state=next;render();return true;}catch(e){$('wh-message').textContent='No se pudo guardar. El cambio no se aplicó; revisa el espacio y los permisos del navegador.';return false;}}
function syncLegacy(){
for(const container of document.querySelectorAll('#inventario-completo .inventory-table, #piezas .inventory-table')){
  container.querySelectorAll('.inventory-item').forEach(e=>e.remove());
  state.items.forEach(p=>{const e=document.createElement('div');e.className='inventory-item';Object.assign(e.dataset,{partName:p.name,partStock:p.stock,partPrice:p.price,partSupplier:p.supplier,partStatus:p.stock<=p.min?'Bajo':'Disponible'});e.innerHTML=`<span class="part-thumb battery">▣</span><div><b>${esc(p.name)}</b><small>Proveedor: ${esc(p.supplier)}</small></div><strong class="quantity">${p.stock} uds.</strong><span class="stock-warning">${p.stock===0?'Agotado':p.stock<=p.min?'Bajo':'Disponible'}</span><button class="row-menu" aria-label="Editar ${esc(p.name)}">···</button>`;e.querySelector('button').onclick=()=>open('edit',p.id);container.append(e);});
}
document.querySelectorAll('.inventory-panel .inventory-row').forEach(e=>{const p=state.items.find(p=>p.name===e.querySelector('.part-name b').textContent);if(p){e.querySelector('.stock b').textContent=p.stock+' unidades';e.querySelector('.stock-warning').textContent=p.stock<=p.min?'Bajo':'Disponible';}});
}
function render(){
const low=state.items.filter(p=>p.stock<=p.min).length;
$('wh-stats').innerHTML=[[state.items.length,'Tipos de repuestos'],[state.items.reduce((n,p)=>n+p.stock,0),'Unidades disponibles'],[low,'Con stock bajo o agotado'],[state.items.reduce((n,p)=>n+need(p),0),'Unidades por pedir']].map(([n,t])=>`<div class="wh-stat"><strong>${n}</strong><span>${t}</span></div>`).join('');
const q=$('wh-search').value.trim().toLowerCase(),f=$('wh-filter').value;
const list=state.items.filter(p=>(p.name+' '+p.supplier).toLowerCase().includes(q)&&(f==='all'||(f==='low'?p.stock<=p.min:need(p)>0)));
$('wh-rows').innerHTML=list.map(p=>`<tr><td><b>${esc(p.name)}</b><small>${esc(p.supplier)||'Sin proveedor'}</small></td><td>${p.stock}</td><td>${p.min}</td><td>${p.target}</td><td>${pending(p)}</td><td><b>${need(p)}</b></td><td><span class="wh-badge ${p.stock===0?'empty':p.stock<=p.min?'low':''}">${p.stock===0?'Agotado':p.stock<=p.min?'Stock bajo':'Disponible'}</span></td><td><div class="wh-buttons">${[['in','Entrada'],['out','Salida'],['order','Pedir'],['edit','Editar']].map(([a,t])=>`<button data-action="${a}" data-id="${esc(p.id)}">${t}</button>`).join('')}</div></td></tr>`).join('')||'<tr><td colspan="8">No hay repuestos que coincidan.</td></tr>';
$('wh-orders').innerHTML=state.orders.slice().reverse().map(o=>`<div class="wh-order"><div><b>${esc(o.name)} · ${o.qty} unidades</b><small>${esc(o.supplier)} · ${esc(o.date)} · ${esc(o.status)}</small></div>${o.status==='Pendiente'?`<div class="wh-buttons"><button data-action="receive" data-id="${esc(o.id)}">Recibir pedido</button><button data-action="cancel" data-id="${esc(o.id)}">Cancelar pedido</button></div>`:''}</div>`).join('')||'<p class="wh-note">Todavía no hay pedidos registrados en el almacén.</p>';
syncLegacy();
}
let action='',itemId='';
function open(a,id){action=a;itemId=id;const p=state.items.find(p=>p.id===id);$('wh-error').textContent='';$('wh-title').textContent=({add:'Nuevo repuesto',edit:'Editar repuesto',in:'Registrar entrada',out:'Registrar salida',order:'Registrar pedido'})[a];
const field=(name,label,value,type='text',min=0)=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${type==='number'?`min="${min}" max="1000000" step="1"`: 'maxlength="120"'} required></label>`;
$('wh-fields').innerHTML=a==='add'||a==='edit'?field('name','Nombre del repuesto',p?.name||'')+field('supplier','Proveedor',p?.supplier||'')+field('stock','Existencias actuales',p?.stock??0,'number')+field('min','Stock mínimo',p?.min??3,'number')+field('target','Stock objetivo',p?.target??12,'number',1):`<p>${esc(p.name)} · Disponible: ${p.stock}</p>`+field('qty',a==='order'?'Unidades a pedir':'Unidades',a==='order'?need(p)||1:1,'number',1)+(a==='order'?field('supplier','Proveedor',p.supplier):'');
$('wh-dialog').showModal();$('wh-fields').querySelector('input').focus();
}
$('wh-cancel').onclick=()=>$('wh-dialog').close();$('wh-add').onclick=()=>open('add');
$('wh-form').onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),next=structuredClone(state),p=next.items.find(p=>p.id===itemId);let error='';
if(action==='add'||action==='edit'){const values={name:d.name.trim(),supplier:d.supplier.trim(),stock:Number(d.stock),min:Number(d.min),target:Number(d.target)};if(!values.name||!values.supplier)error='Escribe el nombre y el proveedor.';else if(![values.stock,values.min,values.target].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000)||values.target<=values.min)error='Usa cantidades enteras; el objetivo debe superar al mínimo.';else if(next.items.some(x=>x.id!==itemId&&x.name.toLowerCase()===values.name.toLowerCase()))error='Este repuesto ya existe. Edita su registro.';else if(p)Object.assign(p,values);else next.items.push({id:uid(),price:0,...values});
}else{const qty=Number(d.qty);if(!Number.isSafeInteger(qty)||qty<1||qty>1000000)error='Introduce una cantidad entera mayor a cero.';else if(action==='out'&&qty>p.stock)error='No hay suficientes unidades disponibles.';else if(action==='order'){if(!d.supplier.trim())error='Indica el proveedor.';else next.orders.push({id:uid(),item:p.id,name:p.name,qty,supplier:d.supplier.trim(),status:'Pendiente',date:new Date().toLocaleDateString('es-BO')});}else p.stock+=action==='in'?qty:-qty;}
if(error){$('wh-error').textContent=error;return;}if(commit(next)){$('wh-dialog').close();$('wh-message').textContent='Registro guardado correctamente.';}
};
$('almacen').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=b.dataset.id;if(a==='receive'||a==='cancel'){const next=structuredClone(state),o=next.orders.find(o=>o.id===id);if(!o||o.status!=='Pendiente')return;if(!confirm(a==='receive'?`¿Confirmas que recibiste ${o.qty} unidades de ${o.name}?`:'¿Cancelar este pedido?'))return;if(a==='receive'){next.items.find(p=>p.id===o.item).stock+=o.qty;o.status='Recibido';}else o.status='Cancelado';commit(next);}else open(a,id);});
$('wh-search').oninput=render;$('wh-filter').onchange=render;
$('wh-export').onclick=()=>{const rows=state.items.filter(p=>need(p)>0);if(!rows.length){$('wh-message').textContent='No hay repuestos pendientes de solicitar.';return;}const csvCell=v=>'"'+String(v).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';const csv='\uFEFF'+[['Repuesto','Proveedor','Disponible','Pendiente','A pedir'],...rows.map(p=>[p.name,p.supplier,p.stock,pending(p),need(p)])].map(r=>r.map(csvCell).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Lista_de_compra_FixLab.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
window.warehouseImport=(el,oldName)=>{const next=structuredClone(state),d=el.dataset,p=next.items.find(p=>p.name===(oldName||d.partName));const v={name:d.partName,supplier:d.partSupplier,stock:Number(d.partStock),price:Number(d.partPrice)};if(p)Object.assign(p,v);else next.items.push({id:uid(),min:3,target:12,...v});commit(next);};
window.warehouseStock=(name,stock)=>{const next=structuredClone(state),p=next.items.find(p=>p.name===name);if(p){p.stock=stock;commit(next);}};
window.warehousePurchase=(name,qty,supplier)=>{const p=state.items.find(p=>p.name===name);if(p&&Number.isSafeInteger(qty)&&qty>0){const next=structuredClone(state);next.orders.push({id:uid(),item:p.id,name,qty,supplier,status:'Pendiente',date:new Date().toLocaleDateString('es-BO')});commit(next);}};
render();
})();
