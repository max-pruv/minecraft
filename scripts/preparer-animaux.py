"""Emballe les modèles fournis dans des GLB locaux sans décodeur externe.

Usage : python scripts/preparer-animaux.py /chemin/archive2-decompressee
Les maillages, squelettes et clips sont conservés ; les images sont bornées
à 2048 px (albédo) / 1024 px (normales et rugosité). Pillow est nécessaire.
"""
from pathlib import Path
from io import BytesIO
import json
import struct
import sys
from PIL import Image

racine=Path(sys.argv[1])
sortie=Path(__file__).resolve().parents[1]/'vendor/animaux'
sortie.mkdir(exist_ok=True)
modeles={'cow':'vache','cow-2':'vache-pie','realistic_deer':'cerf',
         'horse':'cheval','rabbit':'lapin'}
for source,nom in modeles.items():
    dossier=racine/source
    gltf=json.loads((dossier/'scene.gltf').read_text())
    binaire=bytearray((dossier/gltf['buffers'][0]['uri']).read_bytes())
    for image in gltf.get('images',[]):
        uri=image.pop('uri')
        im=Image.open(dossier/uri)
        normale='normal' in uri.lower()
        im.thumbnail((1024,1024) if normale or 'roughness' in uri.lower() else (2048,2048),Image.Resampling.LANCZOS)
        mime='image/png' if normale or im.mode=='RGBA' else 'image/jpeg'
        buf=BytesIO()
        if mime=='image/png': im.save(buf,format='PNG',optimize=True)
        else: im.convert('RGB').save(buf,format='JPEG',quality=92,optimize=True)
        while len(binaire)%4:binaire.append(0)
        image['bufferView']=len(gltf.setdefault('bufferViews',[]))
        image['mimeType']=mime
        gltf['bufferViews'].append({'buffer':0,'byteOffset':len(binaire),'byteLength':len(buf.getvalue())})
        binaire.extend(buf.getvalue())
    # Des modèles publiés en unlit doivent recevoir le soleil du jeu.
    for mat in gltf.get('materials',[]):
        mat.get('extensions',{}).pop('KHR_materials_unlit',None)
        pbr=mat.setdefault('pbrMetallicRoughness',{})
        if 'metallicRoughnessTexture' not in pbr:
            pbr['metallicFactor']=0
            pbr['roughnessFactor']=.87
    for cle in ['extensionsUsed','extensionsRequired']:
        if cle in gltf:gltf[cle]=[x for x in gltf[cle] if x!='KHR_materials_unlit']
    gltf['buffers']=[{'byteLength':len(binaire)}]
    gltf.setdefault('asset',{})['copyright']=(dossier/'license.txt').read_text()
    texte=json.dumps(gltf,separators=(',',':'),ensure_ascii=False).encode()
    texte+=b' '*((-len(texte))%4)
    binaire+=b'\0'*((-len(binaire))%4)
    contenu=struct.pack('<II',len(texte),0x4e4f534a)+texte+struct.pack('<II',len(binaire),0x004e4942)+binaire
    (sortie/(nom+'-v1.glb')).write_bytes(struct.pack('<III',0x46546c67,2,len(contenu)+12)+contenu)
    print(nom,len(contenu)+12,'octets')
