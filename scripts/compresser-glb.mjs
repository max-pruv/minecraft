// Compression de transport sans perte. Les en-têtes HTTP restent à configurer.
import {readFileSync,writeFileSync} from 'node:fs';
import {brotliCompressSync,brotliDecompressSync,constants} from 'node:zlib';
for(const file of process.argv.slice(2)){
 const original=readFileSync(file);
 const br=brotliCompressSync(original,{params:{[constants.BROTLI_PARAM_QUALITY]:11}});
 if(!brotliDecompressSync(br).equals(original))throw new Error('Décompression différente de la source');
 writeFileSync(file+'.br',br);console.log(JSON.stringify({file,decodedBytes:original.length,brotliBytes:br.length}));
}
