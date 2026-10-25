// Node-only PNG texture decoder for the GLTFLoader integration test.
// Geometry/material loading uses the repository's GLTFLoader unchanged.
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import * as THREE from 'three';
export function decodePNG(input) {
 const b=Buffer.from(input);assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 let w,h,c;const blocks=[];
 for(let i=8;i<b.length;){const n=b.readUInt32BE(i),type=b.toString('ascii',i+4,i+8),d=b.subarray(i+8,i+8+n);i+=12+n;
  if(type==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);assert.equal(d[8],8);assert([2,6].includes(d[9]));assert.equal(d[12],0);c=d[9]===6?4:3;}
  if(type==='IDAT')blocks.push(d);
 }
 assert(w>0&&w<=4096&&h>0&&h<=4096);
 const raw=inflateSync(Buffer.concat(blocks)),stride=w*c,out=new Uint8Array(w*h*c);assert.equal(raw.length,h*(stride+1));
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<h;y++){const f=raw[y*(stride+1)];assert(f<=4);
  for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=c?out[i-c]:0,b=y?out[i-stride]:0,z=y&&x>=c?out[i-stride-c]:0;
   out[i]=(raw[y*(stride+1)+1+x]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,z)][f])&255;
  }
 }
 const data=new Uint8Array(w*h*4);for(let i=0;i<w*h;i++){data.set(out.subarray(i*c,i*c+3),i*4);data[i*4+3]=c===4?out[i*c+3]:255;}
 return {data,width:w,height:h};
}
export function nodeTextures(parser){return {name:'NODE_PNG_TEST_ADAPTER',async loadTexture(index){
 const t=parser.json.textures[index],im=parser.json.images[t.source];assert.equal(im.mimeType,'image/png');assert.equal(im.uri,undefined);
 const pixels=decodePNG(await parser.getDependency('bufferView',im.bufferView));
 const tex=new THREE.DataTexture(pixels.data,pixels.width,pixels.height,THREE.RGBAFormat);tex.flipY=false;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.needsUpdate=true;return tex;
}};}
