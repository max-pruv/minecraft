#!/usr/bin/env python3
"""Compaction sans perte : valeurs des sommets et images conservées exactement.
Supprime les UV inutilisés, fusionne seulement les sommets identiques bit à bit,
retire les sommets non référencés et choisit des index 16 bits quand possible.
Aucune décimation, quantification, compression de texture avec perte ou extension.
"""
from pathlib import Path
import numpy as np,json,struct,sys,gzip,hashlib,copy

def compact(source,dest):
 b=Path(source).read_bytes();jl=struct.unpack_from('<I',b,12)[0];old=json.loads(b[20:20+jl]);bin=b[28+jl:];j=copy.deepcopy(old);j['accessors']=[];j['bufferViews']=[];chunks=[];length=0
 def view(data,target=None):
  nonlocal length
  v={'buffer':0,'byteOffset':length,'byteLength':len(data)}
  if target:v['target']=target
  j['bufferViews'].append(v);pad=(-len(data))%4;chunks.extend([data,b'\0'*pad]);length+=len(data)+pad;return len(j['bufferViews'])-1
 def read(i):
  a=old['accessors'][i];v=old['bufferViews'][a['bufferView']];assert 'byteStride' not in v and 'sparse' not in a
  dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
  return np.frombuffer(bin,dtype=dtype,count=a['count']*n,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,n)
 def acc(array,oldspec,index=False):
  a={k:v for k,v in oldspec.items() if k not in ['bufferView','byteOffset','count','min','max']};a['count']=len(array);a['bufferView']=view(array.tobytes(),34963 if index else 34962)
  if index:a['componentType']=5123 if array.dtype==np.uint16 else 5125
  if a['type']=='VEC3':a.update(min=array.min(axis=0).tolist(),max=array.max(axis=0).tolist())
  j['accessors'].append(a);return len(j['accessors'])-1
 beforeVerts=afterVerts=0;removedUV=0;proof=[]
 for mi,m in enumerate(j['meshes']):
  for pi,p in enumerate(m['primitives']):
   op=old['meshes'][mi]['primitives'][pi];assert not op.get('targets');attrs=dict(op['attributes']);mat=old['materials'][op['material']]
   textured=any('Texture' in k for k in mat) or any('Texture' in k for k in mat.get('pbrMetallicRoughness',{})) or any('Texture' in k for e in mat.get('extensions',{}).values() if isinstance(e,dict) for k in e)
   if not textured:
    for key in list(attrs):
     if key.startswith('TEXCOORD_'):removedUV+=read(attrs.pop(key)).nbytes
   ix=read(op['indices']).ravel();arrays={k:read(v) for k,v in attrs.items()};beforeVerts+=len(arrays['POSITION'])
   # First remove unreferenced vertices, then compare complete byte records.
   used,inv=np.unique(ix,return_inverse=True);records=np.concatenate([a[used].view(np.uint8).reshape(len(used),-1) for a in arrays.values()],axis=1)
   records=np.ascontiguousarray(records);_,first,lookup=np.unique(records.view(np.dtype((np.void,records.shape[1]))).ravel(),return_index=True,return_inverse=True)
   order=np.argsort(first);rank=np.empty(len(order),dtype=np.int64);rank[order]=np.arange(len(order));selected=used[first[order]];newix=rank[lookup[inv]];newix=newix.astype(np.uint16 if len(selected)<=65535 else np.uint32);afterVerts+=len(selected)
   p['attributes']={}
   digest=hashlib.sha256()
   for key,ai in attrs.items():
    a=arrays[key];newa=a[selected]
    assert np.array_equal(a[ix].view(np.uint8),newa[newix].view(np.uint8)),key
    digest.update(a[ix].tobytes());p['attributes'][key]=acc(newa,old['accessors'][ai])
   p['indices']=acc(newix[:,None],old['accessors'][op['indices']],True);proof.append(digest.hexdigest())
 # Copy image bytes verbatim; no resampling, re-encoding or format change.
 for im in j.get('images',[]):
  v=old['bufferViews'][im['bufferView']];data=bin[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];im['bufferView']=view(data)
 j['buffers']=[{'byteLength':length}];j['asset']['extras']={**j['asset'].get('extras',{}),'losslessCompaction':True,'sourceSha256':hashlib.sha256(b).hexdigest()}
 jb=json.dumps(j,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4);bb=b''.join(chunks);out=struct.pack('<III',0x46546c67,2,28+len(jb)+len(bb))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(bb),0x004e4942)+bb
 dest=Path(dest);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(out);gz=gzip.compress(out,compresslevel=9,mtime=0);Path(str(dest)+'.gz').write_bytes(gz)
 report={'source':str(source),'output':str(dest),'originalBytes':len(b),'compactBytes':len(out),'gzipBytes':len(gz),'reductionPercent':round((1-len(out)/len(b))*100,2),'compressedReductionPercent':round((1-len(gz)/len(b))*100,2),'verticesBefore':beforeVerts,'verticesAfter':afterVerts,'unusedUVBytesRemoved':removedUV,'triangleAttributesBitExact':True,'imageBytesIdentical':True,'primitiveDigests':proof}
 Path(str(dest)+'.report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='primitiveDigests'},indent=2))
if __name__=='__main__':compact(sys.argv[1],sys.argv[2])
