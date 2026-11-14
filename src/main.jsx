import React, {useState,useRef,useEffect,useCallback,memo} from 'react';
import {createRoot} from 'react-dom/client';
import {ReactFlow,ReactFlowProvider,Background,Controls,MiniMap,Handle,Position,applyNodeChanges,applyEdgeChanges,addEdge,useReactFlow} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './style.css';
import {starter,examples,kinds,colors,arrange,toCanvas,toModel} from './graph.js';
import {validateGraph} from '../server/schema.js';

const key='funnel-ecosystem-prototype-v1';
const clone=x=>JSON.parse(JSON.stringify(x));
function readSaved(){try{const value=JSON.parse(localStorage.getItem(key));if(value){validateGraph(toModel(value));return value;}}catch{}return clone(starter);}
const BusinessNode=memo(function BusinessNode({data,selected}){
  const vertical=data.direction==='TB';
  return <article className={`business-node ${selected?'chosen':''}`} style={{'--node-color':colors[data.kind]}}>
    <Handle type="target" position={vertical?Position.Top:Position.Left}/>
    <div className="node-top"><span>{data.kind}</span><span className={`node-status ${data.status}`}>{data.status}</span></div>
    <strong>{data.label}</strong><p>{data.description}</p>
    {data.owner&&<div className="node-owner">{data.owner}</div>}
    <Handle type="source" position={vertical?Position.Bottom:Position.Right}/>
  </article>;
});
const nodeTypes={business:BusinessNode};

function App(){
  const [graph,setGraph]=useState(readSaved);
  const [prompt,setPrompt]=useState('');
  const [mode,setMode]=useState('new');
  const [busy,setBusy]=useState(false);
  const [selection,setSelection]=useState(null);
  const [messages,setMessages]=useState([{role:'assistant',text:'Describe the funnel or business you have in mind. I’ll map the pieces and how they connect. The canvas shows an editable example to get you started.'}]);
  const [notice,setNotice]=useState('');
  const [storage,setStorage]=useState('Saved in this browser');
  const [access,setAccess]=useState(null);
  const [present,setPresent]=useState(false);
  const [panelOpen,setPanelOpen]=useState(false);
  const [direction,setDirection]=useState('LR');
  const [history,setHistory]=useState({past:[],future:[]});
  const [showData,setShowData]=useState(false);
  const [saveName,setSaveName]=useState('');
  const [library,setLibrary]=useState(()=>{try{return JSON.parse(localStorage.getItem(key+'-library'))||[];}catch{return [];}});
  const graphRef=useRef(graph),importRef=useRef(),bottomRef=useRef(),abortRef=useRef();
  const {fitView,screenToFlowPosition}=useReactFlow();
  graphRef.current=graph;
  const fit=()=>setTimeout(()=>fitView({padding:0.2,duration:300,maxZoom:1}),80);
  useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(graph));setStorage('Saved in this browser');}catch{setStorage('Browser storage unavailable. Export to keep your map.');}},[graph]);
  useEffect(()=>{if(location.search)window.history.replaceState(null,'',location.pathname);fetch('/api/session').then(r=>r.json()).then(setAccess).catch(()=>setAccess({authorized:false}));},[]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'});},[messages,busy]);
  const checkpoint=useCallback(()=>setHistory(h=>({past:[...h.past.slice(-29),clone(graphRef.current)],future:[]})),[]);
  function commit(next){checkpoint();setGraph(next);setSelection(null);}
  function undo(){if(!history.past.length||busy)return;const previous=history.past.at(-1);setHistory(h=>({past:h.past.slice(0,-1),future:[clone(graph),...h.future]}));setGraph(previous);setSelection(null);}
  function redo(){if(!history.future.length||busy)return;const next=history.future[0];setHistory(h=>({past:[...h.past,clone(graph)],future:h.future.slice(1)}));setGraph(next);setSelection(null);}
  const onNodesChange=useCallback(changes=>setGraph(g=>({...g,nodes:applyNodeChanges(changes,g.nodes)})),[]);
  const onEdgesChange=useCallback(changes=>setGraph(g=>({...g,edges:applyEdgeChanges(changes,g.edges)})),[]);
  function connect(params){checkpoint();setGraph(g=>({...g,edges:addEdge({...params,id:crypto.randomUUID(),type:'smoothstep',label:'',markerEnd:{type:'arrowclosed',color:'#83948b'}},g.edges)}));}
  function editNode(field,value){setGraph(g=>({...g,nodes:g.nodes.map(n=>n.id===selection?.id?{...n,data:{...n.data,[field]:value}}:n)}));}
  function remove(){checkpoint();setGraph(g=>({...g,nodes:g.nodes.filter(n=>selection.type!=='node'||n.id!==selection.id),edges:g.edges.filter(e=>selection.type==='edge'?e.id!==selection.id:e.source!==selection.id&&e.target!==selection.id)}));setSelection(null);}
  function addCard(){if(graph.nodes.length>=60){setNotice('This prototype supports 60 cards per map.');return;}checkpoint();const id=crypto.randomUUID();const bounds=document.querySelector('.canvas').getBoundingClientRect();setGraph(g=>({...g,nodes:[...g.nodes,{id,type:'business',position:screenToFlowPosition({x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2}),data:{label:'New piece',kind:'offer',description:'',owner:'',status:'idea',direction}}]}));setSelection({type:'node',id});}
  function layout(value=direction){checkpoint();setDirection(value);setGraph(g=>arrange(g,value));fit();}
  async function generate(event){
    event.preventDefault();if(busy||!prompt.trim())return;
    const request=prompt.trim();const snapshot=graphRef.current;setBusy(true);setNotice('');setMessages(m=>[...m,{role:'user',text:request}]);
    const controller=new AbortController();abortRef.current=controller;const timer=setTimeout(()=>controller.abort(),55000);
    try{
      const res=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:request,mode,graph:toModel(snapshot)}),signal:controller.signal});
      const result=await res.json().catch(()=>({error:res.status===429?'A few too many requests. Wait a minute and try again.':'The service did not return a map. Try again.'}));
      if(!res.ok)throw new Error(result.error);
      const model=validateGraph(result);commit(toCanvas(model,snapshot.nodes,mode==='update'));setMessages(m=>[...m,{role:'assistant',text:result.summary||'Your map is ready. Click a card to edit it.'}]);setPrompt('');setMode('update');setDirection('LR');fit();
    }catch(e){const message=e.name==='AbortError'?'Generation stopped. Your map is unchanged.':e.message;setNotice(message);setMessages(m=>[...m,{role:'error',text:message}]);}
    finally{clearTimeout(timer);setBusy(false);abortRef.current=null;}
  }
  function download(){const blob=new Blob([JSON.stringify({version:1,...graph},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(graph.title||'business-map').replace(/[^a-z0-9]/gi,'-').toLowerCase()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function importMap(event){const file=event.target.files[0];if(!file)return;try{if(file.size>500000)throw new Error('Choose a JSON map under 500 KB.');const data=JSON.parse(await file.text());const model=validateGraph(data.nodes?.[0]?.data?toModel(data):data);let next=toCanvas(model);if(data.nodes?.every(n=>Number.isFinite(n.position?.x)&&Number.isFinite(n.position?.y))){next.nodes=next.nodes.map((n,i)=>({...n,position:data.nodes[i].position}));}commit(next);setMode('update');setNotice('Map imported.');fit();}catch(e){setNotice('Import failed: '+e.message);}event.target.value='';}
  function saveCopy(){const name=saveName.trim()||graph.title;const next=[{id:crypto.randomUUID(),name,graph:clone(graph)},...library].slice(0,12);try{localStorage.setItem(key+'-library',JSON.stringify(next));setLibrary(next);setSaveName('');setNotice('Saved a map snapshot in this browser.');}catch{setNotice('Could not save. Export your map instead.');}}
  const node=selection?.type==='node'?graph.nodes.find(n=>n.id===selection.id):null;
  const edge=selection?.type==='edge'?graph.edges.find(e=>e.id===selection.id):null;
  return <main className={`app ${panelOpen?'sidebar-open':'canvas-first'} ${present?'presenting':''}`}>
    <header className="header"><div className="brand-mark" aria-hidden="true">fm</div><div className="brand"><b>Funnel & Ecosystem Map</b><span>Working prototype</span></div><div className="document-title"><input aria-label="Map title" value={graph.title} maxLength={120} disabled={busy} onFocus={checkpoint} onChange={e=>setGraph(g=>({...g,title:e.target.value}))}/><span>{storage}</span></div><div className="header-actions"><button aria-pressed={panelOpen} onClick={()=>{setPanelOpen(!panelOpen);fit();}}>Tools</button><button onClick={()=>importRef.current.click()} disabled={busy}>Import</button><button onClick={download}>Export JSON</button><button className="dark" onClick={()=>{setPresent(!present);fit();}}>{present?'Back to editing':'Present'}</button></div></header>
    <aside className="conversation"><div className="panel-heading"><h1>Map tools</h1><p>Optional prompts and saved maps.</p></div>
      <div className="examples"><button disabled={busy} onClick={()=>{setPrompt(examples.funnel);setMode('new');}}>Try a funnel</button><button disabled={busy} onClick={()=>{setPrompt(examples.ecosystem);setMode('new');}}>Try an ecosystem</button></div>
      <div className="messages" aria-live="polite">{messages.map((m,i)=><div key={i} className={`message ${m.role}`}><span>{m.role==='user'?'You':m.role==='error'?'Could not update':'Map assistant'}</span><p>{m.text}</p></div>)}{busy&&<div className="message assistant thinking"><span>Map assistant</span><p>Working through the connections…</p><button onClick={()=>abortRef.current?.abort()}>Cancel</button></div>}<div ref={bottomRef}/></div>
      <form className="composer" onSubmit={generate}><div className="mode-switch"><button type="button" aria-pressed={mode==='new'} disabled={busy} onClick={()=>setMode('new')}>Create a map</button><button type="button" aria-pressed={mode==='update'} disabled={busy} onClick={()=>setMode('update')}>Update this map</button></div><label htmlFor="description">{mode==='new'?'Describe your business or funnel':'What would you like to change?'}</label><textarea id="description" value={prompt} maxLength={6000} disabled={busy} onChange={e=>setPrompt(e.target.value)} placeholder={mode==='new'?'Our podcast leads to a free guide, then a workshop…':'Add a coaching offer after the workshop…'}/><button className="primary" disabled={busy||!prompt.trim()||!access?.authorized}>{busy?'Building your map…':mode==='new'?'Create map':'Update map'} <span aria-hidden="true">↗</span></button><small>{access?.authorized?'Descriptions and the current map are sent to AI when you submit.':'AI access is locked. Open this prototype from your Mac to unlock this browser.'}</small></form>
    </aside>
    <section className="workspace" aria-label="Map workspace"><div className="toolbar"><div className="tool-group"><button onClick={addCard} disabled={busy}>+ Add card</button><button onClick={()=>layout()} disabled={busy||!graph.nodes.length}>Arrange</button><select aria-label="Layout direction" value={direction} disabled={busy} onChange={e=>layout(e.target.value)}><option value="LR">Left to right</option><option value="TB">Top to bottom</option></select></div><div className="tool-group"><button aria-label="Undo" onClick={undo} disabled={busy||!history.past.length}>↶ Undo</button><button aria-label="Redo" onClick={redo} disabled={busy||!history.future.length}>↷</button><button onClick={fit}>Fit map</button></div></div>
      <div className="canvas"><ReactFlow nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={connect} onNodeDragStart={checkpoint} onNodesDelete={checkpoint} onEdgesDelete={checkpoint} onNodeClick={(_,n)=>!present&&setSelection({type:'node',id:n.id})} onEdgeClick={(_,e)=>!present&&setSelection({type:'edge',id:e.id})} onPaneClick={()=>setSelection(null)} nodesDraggable={!busy&&!present} nodesConnectable={!busy&&!present} elementsSelectable={!busy&&!present} deleteKeyCode={busy||present?null:['Backspace','Delete']} fitView fitViewOptions={{padding:0.2,maxZoom:0.9}} minZoom={0.12} maxZoom={1.8} defaultEdgeOptions={{type:'smoothstep'}}><Background color="#d8dfd6" gap={24} size={1}/><Controls showInteractive={false}/><MiniMap nodeColor={n=>colors[n.data.kind]} pannable zoomable/></ReactFlow>
      {!graph.nodes.length&&<div className="empty-state"><h2>Your next idea starts here.</h2><p>Describe it on the left, or add your first card.</p></div>}
      {(node||edge)&&!present&&<aside className="inspector" aria-label="Edit selected item"><div className="inspector-title"><h2>{node?'Edit card':'Edit connection'}</h2><button aria-label="Close editor" onClick={()=>setSelection(null)}>×</button></div><fieldset disabled={busy}>{node?<><label>Name<input value={node.data.label} maxLength={100} onFocus={checkpoint} onChange={e=>editNode('label',e.target.value)}/></label><label>Category<select value={node.data.kind} onFocus={checkpoint} onChange={e=>editNode('kind',e.target.value)}>{kinds.map(k=><option key={k}>{k}</option>)}</select></label><label>Description<textarea value={node.data.description} maxLength={600} onFocus={checkpoint} onChange={e=>editNode('description',e.target.value)}/></label><label>Owner<input value={node.data.owner} maxLength={80} placeholder="Who looks after this?" onFocus={checkpoint} onChange={e=>editNode('owner',e.target.value)}/></label><label>Status<select value={node.data.status} onFocus={checkpoint} onChange={e=>editNode('status',e.target.value)}><option>idea</option><option>building</option><option>live</option></select></label></>:<label>Connection label<input value={edge.label||''} maxLength={100} onFocus={checkpoint} onChange={e=>setGraph(g=>({...g,edges:g.edges.map(x=>x.id===edge.id?{...x,label:e.target.value}:x)}))}/></label>}<button className="danger" onClick={remove}>Delete {node?'card':'connection'}</button></fieldset></aside>}
      </div><footer className="canvas-footer"><div className="legend">{kinds.filter(k=>graph.nodes.some(n=>n.data.kind===k)).map(k=><span key={k}><i style={{background:colors[k]}}/>{k}</span>)}</div><span>{graph.nodes.length} cards · {graph.edges.length} connections</span></footer>
    </section>
    <section className="library"><details><summary>Saved maps <span>{library.length}</span></summary><div className="save-row"><input aria-label="Snapshot name" placeholder="Name this snapshot" value={saveName} onChange={e=>setSaveName(e.target.value)}/><button onClick={saveCopy} disabled={busy}>Save copy</button></div>{library.map(item=><button className="saved-map" key={item.id} disabled={busy} onClick={()=>{commit(clone(item.graph));setMode('update');fit();}}>{item.name}<span>Open ↗</span></button>)}<p>Stored on this device. Export JSON to move a map elsewhere.</p></details><button className="text-button" onClick={()=>setShowData(!showData)}>{showData?'Hide':'View'} map data</button></section>
    {notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss notification">×</button></div>}
    {showData&&<div className="data-panel"><button onClick={()=>setShowData(false)}>Close</button><pre>{JSON.stringify(toModel(graph),null,2)}</pre></div>}
    <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={importMap}/>
  </main>;
}
createRoot(document.getElementById('root')).render(<ReactFlowProvider><App/></ReactFlowProvider>);
