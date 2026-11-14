export const kinds = ['audience','content','capture','nurture','offer','delivery','team','system'];
const text = (v,max) => typeof v==='string' && v.length<=max;
export function validateGraph(g) {
  if(!g || !text(g.title,120) || !Array.isArray(g.nodes) || !Array.isArray(g.edges) || g.nodes.length>60 || g.edges.length>120) throw new Error('Invalid map. Use at most 60 cards and 120 connections.');
  const ids = new Set();
  for(const n of g.nodes) {
    if(!n || !text(n.id,80) || !/^[a-zA-Z0-9_-]+$/.test(n.id) || ids.has(n.id) || !text(n.label,100) || !n.label.trim() || !kinds.includes(n.kind) || !text(n.description,600) || !text(n.owner,80) || !['idea','building','live'].includes(n.status)) throw new Error('One or more cards has invalid fields.');
    ids.add(n.id);
  }
  const edges = new Set();
  for(const e of g.edges) {
    if(!e || !text(e.id,80) || edges.has(e.id) || !ids.has(e.source) || !ids.has(e.target) || !text(e.label,100)) throw new Error('One or more connections is invalid.');
    edges.add(e.id);
  }
  return {title:g.title,nodes:g.nodes.map(({id,label,kind,description,owner,status})=>({id,label,kind,description,owner,status})),edges:g.edges.map(({id,source,target,label})=>({id,source,target,label}))};
}
const str = {type:'string'};
export const graphSchema = {type:'object',additionalProperties:false,required:['title','summary','nodes','edges'],properties:{
  title:str,summary:str,nodes:{type:'array',items:{type:'object',additionalProperties:false,required:['id','label','kind','description','owner','status'],properties:{id:str,label:str,kind:{type:'string',enum:kinds},description:str,owner:str,status:{type:'string',enum:['idea','building','live']}}}},
  edges:{type:'array',items:{type:'object',additionalProperties:false,required:['id','source','target','label'],properties:{id:str,source:str,target:str,label:str}}},
}};
