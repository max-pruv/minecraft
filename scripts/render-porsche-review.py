"""Rendu EGL du vrai GLB. Aucun rendu génératif ni image de remplacement."""
import ctypes as C, numpy as np, struct,json,sys,io
from pathlib import Path
from PIL import Image
from scipy.spatial.transform import Rotation
E=C.CDLL('libEGL.so.1');G=C.CDLL('libGL.so.1')
def bind(lib,n,ret,*args):
 f=getattr(lib,n);f.restype=ret;f.argtypes=list(args);return f
I=C.c_int;U=C.c_uint;F=C.c_float;P=C.c_void_p
proc=bind(E,'eglGetProcAddress',P,C.c_char_p)
platform=C.CFUNCTYPE(P,U,P,C.POINTER(I))(proc(b'eglGetPlatformDisplayEXT'));display=platform(0x31DD,None,None)
assert bind(E,'eglInitialize',U,P,P,P)(display,None,None)
bind(E,'eglBindAPI',U,U)(0x30A0)
a=(I*15)(0x3033,1,0x3040,0x40,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3025,24,0x3038);cfg=P();num=I();assert bind(E,'eglChooseConfig',U,P,P,P,I,P)(display,a,C.byref(cfg),1,C.byref(num))
W=int(sys.argv[4]) if len(sys.argv)>4 else 1600;H=int(W*.625)
pb=(I*5)(0x3057,W,0x3056,H,0x3038);surface=bind(E,'eglCreatePbufferSurface',P,P,P,P)(display,cfg,pb)
ctx=bind(E,'eglCreateContext',P,P,P,P,P)(display,cfg,None,(I*3)(0x3098,3,0x3038));assert bind(E,'eglMakeCurrent',U,P,P,P,P)(display,surface,surface,ctx)
fn={}
def gl(n,ret,*types):
 f=bind(G,'gl'+n,ret,*types);fn[n]=f;return f
createShader=gl('CreateShader',U,U);shaderSource=gl('ShaderSource',None,U,I,P,P);compileShader=gl('CompileShader',None,U);getShader=gl('GetShaderiv',None,U,U,P);getLog=gl('GetShaderInfoLog',None,U,I,P,P)
createProgram=gl('CreateProgram',U);attach=gl('AttachShader',None,U,U);link=gl('LinkProgram',None,U);use=gl('UseProgram',None,U);loc=gl('GetUniformLocation',I,U,C.c_char_p)
umat=gl('UniformMatrix4fv',None,I,I,U,P);u3=gl('Uniform3f',None,I,F,F,F);u1=gl('Uniform1f',None,I,F);ui=gl('Uniform1i',None,I,I);u4=gl('Uniform4f',None,I,F,F,F,F)
viewport=gl('Viewport',None,I,I,I,I);clearcolor=gl('ClearColor',None,F,F,F,F);clear=gl('Clear',None,U);enable=gl('Enable',None,U);disable=gl('Disable',None,U);depthMask=gl('DepthMask',None,U);blend=gl('BlendFunc',None,U,U)
genVAO=gl('GenVertexArrays',None,I,P);bindVAO=gl('BindVertexArray',None,U);genBuf=gl('GenBuffers',None,I,P);bindBuf=gl('BindBuffer',None,U,U);bufferData=gl('BufferData',None,U,C.c_ssize_t,P,U);attrib=gl('VertexAttribPointer',None,U,I,U,U,I,P);enableAttrib=gl('EnableVertexAttribArray',None,U);draw=gl('DrawElements',None,U,I,U,P)
genTex=gl('GenTextures',None,I,P);bindTex=gl('BindTexture',None,U,U);texImage=gl('TexImage2D',None,U,I,I,I,I,I,U,U,P);texParam=gl('TexParameteri',None,U,U,I);activeTex=gl('ActiveTexture',None,U);mipmap=gl('GenerateMipmap',None,U)
genFB=gl('GenFramebuffers',None,I,P);bindFB=gl('BindFramebuffer',None,U,U);fbTex=gl('FramebufferTexture2D',None,U,U,U,U,I);readPixels=gl('ReadPixels',None,I,I,I,I,U,U,P);finish=gl('Finish',None)
def program(vs,fs):
 p=createProgram()
 for kind,src in [(0x8B31,vs),(0x8B30,fs)]:
  s=createShader(kind);b=src.encode();c=C.c_char_p(b);shaderSource(s,1,C.byref(c),None);compileShader(s);ok=I();getShader(s,0x8B81,C.byref(ok))
  if not ok.value:
   msg=C.create_string_buffer(20000);getLog(s,20000,None,msg);raise RuntimeError(msg.value.decode())
  attach(p,s)
 link(p);return p
VS='''#version 300 es
precision highp float;
layout(location=0) in vec3 pos;layout(location=1) in vec3 normal;layout(location=2) in vec2 uv;
uniform mat4 vp;uniform mat4 lightvp;out vec3 P;out vec3 N;out vec2 UV;out vec4 LS;
void main(){P=pos;N=normal;UV=uv;LS=lightvp*vec4(pos,1.);gl_Position=vp*vec4(pos,1.);}
'''
FS='''#version 300 es
precision highp float;
in vec3 P;in vec3 N;in vec2 UV;in vec4 LS;out vec4 frag;
uniform vec3 eye;uniform vec4 base;uniform float metal;uniform float rough;uniform float coat;uniform vec3 emit;uniform bool mapped;uniform bool mask;uniform bool carbon;uniform bool floorMat;uniform sampler2D tex;uniform sampler2D shadowMap;uniform sampler2D normalMap;uniform bool normalMapped;
const float PI=3.14159265;
vec3 env(vec3 r,float blur){
 vec3 sky=mix(vec3(.045,.055,.07),vec3(.42,.46,.52),smoothstep(-.1,.9,r.y));
 // Grandes boîtes à lumière, reflet lissé par la rugosité de la matière.
 float a=pow(max(0.,dot(r,normalize(vec3(-.6,1.,.5)))),max(2.,90.*(1.-blur)));
 float b=pow(max(0.,dot(r,normalize(vec3(.8,.5,-.6)))),max(2.,75.*(1.-blur)));
 float c=pow(max(0.,dot(r,normalize(vec3(.1,1.,-.15)))),max(2.,65.*(1.-blur)));
 return sky+vec3(3.0,2.9,2.8)*a+vec3(1.7,1.9,2.2)*b+vec3(1.7)*c;
}
float shadow(){vec3 q=LS.xyz/LS.w*.5+.5;if(q.x<0.||q.x>1.||q.y<0.||q.y>1.)return 1.;float s=0.;for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++){float d=texture(shadowMap,q.xy+vec2(x,y)*4./2048.).r;s+=q.z-.0012>d?.25:1.;}return s/25.;}
vec3 brdf(vec3 L,vec3 radiance,vec3 n,vec3 V,vec3 albedo,float m,float r){
 vec3 h=normalize(L+V);float nv=max(dot(n,V),.001),nl=max(dot(n,L),0.),nh=max(dot(n,h),0.),vh=max(dot(V,h),0.);
 float a=r*r,a2=a*a,d=a2/(PI*pow(nh*nh*(a2-1.)+1.,2.));
 float k=pow(r+1.,2.)/8.,g=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));
 vec3 f0=mix(vec3(.04),albedo,m),f=f0+(1.-f0)*pow(1.-vh,5.);
 return ((1.-f)*(1.-m)*albedo/PI+f*d*g/(4.*nv*max(nl,.001)))*radiance*nl;
}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
 vec4 c=base;if(mapped){vec4 t=texture(tex,UV);c.rgb*=pow(t.rgb,vec3(2.2));c.a*=t.a;}
 if(mask&&c.a<.5)discard;
 vec3 n=normalize(N),v=normalize(eye-P);if(!gl_FrontFacing)n=-n;
 float r=rough;
 if(normalMapped){vec3 dp1=dFdx(P),dp2=dFdy(P);vec2 uv1=dFdx(UV),uv2=dFdy(UV);vec3 t=cross(dp2,n)*uv1.x+cross(n,dp1)*uv2.x,b=cross(dp2,n)*uv1.y+cross(n,dp1)*uv2.y;float inv=inversesqrt(max(max(dot(t,t),dot(b,b)),1e-10));vec3 bump=texture(normalMap,UV).xyz*2.-1.;bump.xy*=.45;n=normalize(mat3(t*inv,b*inv,n)*bump);}
 float occ=1.;if(!floorMat)occ=mix(.48,1.,smoothstep(.05,.63,P.y));
 vec3 color=brdf(normalize(vec3(-3.,7.,5.)),vec3(3.3,3.15,2.9),n,v,c.rgb,metal,r)*shadow();
 color+=brdf(normalize(vec3(4.,4.,-5.)),vec3(1.3,1.5,1.8),n,v,c.rgb,metal,r);
 float fres=pow(1.-max(dot(n,v),0.),5.);vec3 F=mix(vec3(.04),c.rgb,metal);
 color+=c.rgb*(1.-metal)*(.22+.18*max(n.y,0.))*occ;
 color+=env(reflect(-v,n),r)*(F+(1.-F)*fres)*(.7+.3*(1.-r))*occ;
 if(floorMat){float ao=1.-.32*exp(-pow(P.x/1.1,4.)-pow(P.z/2.15,4.));color*=ao;}
 color+=emit; color+=coat*env(reflect(-v,n),.10)*(.025+.13*fres);
 float alpha=c.a;if(alpha<.99)alpha=clamp(alpha+fres*.5,0.,1.);
 frag=vec4(pow(aces(color),vec3(1./2.2)),alpha);
}
'''
prog=program(VS,FS);sp=program(VS,'''#version 300 es
precision highp float;out vec4 frag;void main(){frag=vec4(1.);}
''')
def uniformMat(p,name,m):umat(loc(p,name.encode()),1,0,np.ascontiguousarray(m.T,dtype='float32').ctypes.data_as(P))
def unit(x):return x/np.linalg.norm(x)
def look(eye,target):
 z=unit(eye-target);x=unit(np.cross([0,1,0],z));y=np.cross(z,x);m=np.eye(4);m[:3,:3]=[x,y,z];m[:3,3]=-m[:3,:3]@eye;return m
viewname=sys.argv[3];views={'front':([4.1,2.05,5.9],[0,.66,0]),'rear':([4.1,2.0,-6.2],[0,.66,0]),'side':([8.,1.15,0],[0,.65,0]),'front-straight':([0,1.05,8.5],[0,.65,0]),'rear-straight':([0,1.05,-8.5],[0,.65,0]),'detail':([2.,1.5,3.9],[.3,.5,1.15]),'cabin':([1.6,2.6,1.4],[0,.65,-.1])};eye,target=map(np.array,views[viewname]);
pr=np.zeros((4,4));f=1/np.tan(np.deg2rad(33)/2);pr[0,0]=f/(W/H);pr[1,1]=f;pr[2,2]=-1.002;pr[2,3]=-.2002;pr[3,2]=-1
if viewname.endswith('straight') or viewname=='side':
 pr=np.eye(4);pr[0,0]=1/2.65;pr[1,1]=1/(2.65/(W/H));pr[2,2]=-2/100;pr[2,3]=-1
vp=pr@look(eye,target)
lproj=np.eye(4);lproj[0,0]=1/4;lproj[1,1]=1/4;lproj[2,2]=-2/25;lproj[2,3]=-1;lightvp=lproj@look(np.array([-5.,10.,7.]),np.array([0.,0.,0.]))
b=Path(sys.argv[1]).read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);data=b[n+28:]
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];return np.frombuffer(data,dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']],count=a['count']*{'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']],offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(a['count'],-1)
textures=[]
for im in j.get('images',[]):
 bv=j['bufferViews'][im['bufferView']];im=Image.open(io.BytesIO(data[bv['byteOffset']:bv['byteOffset']+bv['byteLength']])).convert('RGBA');arr=np.asarray(im);t=U();genTex(1,C.byref(t));bindTex(0x0DE1,t.value);texImage(0x0DE1,0,0x1908,im.width,im.height,0,0x1908,0x1401,arr.ctypes.data_as(P));texParam(0x0DE1,0x2801,0x2703);texParam(0x0DE1,0x2800,0x2601);texParam(0x0DE1,0x2802,0x2901);texParam(0x0DE1,0x2803,0x2901);mipmap(0x0DE1);textures.append(t.value)
meshes=[]
def add(p,n,uv,ix,mat):
 vao=U();genVAO(1,C.byref(vao));bindVAO(vao.value);arr=np.concatenate([p,n,uv],axis=1).astype('float32');vbo=U();genBuf(1,C.byref(vbo));bindBuf(0x8892,vbo.value);bufferData(0x8892,arr.nbytes,arr.ctypes.data_as(P),0x88E4)
 for i,size,offset in [(0,3,0),(1,3,12),(2,2,24)]:enableAttrib(i);attrib(i,size,0x1406,0,32,P(offset))
 ix=np.asarray(ix,dtype='uint32').ravel();ebo=U();genBuf(1,C.byref(ebo));bindBuf(0x8893,ebo.value);bufferData(0x8893,ix.nbytes,ix.ctypes.data_as(P),0x88E4);meshes.append((vao.value,len(ix),mat))
def visit(i,world):
 node=j['nodes'][i];m=np.eye(4);m[:3,:3]=Rotation.from_quat(node.get('rotation',[0,0,0,1])).as_matrix()@np.diag(node.get('scale',[1,1,1]));m[:3,3]=node.get('translation',[0,0,0]);m=world@m
 if 'mesh'in node:
  for p in j['meshes'][node['mesh']]['primitives']:
   pos=acc(p['attributes']['POSITION'])@m[:3,:3].T+m[:3,3];normal=acc(p['attributes']['NORMAL'])@np.linalg.inv(m[:3,:3]);uv=acc(p['attributes']['TEXCOORD_0']);add(pos,normal,uv,acc(p['indices']),j['materials'][p['material']])
 for c in node.get('children',[]):visit(c,m)
for i in j['scenes'][0]['nodes']:visit(i,np.eye(4))
add(np.array([[-200,-.009,-200],[-200,-.009,200],[200,-.009,200],[200,-.009,-200]]),np.tile([0,1,0],(4,1)),np.zeros((4,2)),[0,1,2,0,2,3],{'name':'FLOOR','pbrMetallicRoughness':{'baseColorFactor':[.32,.35,.38,1],'metallicFactor':0,'roughnessFactor':.85}})
shadow=U();genTex(1,C.byref(shadow));bindTex(0x0DE1,shadow.value);texImage(0x0DE1,0,0x81A6,2048,2048,0,0x1902,0x1405,None);texParam(0x0DE1,0x2801,0x2600);texParam(0x0DE1,0x2800,0x2600);texParam(0x0DE1,0x2802,0x812F);texParam(0x0DE1,0x2803,0x812F)
fb=U();genFB(1,C.byref(fb));bindFB(0x8D40,fb.value);fbTex(0x8D40,0x8D00,0x0DE1,shadow.value,0);viewport(0,0,2048,2048);enable(0x0B71);clear(0x0100);use(sp);uniformMat(sp,'vp',lightvp);uniformMat(sp,'lightvp',lightvp)
for vao,count,mat in meshes:
 if mat.get('alphaMode')=='BLEND':continue
 bindVAO(vao);draw(4,count,0x1405,None)
bindFB(0x8D40,0);viewport(0,0,W,H);clearcolor(.69,.72,.75,1);clear(0x4000|0x0100);use(prog);uniformMat(prog,'vp',vp);uniformMat(prog,'lightvp',lightvp);u3(loc(prog,b'eye'),*eye);activeTex(0x84C1);bindTex(0x0DE1,shadow.value);ui(loc(prog,b'shadowMap'),1);ui(loc(prog,b'tex'),0);ui(loc(prog,b'normalMap'),2)
enable(0x0B44) # Same back-face culling as Three's default FrontSide
for trans in [False,True]:
 if trans:enable(0x0BE2);blend(0x0302,0x0303);depthMask(0)
 for vao,count,mat in meshes:
  if (mat.get('alphaMode')=='BLEND')!=trans:continue
  p=mat.get('pbrMetallicRoughness',{});u4(loc(prog,b'base'),*p.get('baseColorFactor',[1,1,1,1]));u1(loc(prog,b'metal'),p.get('metallicFactor',1));u1(loc(prog,b'rough'),p.get('roughnessFactor',1));u1(loc(prog,b'coat'),mat.get('extensions',{}).get('KHR_materials_clearcoat',{}).get('clearcoatFactor',0));u3(loc(prog,b'emit'),*mat.get('emissiveFactor',[0,0,0]));ui(loc(prog,b'mapped'),'baseColorTexture'in p);ui(loc(prog,b'mask'),mat.get('alphaMode')=='MASK');ui(loc(prog,b'carbon'),'Carbon'in mat.get('name',''));ui(loc(prog,b'floorMat'),mat.get('name')=='FLOOR')
  if 'baseColorTexture'in p:activeTex(0x84C0);bindTex(0x0DE1,textures[j['textures'][p['baseColorTexture']['index']]['source']])
  ui(loc(prog,b'normalMapped'),'normalTexture' in mat)
  if 'normalTexture'in mat:activeTex(0x84C2);bindTex(0x0DE1,textures[j['textures'][mat['normalTexture']['index']]['source']])
  bindVAO(vao);draw(4,count,0x1405,None)
finish();pixels=np.empty((H,W,4),dtype='uint8');readPixels(0,0,W,H,0x1908,0x1401,pixels.ctypes.data_as(P));Image.fromarray(pixels[::-1]).convert('RGB').save(sys.argv[2]);print(sys.argv[2])
