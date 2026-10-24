#!/usr/bin/env python3
"""992 GT3 RS : seconde reconstruction indépendante, depuis les profils cotés.
Aucun maillage de production ni de la première proposition n'est lu.
Python 3 + numpy + scipy + Pillow. Axe +Z avant, +Y haut, mètres.
"""
import numpy as np, math, json, struct, io, sys
from pathlib import Path
from scipy.interpolate import PchipInterpolator, make_interp_spline
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
PI=np.pi
parts=[]; materials=[]; groups={'root':{'name':'Porsche_911_GT3_RS_992_V2','translation':[0,0,0]}}
def lin(hexcolor):
 c=np.array([(hexcolor>>16)&255,(hexcolor>>8)&255,hexcolor&255])/255
 return np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4).tolist()
def mat(name,col,metal=0,rough=.4,alpha=1,emissive=None,texture=None,mask=False,clearcoat=False):
 m={'name':name,'pbrMetallicRoughness':{'baseColorFactor':lin(col)+[alpha],'metallicFactor':metal,'roughnessFactor':rough}}
 if alpha<1:m['alphaMode']='BLEND'
 if emissive:m['emissiveFactor']=lin(emissive)
 if texture is not None:m['pbrMetallicRoughness']['baseColorTexture']={'index':texture}
 if mask:m.update(alphaMode='MASK',alphaCutoff=.5)
 if clearcoat:m['extensions']={'KHR_materials_clearcoat':{'clearcoatFactor':1,'clearcoatRoughnessFactor':.13}}
 materials.append(m);return len(materials)-1
paint=mat('Paint_Primary',0xbfc6ca,.55,.22,clearcoat=True)
carbon=mat('Carbon_Exterior',0x21252b,.35,.29)
black=mat('Rubber_Seals',0x0c0e10,.0,.78)
rubber=mat('Tire_Rubber',0x222426,.0,.92)
alloy=mat('Forged_Magnesium',0x52565e,.92,.24)
chrome=mat('Chrome_Trim',0xbcc4c9,.96,.17)
ceramic=mat('Ceramic_Brakes',0x696a69,.48,.65)
caliper=mat('Caliper_PCCB',0xebbd16,.25,.29)
glass=mat('Glass_Windows',0x35444d,.25,.12,.42)
lens=mat('Glass_Headlight_Lens',0xb8c9d0,.15,.09,.20)
reflector=mat('Headlight_Reflector',0xc4d7df,.92,.17)
white=mat('Lights_DRL',0xf2f7fa,.0,.25,emissive=0xabc6d5)
red=mat('Lights_Rear',0xa20c1c,.28,.24,emissive=0x53030a)
leather=mat('Interior_Racetex',0x26282b,.0,.93)
harness=mat('Interior_Harness',0xd01b22,.0,.72)
decal=mat('Decals_Atlas',0xffffff,.1,.48,texture=0,mask=True)
tirelabel=mat('Tire_Sidewall',0xffffff,0,.88,texture=1)
# Textures originales : aucun logo ni photographie externe n'est téléchargé.
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
font=lambda n,b=False:ImageFont.truetype(BOLD if b else FONT,n)
atlas=Image.new('RGBA',(2048,1024),(255,255,255,0));d=ImageDraw.Draw(atlas)
def centered(text,rect,size,fill=(30,32,35,255),bold=True):
 x,y,w,h=rect;f=font(size,bold);bb=d.textbbox((0,0),text,font=f);d.text((x+(w-(bb[2]-bb[0]))/2,y+(h-(bb[3]-bb[1]))/2-bb[1]),text,font=f,fill=fill)
centered('GT3 RS',(0,0,1024,210),150);d.rectangle((0,220,1023,236),fill=(30,32,35,255))
centered('P O R S C H E',(0,270,1024,110),96)
centered('GT3 RS',(0,400,512,110),84)
d.rectangle((1080,30,2000,260),fill=(230,234,231,255));d.rectangle((1080,30,1140,260),fill=(25,53,113,255));centered('S · GT 992',(1150,30,835,230),133)
centered('PORSCHE',(1080,300,920,130),108,fill=(230,230,225,255))
# Petit écusson dessiné : seulement 32 mm une fois posé.
d.polygon([(65,600),(240,600),(235,760),(212,806),(152,842),(91,806),(70,760)],fill=(196,156,65,255),outline=(35,28,20,255),width=7)
centered('PORSCHE',(75,608,155,36),22,fill=(20,18,15,255))
for xx,yy in [(78,653),(165,706)]:
 for k in range(3):d.rectangle((xx,yy+k*19,xx+61,yy+k*19+10),fill=(135,20,23,255))
d.rectangle((129,665,179,773),fill=(191,145,47,255));d.polygon([(144,746),(143,721),(152,707),(150,691),(158,683),(167,690),(165,704),(160,712),(166,729),(164,753),(157,750),(155,730),(150,737),(149,758)],fill=(20,18,16,255))
# Compte-tours et écran du PCM.
d.ellipse((360,580,710,930),fill=(12,15,18,255),outline=(112,118,124,255),width=6)
for k in range(50):
 a=np.deg2rad(130+k*5.2);rr=154;r2=140 if k%5 else 128;x=535;y=755
 d.line((x+rr*np.cos(a),y+rr*np.sin(a),x+r2*np.cos(a),y+r2*np.sin(a)),fill=(235,238,240,255) if k<40 else (213,32,24,255),width=3)
for k in range(10):
 a=np.deg2rad(130+k*26);d.text((522+110*np.cos(a),741+110*np.sin(a)),str(k),font=font(24),fill=(220,225,230,255))
d.line((535,755,450,810),fill=(240,39,26,255),width=5);d.ellipse((525,745,545,765),fill=(130,135,140,255));centered('GT3 RS',(430,800,210,45),25,fill=(230,230,230,255))
d.rounded_rectangle((800,580,1500,930),radius=15,fill=(12,22,28,255));centered('911 GT3 RS',(820,610,660,65),42,fill=(220,230,240,255));d.line((850,860,970,750,1070,810,1170,690,1430,720),fill=(65,159,190,255),width=7)
# Flanc de pneu, typographie sur un anneau.
sidewall=Image.new('RGBA',(1024,1024),(26,28,30,255));sd=ImageDraw.Draw(sidewall)
for rr in [487,469,340,325]:sd.ellipse((512-rr,512-rr,512+rr,512+rr),outline=(39,41,43,255),width=2)
def arc_text(text,r,start,end,size):
 for char,a in zip(text,np.linspace(start,end,len(text))):
  tile=Image.new('RGBA',(80,100));td=ImageDraw.Draw(tile);td.text((40,50),char,anchor='mm',font=font(size,True),fill=(68,71,74,255));tile=tile.rotate(-a-90,resample=Image.Resampling.BICUBIC,expand=True);cx=512+r*np.cos(np.deg2rad(a));cy=512+r*np.sin(np.deg2rad(a));sidewall.alpha_composite(tile,(int(cx-tile.width/2),int(cy-tile.height/2)))
arc_text('MICHELIN',425,225,315,42);arc_text('PILOT SPORT CUP 2',425,140,40,28);arc_text('ZR 20  XL',405,172,190,15)
images=[]
for im in [atlas,sidewall]:
 b=io.BytesIO();im.save(b,format='PNG',optimize=True);images.append(b.getvalue())

def mesh(p,idx,material,group='root',uv=None,norm=None,name=''):
 p=np.array(p,dtype=np.float64).reshape(-1,3);idx=np.array(idx,dtype=np.int32).reshape(-1,3)
 if norm is None:
  norm=np.zeros_like(p);tri=p[idx];fn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);
  for k in range(3):np.add.at(norm,idx[:,k],fn)
  norm/=np.maximum(1e-12,np.linalg.norm(norm,axis=1)[:,None])
 if uv is None:uv=np.zeros((len(p),2))
 parts.append(dict(p=p.astype('float32'),n=np.array(norm,dtype='float32'),uv=np.array(uv,dtype='float32').reshape(-1,2),i=idx,mat=material,group=group,name=name))

def surface(fn,nu,nv,material,flip=False,group='root',keep=None,uvfn=None,name=''):
 p=np.array([[fn(u,v) for v in np.linspace(0,1,nv+1)] for u in np.linspace(0,1,nu+1)])
 du=np.gradient(p,axis=0);dv=np.gradient(p,axis=1);norm=np.cross(du,dv);norm/=np.maximum(1e-12,np.linalg.norm(norm,axis=2)[...,None]);idx=[];uv=[]
 for i in range(nu):
  for k in range(nv):
   if keep and not keep((i+.5)/nu,(k+.5)/nv):continue
   a=i*(nv+1)+k;b=a+nv+1;idx.extend([[a,b,a+1],[b,b+1,a+1]])
 for u in np.linspace(0,1,nu+1):
  for v in np.linspace(0,1,nv+1):uv.append(uvfn(u,v) if uvfn else (u,v))
 idx=np.array(idx)
 if flip:idx=idx[:,::-1];norm=-norm
 mesh(p.reshape(-1,3),idx,material,group,uv,norm.reshape(-1,3),name)

def sphere(center,radii,material,group='root',nu=32,nv=16):
 surface(lambda u,v:np.array(center)+np.array(radii)*[np.sin(PI*v)*np.cos(2*PI*u),np.cos(PI*v),np.sin(PI*v)*np.sin(2*PI*u)],nu,nv,material,group=group)

def box(center,size,material,group='root',bevel=.015):
 # Boîte biseautée : faces planes et coins arrondis par un superellipsoïde.
 center=np.array(center);size=np.array(size)/2;e=.16 if bevel else .03
 def point(u,v):
  a=2*PI*u;b=PI*(v-.5);sp=lambda x:np.sign(x)*abs(x)**e
  return center+size*np.array([sp(np.cos(b))*sp(np.cos(a)),sp(np.sin(b)),sp(np.cos(b))*sp(np.sin(a))])
 surface(point,24,12,material,flip=True,group=group)

def tube(points,r,material,group='root',segments=None,closed=False,sides=8):
 points=np.array(points,float)
 if closed and np.linalg.norm(points[0]-points[-1])>1e-6:points=np.vstack([points,points[0]])
 t=np.r_[0,np.cumsum(np.linalg.norm(np.diff(points,axis=0),axis=1))];t/=t[-1]
 samples=max(16,len(points)*2) if segments is None else segments
 curve=PchipInterpolator(t,points);ts=np.linspace(0,1,samples+1);p=curve(ts);tan=curve.derivative()(ts);tan/=np.linalg.norm(tan,axis=1)[:,None]
 ref=np.tile([0,1,0],(len(p),1));ref[np.abs(tan[:,1])>.95]=[1,0,0];a=np.cross(tan,ref);a/=np.linalg.norm(a,axis=1)[:,None];b=np.cross(tan,a);verts=[]
 for i in range(len(p)):
  for theta in np.linspace(0,2*PI,sides+1):verts.append(p[i]+r*(np.cos(theta)*a[i]+np.sin(theta)*b[i]))
 idx=[]
 for i in range(samples):
  for k in range(sides):j=i*(sides+1)+k;idx.extend([[j,j+1,j+sides+1],[j+1,j+sides+2,j+sides+1]])
 mesh(verts,idx,material,group)

def polygon(points,material,group='root'):
 p=np.array(points);mesh(p,[[0,i,i+1] for i in range(1,len(p)-1)],material,group)

def plateYZ(x,outline,thick,material):
 # Extrusion explicite, utile aux supports et dérives.
 p=[[x+s*thick/2,y,z] for s in [-1,1] for z,y in outline];n=len(outline);idx=[]
 for i in range(1,n-1):idx.extend([[0,i+1,i],[n,n+i,n+i+1]])
 for i in range(n):k=(i+1)%n;idx.extend([[i,k,n+i],[k,n+k,n+i]])
 area=sum(outline[i][1]*outline[(i+1)%n][0]-outline[(i+1)%n][1]*outline[i][0] for i in range(n))
 if area<0:idx=[t[::-1] for t in idx]
 mesh(p,idx,material)

def sample(points):
 a=np.array(points);f=PchipInterpolator(a[:,0],a[:,1]);return lambda z:float(f(np.clip(z,a[0,0],a[-1,0])))
# Profils indépendants : 4,572 m de caisse, 1,900 m de largeur, 2,457 m entre essieux.
WIDTH=sample([[-2.286,.69],[-2.036,.90],[-1.55,.95],[-1.207,.95],[-.7,.89],[0,.852],[.65,.884],[1.25,.936],[1.65,.925],[2.006,.88],[2.286,.64]])
CENTER=sample([[-2.286,.67],[-1.95,.84],[-1.6,.86],[-1.1,.79],[.2,.76],[.78,.765],[1.1,.70],[1.6,.62],[2.0,.555],[2.286,.51]])
BELT=sample([[-2.286,.68],[-2.03,.81],[-1.5,.91],[-1.207,.915],[-.6,.84],[0,.795],[.65,.83],[1.25,.905],[1.62,.86],[1.95,.73],[2.286,.56]])
AXLES=[dict(z=1.25,r=.35025,w=.275,t=1.631,front=True),dict(z=-1.207,r=.3672,w=.335,t=1.552,front=False)]
def width(z):
 if z>2.006:return max(.001,.88*np.sqrt(max(0,(2.286-z)/.28)))
 if z< -2.036:return max(.001,.90*np.sqrt(max(0,(z+2.286)/.25)))
 return WIDTH(z)
def top(x,z):
 a=abs(x)/max(.001,width(z));base=CENTER(z)+(BELT(z)-CENTER(z))*np.exp(-((a-.80)/.27)**2)-.018*a**8
 r=np.hypot((abs(x)-.705)/.152,(z-1.887)/.181);weight=np.exp(-(r/1.3)**6)
 return base*(1-weight)+(.735-(z-1.887)*.72)*weight

def arch(z):
 y=.17
 for a in AXLES:
  dz=z-a['z'];R=a['r']+.031
  if abs(dz)<R:y=max(y,a['r']+np.sqrt(R*R-dz*dz))
 return y
def shoulder(z):return .065*min(1.,max(0.,(z+2.036)/.25),max(0.,(2.006-z)/.25))
def side_x(z,y):
 w=width(z);r=shoulder(z);yt=top(w-r,z);h=yt-r
 if r>.00001 and y>h:return w-r+r*np.sqrt(max(0,1-((y-h)/r)**2))
 q=np.clip((h-y)/max(.001,h-arch(z)),0,1)
 return w-.020*np.sin(PI*q)-.065*q*q+.020*np.sin(2*PI*q)*np.exp(-(z/.9)**4)
# Dessus : la fenêtre centrale est entièrement omise, les bords de baie sont exacts.
for z0,z1,opening in [(-2.286,-1.62,False),(-1.62,.83,True),(.83,2.286,False)]:
 for s in [-1,1]:
  def f(u,v):
   z=z0+(z1-z0)*u;inner=.69 if opening else 0;x=s*(inner+(width(z)-shoulder(z)-inner)*v);return[x,top(x,z),z]
  surface(f,86 if opening else 64,28,paint,flip=s<0)
# Flanc à double galbe, bord inférieur remonté exactement au passage du pneu.
for s in [-1,1]:
 def f(u,v):
  z=-2.036+4.042*u;w=width(z);yt=top(w-shoulder(z),z);low=arch(z);y=yt*(1-v)+low*v
  x=side_x(z,y)
  frontBlend=np.clip((z-1.72)/.286,0,1);rearBlend=np.clip((-z-1.75)/.286,0,1)
  z+=frontBlend*(.28*(1-(x/.88)**2)-.10*np.clip((.60-y)/.45,0,1)**2)
  z-=rearBlend*(.25*(1-(x/.90)**2)-.10*np.clip((.65-y)/.50,0,1)**2)
  return[s*x,y,z]
 surface(f,250,18,paint,flip=s<0)
 for a in AXLES:
  pts=[]
  for t in np.linspace(0,PI,65):
   z=a['z']+(a['r']+.032)*np.cos(t);pts.append([s*(width(z)-.025),a['r']+(a['r']+.032)*np.sin(t),z])
  tube(pts,.007,paint,segments=80,sides=6)
  surface(lambda u,v:[s*(width(a['z']+(a['r']+.03)*np.cos(PI*u))-.025-v*.20),a['r']+(a['r']+.03)*np.sin(PI*u),a['z']+(a['r']+.03)*np.cos(PI*u)],64,4,black,flip=s>0)
 # Bas de caisse en forme d'aile, et non barre cylindrique.
 surface(lambda u,v:[s*(.83+.075*np.sin(PI*v)),.135+.050*v,-.80+1.72*u],44,8,carbon,flip=s>0)
box([0,.16,0],[1.5,.035,3.9],carbon)
# Serre : pavillon galbé, grandes surfaces vitrées et montants pleins raccordés.
roofH=sample([[-.90,1.235],[-.70,1.292],[-.38,1.322],[-.08,1.316],[.16,1.29]])
roofW=sample([[-.90,.605],[-.6,.625],[-.08,.622],[.16,.603]])
def roof(z,xn):return[xn*roofW(z),roofH(z)-.060*xn*xn,z]
surface(lambda u,v:roof(-.90+1.06*u,2*v-1),52,40,paint)
# Pare-brise bombé, plus large à la base ; trois coordonnées progressent ensemble.
def windshield(u,v):
 x=(2*v-1)*(.726*(1-u)+.603*u);z=.83*(1-u)+.16*u
 y=(.796-.020*(2*v-1)**2)*(1-u)+(1.29-.06*(2*v-1)**2)*u+.028*np.sin(PI*u)*(1-(2*v-1)**2)
 return[x,y,z+.030*(1-(2*v-1)**2)*np.sin(PI*u)]
surface(windshield,40,40,glass,flip=True)
def rearwindow(u,v):
 x=(2*v-1)*(.605*(1-u)+.68*u);z=-.90-.72*u;y=(1.235-.06*(2*v-1)**2)*(1-u)+(.858-.025*(2*v-1)**2)*u+.045*np.sin(PI*u);return[x,y,z]
surface(rearwindow,40,40,glass,flip=True)
for fn in [windshield,rearwindow]:
 for u in [0,1]:tube([fn(u,v) for v in np.linspace(0,1,25)],.007,black)
 for v in [0,1]:tube([fn(u,v) for u in np.linspace(0,1,25)],.013,paint)
# Coordonnée latérale déduite de la hauteur, pour un montant qui suit le vitrage.
def sidepoint(s,z,y):
 x=.799-.18*np.clip((y-.80)/.47,0,1)+.013*np.sin(PI*np.clip((y-.80)/.47,0,1));return[s*x,y,z]
def sidequad(s,points,material,nu=24,nv=12):
 p=np.array(points)
 def f(u,v):
  zy=(1-v)*((1-u)*p[0]+u*p[1])+v*((1-u)*p[3]+u*p[2]);return sidepoint(s,*zy)
 surface(f,nu,nv,material,flip=s<0)
for s in [-1,1]:
 # Vitre principale quadrangulaire et custode triangulaire, séparées par un montant.
 sidequad(s,[(.73,.82),(-.73,.82),(-.73,1.215),(.12,1.23)],glass)
 sidequad(s,[(-.79,.835),(-1.31,.855),(-1.23,.915),(-.79,1.207)],glass)
 sidequad(s,[(.83,.785),(.73,.82),(.12,1.23),(.16,1.23)],paint)
 sidequad(s,[(-.73,.82),(-.79,.835),(-.79,1.207),(-.73,1.215)],carbon)
 sidequad(s,[(-1.62,.84),(-1.31,.855),(-.79,1.207),(-.90,1.235)],paint,36,20)
 # Bord supérieur et joint au nu de la tôle.
 outline=[(.73,.82),(.12,1.23),(-.35,1.265),(-.73,1.215),(-.73,.82),(.73,.82)]
 tube([sidepoint(s,z,y) for z,y in outline],.006,black,segments=70)
 tube([sidepoint(s,z,y) for z,y in [(-1.34,.85),(-1.05,1.03),(-.79,1.207)]],.008,black)
 # Jonction continue entre le bord du toit et le dessus des vitres.
 upper=sample([[-.90,1.17],[-.73,1.215],[-.35,1.265],[.12,1.23],[.16,1.23]])
 def roofrail(u,v):
  z=-.90+1.06*u;a=np.array(sidepoint(s,z,upper(z)));b=np.array(roof(z,s));return a*(1-v)+b*v
 surface(roofrail,60,8,paint,flip=s>0)
 # Montants raccordés aux bords du pare-brise et de la lunette.
 for glazing in [windshield,rearwindow]:
  def pillar(u,v):
   a=np.array(glazing(u,1 if s>0 else 0));b=np.array(sidepoint(s,a[2],a[1]));return a*(1-v)+b*v
  surface(pillar,40,8,paint,flip=(s<0) if glazing==windshield else (s>0))
 # Découpe de porte : suit les changements de section du flanc.
 door=[(.79,.785),(.75,.53),(.65,.29),(.40,.21),(-.61,.21),(-.77,.31),(-.78,.81)]
 tube([[s*(side_x(z,y)+.003),y,z] for z,y in door],.0027,black,segments=90,sides=5)
 box([s*.865,.729,-.52],[.020,.023,.135],carbon)
 # Rétroviseur profilé, embase fuselée, lentille côté conducteur.
 tube([[s*.78,.86,.55],[s*.88,.905,.52],[s*.96,.916,.48]],.012,carbon,sides=8)
 sphere([s*.967,.934,.49],[.073,.047,.125],paint,nu=40,nv=20)
 sphere([s*.967,.931,.394],[.060,.032,.010],chrome,nu=28,nv=12)
# Plancher visible lorsque les portières s'ouvrent.
box([0,.225,-.2],[1.43,.035,2.10],leather)
# Boucliers monoblocs avec lèvres de prise d'air réellement incurvées.
def frontface(x,y):return[x,y,2.286-.28*(abs(x)/.88)**2-.10*np.clip((.60-y)/.45,0,1)**2]
def rearface(x,y):return[x,y,-2.286+.25*(abs(x)/.90)**2+.10*np.clip((.65-y)/.50,0,1)**2]
for isfront in [True,False]:
 fn=frontface if isfront else rearface;w=.88 if isfront else .90
 holes=[(0,.348,.435,.117),(-.673,.368,.163,.125),(.673,.368,.163,.125)] if isfront else [(0,.353,.76,.115)]
 def inside(x,y):return any(abs((x-cx)/rx)**5+abs((y-cy)/ry)**5<1 for cx,cy,rx,ry in holes)
 def skin(u,v):
  x=(2*u-1)*(w-.065*(1-v)**2);z=fn(x,.85)[2];y=.15+v*(top(x,z)-.15);return fn(x,y)
 surface(skin,160,56,paint,flip=not isfront,keep=lambda u,v:not inside(skin(u,v)[0],skin(u,v)[1]))
 for cx,cy,rx,ry in holes:
  def boundary(t,shrink=1,depth=0):
   a=t*2*PI;sp=lambda v:np.sign(v)*abs(v)**.40;x=cx+rx*shrink*sp(np.cos(a));y=cy+ry*shrink*sp(np.sin(a));p=fn(x,y);p[2]+=(-depth if isfront else depth);return p
  # Lèvre interne à trois millimètres, tunnel et fond en retrait.
  tube([boundary(t,1.005,.002) for t in np.linspace(0,1,65)],.007,carbon,closed=True,segments=80,sides=6)
  surface(lambda u,v:boundary(u,1-.10*v,.07*v),80,6,carbon,flip=isfront)
  zsign=1 if isfront else -1
  surface(lambda u,v:fn(cx+rx*1.03*(2*u-1),cy+ry*1.03*(2*v-1))[:2]+[fn(cx+rx*1.03*(2*u-1),cy+ry*1.03*(2*v-1))[2]-.075*zsign],30,12,black,flip=not isfront)
  # Mailles hexagonales : petites cellules qui ont une profondeur visible.
  for row,y in enumerate(np.arange(cy-ry*.75,cy+ry*.75,.027)):
   for x in np.arange(cx-rx*.80,cx+rx*.80,.027):
    xx=x+(row%2)*.0135
    pts=[]
    for a in np.linspace(0,2*PI,7):
     q=fn(xx+.013*np.cos(a),y+.013*np.sin(a));q[2]-=.042*zsign;pts.append(q)
    tube(pts,.0013,carbon,segments=6,closed=True,sides=3)
 # Splitter à section en lame ; masque le joint inférieur des surfaces.
 surface(lambda u,v:[(2*u-1)*(w+.025),.135+.014*np.sin(PI*v),fn((2*u-1)*w,.17)[2]+(.035-v*.16)*(1 if isfront else -1)],100,8,carbon,flip=not isfront)
# Face avant : arêtes horizontales des DRL et petits volets actifs latéraux.
for s in [-1,1]:
 tube([frontface(s*x,.508+.014*(x-.55)) for x in np.linspace(.51,.79,12)],.006,white,sides=6)
 for y in [.30,.39]:surface(lambda u,v:[s*(.52+.28*u),y+.009*np.sin(PI*v),frontface(s*(.52+.28*u),y)[2]-.03-v*.085],24,6,carbon,flip=s<0)
 # Deux grandes évacuations de capot, contour en trapèze et déflecteur affleurant.
 def duct(u,v):
  z=.91+.70*u;x=s*(.11+(.31-.09*u)*v);return[x,top(x,z)+.003,z]
 surface(duct,36,18,black,flip=s<0)
 for v in [0,1]:tube([duct(u,v) for u in np.linspace(0,1,20)],.006,carbon)
 for u in [.08,.36,.64,.90]:
  surface(lambda a,b:[duct(u,a)[0],duct(u,a)[1]+.020*np.sin(PI*b),duct(u,a)[2]+.05*(b-.5)],16,6,carbon,flip=s<0)
 # Louvres sur l'aile : découpe noire dessous, cinq lamelles à profil d'aile.
 surface(lambda u,v:[s*(.73+.16*v),top(s*(.73+.16*v),1.08+.43*u)+.003,1.08+.43*u],28,8,black,flip=s<0)
 for z in np.linspace(1.10,1.47,5):
  surface(lambda u,v:[s*(.73+.16*u),top(s*(.73+.16*u),z)+.015*np.sin(PI*v),z+.040*(v-.5)],12,8,carbon,flip=s<0)
 # Fentes de décharge derrière les roues avant et arrière, contour et aéroblade.
 for z,y,h in [(.775,.50,.28),(-1.67,.54,.26)]:
  polygon([[s*(width(z)-.019),y-h/2,z],[s*(width(z)-.019),y+h/2,z],[s*(width(z-.13)-.019),y+h*.35,z-.13],[s*(width(z-.13)-.019),y-h*.40,z-.13]][::s],black)
  plateYZ(s*(width(z)+.008),[(z-.13,y-h*.53),(z-.12,y+h*.55),(z-.22,y+h*.30),(z-.21,y-h*.52)],.012,carbon)
 # Joint du capot courbe, avec arête qui suit le profil.
 tube([[s*(.48-.15*u),top(s*(.48-.15*u),.83+1.30*u)+.002,.83+1.30*u] for u in np.linspace(0,1,40)],.0023,black,sides=5)
# Phares : les ellipses épousent l'aile ; aucun disque ne dépasse sur une tige.
for s in [-1,1]:
 cx=s*.705;cz=1.887;rx=.152;rz=.181
 def lamp(u,v,lift=0):
  a=u*2*PI;r=v;x=cx+rx*r*np.cos(a);z=cz+rz*r*np.sin(a)
  return[x,.735-(z-1.887)*.72+.006+lift+.014*(1-r*r),z]
 surface(lambda u,v:lamp(u,v),80,18,black)
 tube([lamp(u,1,.003) for u in np.linspace(0,1,81)],.0055,chrome,closed=True,segments=100,sides=7)
 # Quatre logements optiques, deux niveaux ; fibres de jour en carré.
 for dx in [-.055,.055]:
  for dz in [-.064,.064]:
   x=cx+dx;z=cz+dz;y=.735-(z-1.887)*.72+.020
   sphere([x,y,z],[.041,.014,.043],reflector,nu=24,nv=12)
   tube([[x+.041*np.cos(a),y-.72*.043*np.sin(a),z+.043*np.sin(a)] for a in np.linspace(0,2*PI,25)],.003,chrome,closed=True,segments=24,sides=6)
   surface(lambda u,v:[x+.019*(2*u-1),y+.014,z+.005*(2*v-1)],8,3,white,flip=True)
 # Lentille galbée transparente par-dessus tous les éléments internes.
 surface(lambda u,v:lamp(u,v,.022),80,18,lens)
# Rear LED bar exactement sur la face arrière, pas une barre flottante.
tube([rearface(x,.701) for x in np.linspace(-.845,.845,100)],.0085,red,segments=120,sides=6)
for s in [-1,1]:
 tube([rearface(s*x,.710+.07*(x-.78)) for x in np.linspace(.72,.88,20)],.013,red,sides=6)
for x in [-.125,.125]:
 # Tubes d'échappement creux, bord roulé et profondeur sombre.
 surface(lambda u,v:[x+.043*np.cos(2*PI*u),.252+.043*np.sin(2*PI*u),-2.286+.17*v],48,6,chrome)
 tube([[x+.043*np.cos(a),.252+.043*np.sin(a),-2.287] for a in np.linspace(0,2*PI,49)],.003,chrome,closed=True,segments=48,sides=5)
 surface(lambda u,v:[x+.037*v*np.cos(2*PI*u),.252+.037*v*np.sin(2*PI*u),-2.19],32,6,black,flip=True)
for x in [-.67,-.43,0,.43,.67]:plateYZ(x,[(-2.27,.12),(-1.80,.15),(-1.80,.23),(-2.22,.29)],.012,carbon)
# Grille du capot moteur et troisième feu.
for x in np.linspace(-.40,.40,15):
 surface(lambda u,v:[x+.009*(2*v-1),top(x,-1.67-.28*u)+.006,-1.67-.28*u],12,4,carbon,flip=True)
box([0,.89,-1.65],[.10,.022,.045],red)
# Aileron : deux vrais profils fermés, flasque et supports d'épaisseur variable.
def airfoil(x,y,z,chord,span,angle):
 # Profil NACA symétrique de 9 %, arrondi en bord d'attaque.
 def f(u,v):
  theta=2*PI*v;q=(1-np.cos(theta))/2
  thickness=5*.09*(.2969*np.sqrt(max(0,q))-.1260*q-.3516*q*q+.2843*q**3-.1036*q**4)
  yy=np.sign(np.sin(theta))*thickness*chord;zz=(q-.5)*chord
  return[x+(2*u-1)*span/2,y+yy*np.cos(angle)-zz*np.sin(angle),z+zz*np.cos(angle)+yy*np.sin(angle)]
 surface(f,52,36,carbon,flip=True)
airfoil(0,1.215,-1.989,.39,1.835,-.12);airfoil(0,1.435,-1.995,.29,1.835,-.22)
for s in [-1,1]:
 plateYZ(s*.927,[(-1.74,1.21),(-1.73,1.43),(-1.82,1.49),(-2.20,1.48),(-2.23,1.18),(-1.99,1.17)],.010,carbon)
 plateYZ(s*.46,[(-1.80,.84),(-1.64,1.10),(-1.60,1.40),(-1.66,1.48),(-1.98,1.48),(-1.98,1.445),(-1.70,1.438),(-1.685,1.36),(-1.72,1.08),(-1.865,.85)],.026,carbon)
 # Petits réglages de la fixation, trois boulons de chaque côté.
 for z,y in [(-1.82,.87),(-1.68,1.10),(-1.69,1.42)]:sphere([s*.478,y,z],[.006,.008,.008],chrome,nu=12,nv=6)
 # Déflecteur de toit collé sur le pavillon.
 plateYZ(s*.46,[(-.31,1.288),(-.46,1.315),(-.69,1.284),(-.78,1.24),(-.58,1.28)],.006,carbon)
# Détails de marquage peints, avec atlas original entièrement embarqué.
def atlasUV(rect,u,v):
 x,y,w,h=rect;return[(x+w*u)/2048,(y+h*(1-v))/1024]
for s in [-1,1]:
 # Bande GT3 RS basse, légèrement conformée au flanc.
 surface(lambda u,v:[s*(side_x(-.65+1.25*u,.268+.105*v)+.002),.268+.105*v,-.65+1.25*u],36,6,decal,flip=s>0,uvfn=lambda u,v:atlasUV((0,0,1024,240),1-u if s>0 else u,v))
# Blason sur la pointe du capot, mot Porsche et GT3 RS arrière.
surface(lambda u,v:[(u-.5)*.034,top((u-.5)*.034,2.055+.050*v)+.004,2.055+.050*v],8,12,decal,flip=True,uvfn=lambda u,v:atlasUV((62,598,182,248),u,v))
surface(lambda u,v:rearface((u-.5)*.74,.602+.05*v),48,6,decal,flip=True,uvfn=lambda u,v:atlasUV((0,270,1024,110),1-u,v))
surface(lambda u,v:rearface((u-.5)*.25,.545+.04*v),20,5,decal,flip=True,uvfn=lambda u,v:atlasUV((0,400,512,110),1-u,v))
for fn,sign in [(frontface,1),(rearface,-1)]:
 surface(lambda u,v:[*fn((u-.5)*.49,.335+.115*v)[:2],fn((u-.5)*.49,.335+.115*v)[2]+sign*.014],30,10,decal,flip=sign<0,uvfn=lambda u,v:atlasUV((1080,30,920,230),u if sign>0 else 1-u,v))
# Roues : profil de pneu, lèvre roulée, barillet, branches en Y et écrous centraux.
for a in AXLES:
 for s in [-1,1]:
  name='Wheel_'+('F' if a['front'] else 'R')+('L' if s>0 else 'R');groups[name]={'name':name,'translation':[s*a['t']/2,a['r'],a['z']]}
  r=a['r'];w=a['w'];rim=.254 if a['front'] else .2667;face=s*(w/2-.013)
  profile=np.array([[-w/2+.008,rim],[-w/2-.001,rim+.027],[-w/2-.002,r-.034],[-w/2+.012,r-.013],[-w/2+.033,r-.003],[-w*.30,r],[w*.30,r],[w/2-.033,r-.003],[w/2-.012,r-.013],[w/2+.002,r-.034],[w/2+.001,rim+.027],[w/2-.008,rim]])
  pf=make_interp_spline(np.linspace(0,1,len(profile)),profile,k=2)
  surface(lambda u,v:[pf(v)[0],pf(v)[1]*np.sin(2*PI*u),pf(v)[1]*np.cos(2*PI*u)],100,32,rubber,flip=True,group=name)
  # Trois sillons et incisions obliques de la bande de roulement.
  for xx in [-w*.23,0,w*.23]:tube([[xx,(r-.002)*np.sin(t),(r-.002)*np.cos(t)] for t in np.linspace(0,2*PI,101)],.0022,black,group=name,closed=True,segments=100,sides=5)
  for t in np.linspace(0,2*PI,56,endpoint=False):
   for sg in [-1,1]:tube([[sg*(w*.08+u*w*.33),(r-.0015)*np.sin(t+sg*u*.09),(r-.0015)*np.cos(t+sg*u*.09)] for u in [0,.5,1]],.0014,black,group=name,segments=4,sides=3)
  # Anneau de flanc portant les inscriptions moulées.
  def wall(u,v):
   rr=rim+.015+(r-.032-rim-.015)*v;t=2*PI*u;return[s*(w/2+.002),rr*np.sin(t),rr*np.cos(t)]
  surface(wall,100,12,tirelabel,flip=s<0,group=name,uvfn=lambda u,v:[.5+.5*(rim+.015+(r-.032-rim-.015)*v)/r*np.sin(2*PI*u),.5+.5*(rim+.015+(r-.032-rim-.015)*v)/r*np.cos(2*PI*u)])
  # Jante en coupe, forme continue au rebord.
  rimprof=np.array([[-w*.42,rim-.014],[-w*.35,rim-.026],[w*.32,rim-.026],[w*.43,rim-.009],[w*.48,rim-.004],[w*.48,rim-.013],[w*.41,rim-.024]])
  rf=make_interp_spline(np.linspace(0,1,len(rimprof)),rimprof,k=2)
  surface(lambda u,v:[rf(v)[0],rf(v)[1]*np.sin(2*PI*u),rf(v)[1]*np.cos(2*PI*u)],96,20,alloy,flip=True,group=name)
  def spoke(a0,a1,r0,r1,w0,w1):
   # Extrusion trapézoïdale : branche aplatie et concave, pas un cylindre.
   pts=[]
   for depth in [-.010,.010]:
    for rr,ang,ww,sg in [(r0,a0,w0,-1),(r1,a1,w1,-1),(r1,a1,w1,1),(r0,a0,w0,1)]:
     x=face-s*(.030*(1-rr/rim))+depth;pts.append([x,rr*np.sin(ang)+sg*ww*np.cos(ang)/2,rr*np.cos(ang)-sg*ww*np.sin(ang)/2])
   mesh(pts,[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]],alloy,name)
  for theta in np.linspace(0,2*PI,10,endpoint=False):
   spoke(theta,theta,.045,.14,.024,.020)
   for branch in [-1,1]:spoke(theta,theta+branch*.070,.13,rim-.019,.016,.011)
  def axialdisc(rr,xx,material,depth=.012):
   surface(lambda u,v:[xx+(v-.5)*depth,rr*np.sin(2*PI*u),rr*np.cos(2*PI*u)],64,2,material,flip=True,group=name)
   for sg in [-1,1]:surface(lambda u,v:[xx+sg*depth/2,rr*v*np.sin(2*PI*u),rr*v*np.cos(2*PI*u)],64,8,material,flip=sg<0,group=name)
  axialdisc(.052,face,alloy,.028);axialdisc(.030,face+s*.014,chrome,.008);axialdisc(.020,face+s*.019,black,.006)
  # Centre à six pans et bague de verrouillage rouge.
  for t in np.linspace(0,2*PI,6,endpoint=False):sphere([face+s*.021,.037*np.sin(t),.037*np.cos(t)],[.003,.004,.004],chrome,group=name,nu=10,nv=5)
  dr=.205 if a['front'] else .195;discX=face-s*.047
  axialdisc(dr,discX,ceramic,.013);axialdisc(.079,discX+s*.008,alloy,.012)
  for ring in [dr*.64,dr*.80,dr*.92]:
   for t in np.linspace(0,2*PI,32,endpoint=False):
    theta=t+ring*.34;cy=ring*np.sin(theta);cz=ring*np.cos(theta)
    surface(lambda u,v:[discX+s*.007,cy+.0035*v*np.sin(2*PI*u),cz+.0035*v*np.cos(2*PI*u)],6,1,black,flip=s<0,group=name)
  # Les étriers ne font pas partie de la roue animée.
  gx=s*a['t']/2+face-s*.056;gy=a['r']+.035;gz=a['z']-.155
  box([gx,gy,gz],[.080,.225,.080],caliper)
  surface(lambda u,v:[gx+s*.041,gy-.070+.14*u,gz-.020+.040*v],18,6,decal,flip=s<0,uvfn=lambda u,v:atlasUV((1080,300,920,130),u,v))
# Habitacle : baquets profilés, ceintures, panneaux de porte et planche de bord.
for s in [-1,1]:
 cx=s*.35
 # Coque qui s'évase aux épaules et se rétrécit derrière la tête.
 seatWidth=sample([[.38,.22],[.55,.24],[.78,.235],[.90,.20],[1.08,.125]])
 def seat(u,v):
  y=.38+.70*u;x=cx+(2*v-1)*seatWidth(y);z=-.57-.11*u+.10*(2*v-1)**2
  return[x,y,z]
 surface(seat,42,30,carbon,flip=True)
 surface(lambda u,v:[seat(u,.18+.64*v)[0],seat(u,.18+.64*v)[1],seat(u,.18+.64*v)[2]+.020],40,22,leather,flip=True)
 box([cx,.39,-.25],[.41,.115,.51],leather)
 # Bourrelets latéraux du baquet et passages de harnais.
 for dx in [-.17,.17]:tube([[cx+dx,.41,.00],[cx+dx,.51,-.36],[cx+dx,.78,-.50],[cx+dx*.78,.92,-.57]],.026,leather,segments=32,sides=8)
 for dx in [-.060,.060]:
  box([cx+dx,.927,-.622],[.055,.031,.008],black)
  tube([[cx+dx,.92,-.605],[cx+dx,.73,-.49],[cx+dx,.46,-.22]],.013,harness,segments=24,sides=6)
 box([cx,.44,-.15],[.046,.027,.043],chrome)
 # Panneau de porte avec accoudoir et sangle de fermeture.
 box([s*.748,.55,-.02],[.047,.38,1.14],leather)
 tube([[s*.716,.64,.25],[s*.716,.62,-.25]],.024,carbon)
 tube([[s*.711,.65,.25],[s*.704,.59,.23],[s*.711,.56,.14]],.009,harness)
 # Arceau derrière les sièges.
 tube([[s*.62,.25,-1.05],[s*.60,.99,-1.02],[s*.48,1.13,-.92]],.021,carbon,segments=28)
# Barre supérieure, diagonale et renforts de l'arceau.
tube([[-.48,1.13,-.92],[0,1.20,-.92],[.48,1.13,-.92]],.021,carbon,segments=30)
tube([[-.59,.34,-1.05],[.56,1.09,-.98]],.020,carbon)
box([0,.72,.55],[1.36,.18,.30],leather)
box([0,.46,.10],[.18,.32,.80],carbon)
box([0,.638,.27],[.036,.075,.055],chrome)
for x in [-.56,-.10,.52]:box([x,.768,.385],[.13,.035,.018],black)
# Volant reconnu par le contrat du jeu, palettes et boutons réellement présents.
groups['Interior_SteeringWheel']={'name':'Interior_SteeringWheel','translation':[.35,.78,.29],'rotation':[-.1494381325,0,0,.9887710779]}
stg='Interior_SteeringWheel'
tube([[.164*np.cos(t),.164*np.sin(t),0] for t in np.linspace(0,2*PI,65)],.015,leather,group=stg,closed=True,segments=80,sides=10)
for theta in [0,PI,1.5*PI]:tube([[0,0,0],[.13*np.cos(theta),.13*np.sin(theta),.004]],.015,carbon,group=stg,segments=10)
box([0,0,.003],[.10,.08,.035],leather,group=stg)
for x in [-.085,.085]:
 for y in [-.035,.030]:sphere([x,y,-.013],[.011,.011,.007],chrome,group=stg,nu=16,nv=8)
 box([x*1.3,.025,.035],[.018,.105,.011],chrome,group=stg)
# Compte-tours central, afficheurs latéraux et PCM avec texture originale.
for x in [.22,.48]:box([x,.82,.388],[.12,.11,.012],black)
surface(lambda u,v:[.35+(u-.5)*.145,.745+.145*v,.381],16,16,decal,flip=True,uvfn=lambda u,v:atlasUV((360,580,350,350),u,v))
surface(lambda u,v:[-.30+.33*u,.72+.15*v,.379],24,10,decal,flip=True,uvfn=lambda u,v:atlasUV((800,580,700,350),u,v))
# Essuie-glaces posés sur la base du pare-brise.
for x in [-.23,.30]:tube([[x,.810,.808],[x+.15,.835,.768],[x+.31,.85,.725]],.004,black,sides=5)
# Texture de carbone tissée et normale, toutes deux présentes dans le GLB.
S=256;yy,xx=np.mgrid[:S,:S];cell=16;vertical=((xx//cell+yy//cell)//2)%2==0
fiber=np.where(vertical,np.sin(xx*PI/2),np.sin(yy*PI/2));stripe=np.where(vertical,np.cos((xx%cell)/cell*2*PI),np.cos((yy%cell)/cell*2*PI));h=.35*stripe+.10*fiber
val=np.uint8(np.clip(29+8*stripe+3*fiber,0,255));tex=np.stack([val,val+1,val+3,np.full_like(val,255)],axis=-1)
dy,dx=np.gradient(h);normal=np.stack([-dx*.16,-dy*.16,np.ones_like(dx)],-1);normal/=np.linalg.norm(normal,axis=-1)[...,None];nm=np.uint8(np.clip((normal*.5+.5)*255,0,255))
for ar in [tex,nm]:
 b=io.BytesIO();Image.fromarray(ar).save(b,format='PNG');images.append(b.getvalue())
materials[carbon]['pbrMetallicRoughness'].update(baseColorFactor=[1,1,1,1],baseColorTexture={'index':2});materials[carbon]['normalTexture']={'index':3,'scale':.45}
for p in parts:
 if p['mat']==carbon:p['uv']*=18
# Fusion par matériau et par groupe animé. Aucun pivot de roue n'est fusionné.
merged={}
for p in parts:merged.setdefault((p['group'],p['mat']),[]).append(p)
j={'asset':{'version':'2.0','generator':'Original 992 surface reconstruction v2 / porsche911-v2.py','extras':{'authoredFromScratch':True,'productionGeometryRead':False,'wheelbaseMeters':2.457}},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[],'meshes':[],'materials':materials,'accessors':[],'bufferViews':[],'buffers':[],'images':[],'textures':[],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}],'extensionsUsed':['KHR_materials_clearcoat']}
chunks=[];length=0

def data_view(b,target=None):
 global length
 i=len(j['bufferViews']);v={'buffer':0,'byteOffset':length,'byteLength':len(b)}
 if target:v['target']=target
 j['bufferViews'].append(v);pad=(-len(b))%4;chunks.extend([b,b'\0'*pad]);length+=len(b)+pad;return i

def accessor(a,kind):
 a=np.ascontiguousarray(a);view=data_view(a.tobytes(),34963 if kind=='SCALAR' else 34962);spec={'bufferView':view,'componentType':5126 if a.dtype==np.float32 else 5125,'count':len(a),'type':kind}
 if kind=='VEC3':spec.update(min=a.min(axis=0).tolist(),max=a.max(axis=0).tolist())
 j['accessors'].append(spec);return len(j['accessors'])-1
for b in images:
 j['images'].append({'bufferView':data_view(b),'mimeType':'image/png'});j['textures'].append({'sampler':0,'source':len(j['images'])-1})
node_ids={}
for key,g in groups.items():node_ids[key]=len(j['nodes']);j['nodes'].append(dict(g,children=[]))
j['nodes'][0]['children']=[n for key,n in node_ids.items() if key!='root']
triangles=0
for (group,material),objects in merged.items():
 pos=np.concatenate([p['p'] for p in objects]);normal=np.concatenate([p['n'] for p in objects]);uv=np.concatenate([p['uv'] for p in objects]);indices=[];offset=0
 for p in objects:indices.append(p['i']+offset);offset+=len(p['p'])
 ix=np.concatenate(indices).astype('uint32').ravel();triangles+=len(ix)//3
 prim={'attributes':{'POSITION':accessor(pos,'VEC3'),'NORMAL':accessor(normal,'VEC3'),'TEXCOORD_0':accessor(uv,'VEC2')},'indices':accessor(ix,'SCALAR'),'material':material}
 mi=len(j['meshes']);j['meshes'].append({'name':materials[material]['name'],'primitives':[prim]});ni=len(j['nodes']);j['nodes'].append({'name':materials[material]['name'],'mesh':mi});j['nodes'][node_ids[group]]['children'].append(ni)
j['buffers']=[{'byteLength':length}];j['asset']['extras']['triangles']=triangles
jb=json.dumps(j,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4);bb=b''.join(chunks)
out=ROOT/'vendor/voitures/porsche-911-gt3-rs-hd-v2.glb' if len(sys.argv)<2 else Path(sys.argv[1]);out.parent.mkdir(parents=True,exist_ok=True)
out.write_bytes(struct.pack('<III',0x46546c67,2,28+len(jb)+len(bb))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(bb),0x004e4942)+bb)
print(json.dumps({'file':str(out),'triangles':triangles,'meshes':len(j['meshes']),'bytes':out.stat().st_size,'textures':len(images)},indent=2))
