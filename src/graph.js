import dagre from '@dagrejs/dagre';

export const kinds = ['audience', 'content', 'capture', 'nurture', 'offer', 'delivery', 'team', 'system'];
export const colors = {audience:'#5177a6',content:'#836c9c',capture:'#42897b',nurture:'#bd8a37',offer:'#ce704b',delivery:'#658b53',team:'#9b6982',system:'#697d87'};
export function arrange(graph, direction = 'LR') {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({rankdir:direction, nodesep:45, ranksep:90, marginx:40, marginy:40});
  graph.nodes.forEach(n => g.setNode(n.id,{width:230,height:180}));
  graph.edges.forEach(e => g.setEdge(e.source,e.target));
  dagre.layout(g);
  return {...graph,nodes:graph.nodes.map(n=>({...n,position:{x:g.node(n.id).x-115,y:g.node(n.id).y-90},data:{...n.data,direction}}))};
}
export function toCanvas(graph, oldNodes = [], preserve = false) {
  const previous = new Map(oldNodes.map(n=>[n.id,n]));
  const next = arrange({title:graph.title,nodes:graph.nodes.map(n=>({id:n.id,type:'business',position:{x:0,y:0},data:{label:n.label,kind:n.kind,description:n.description,owner:n.owner,status:n.status}})),edges:graph.edges.map(e=>({...e,type:'smoothstep',markerEnd:{type:'arrowclosed',color:'#83948b'},style:{stroke:'#83948b',strokeWidth:1.6}}))});
  if(preserve) {
    next.nodes = next.nodes.map(n=>previous.has(n.id)?{...n,position:previous.get(n.id).position,data:{...n.data,direction:previous.get(n.id).data.direction}}:n);
    const placed=next.nodes.filter(n=>previous.has(n.id));
    for(const n of next.nodes.filter(n=>!previous.has(n.id))) {
      while(placed.some(p=>Math.abs(p.position.x-n.position.x)<270&&Math.abs(p.position.y-n.position.y)<220)) n.position.y+=225;
      placed.push(n);
    }
  }
  return next;
}
export function toModel(graph) {
  return {title:graph.title,nodes:graph.nodes.map(n=>({id:n.id,label:n.data.label,kind:n.data.kind,description:n.data.description||'',owner:n.data.owner||'',status:n.data.status||'idea'})),edges:graph.edges.map(e=>({id:e.id,source:e.source,target:e.target,label:typeof e.label==='string'?e.label:''}))};
}
export const examples = {
  funnel: 'Build a creator funnel: short videos and a podcast lead to a free guide. The guide starts a five-email welcome series, which invites people to a live workshop. Workshop attendees can join a membership or apply for private coaching. Membership includes a community and monthly sessions. Show the alternate paths.',
  ecosystem: 'Map an education business ecosystem. A founder creates a podcast and newsletter. Both attract entrepreneurs to workshops. Workshops lead to a membership and a certification program. An operations lead coordinates delivery, a community manager supports members, and a CRM connects registration, email, and customer records. Show business flows and supporting relationships.',
};
export const starter = toCanvas({title:'From first hello to belonging',nodes:[
  {id:'content',label:'Short-form content',kind:'content',description:'Share ideas that bring new people in.',owner:'',status:'idea'},
  {id:'podcast',label:'Podcast',kind:'content',description:'Build trust through longer conversations.',owner:'',status:'idea'},
  {id:'guide',label:'Free guide',kind:'capture',description:'Give people a useful first result.',owner:'',status:'idea'},
  {id:'email',label:'Welcome sequence',kind:'nurture',description:'Help subscribers take the next step.',owner:'',status:'idea'},
  {id:'workshop',label:'Live workshop',kind:'offer',description:'Teach the method together.',owner:'',status:'idea'},
  {id:'membership',label:'Membership',kind:'offer',description:'Continue learning with community.',owner:'',status:'idea'},
  {id:'coaching',label:'Private coaching',kind:'offer',description:'A path for more personal support.',owner:'',status:'idea'},
  {id:'community',label:'Community & sessions',kind:'delivery',description:'Deliver support and ongoing practice.',owner:'',status:'idea'},
],edges:[['content','guide'],['podcast','guide'],['guide','email'],['email','workshop'],['workshop','membership'],['workshop','coaching'],['membership','community']].map(([source,target],i)=>({id:`edge-${i}`,source,target,label:''}))});
