"""Original Brick anatomical cage sculpture. Blender 4.3.2, offline CPU.

No imported model or runtime geometry. Main coat is one continuous hand-shaped
loft, sculpt displacement follows anatomical landmarks; jaws/ears are authored
lofts. Only aimable eyeballs use spherical topology. Coordinates in this file
are the delivery frame (X character-left, Y up, Z nose); converted for Blender.
Run: blender -b -t 2 --python-exit-code 1 --python scripts/authoring/build_brick_head_sculpt.py
"""
import bpy, math, json, os
from pathlib import Path
import numpy as np
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'assets/characters/brick'
OUT.mkdir(parents=True,exist_ok=True); (OUT/'textures').mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene; scene.unit_settings.system='METRIC'; scene.unit_settings.scale_length=1
scene.render.threads_mode='FIXED'; scene.render.threads=2
scene.cycles.use_denoising=False
bpy.context.preferences.filepaths.save_version=0
def co(p): return (p[0],-p[2],p[1])
def gauss(x,c,s):return math.exp(-((x-c)/s)**2)
def clamp(x,a=0,b=1):return min(b,max(a,x))
def smooth(a,b,x):
    t=clamp((x-a)/(b-a)); return t*t*(3-2*t)

# Landmark loft: width, front and occiput at each horizontal contour.
RINGS=[(-.21,.225,.066,.10),(-.18,.246,.08,.12),(-.13,.264,.096,.145),
       (-.08,.275,.115,.15),(-.025,.313,.150,.17),(.03,.33,.160,.184),
       (.085,.325,.175,.195),(.14,.293,.193,.197),(.20,.27,.162,.20),
       (.26,.25,.151,.18),(.31,.214,.125,.148),(.35,.138,.077,.092),(.37,.008,.003,.004)]
def interp(y,i):
    for k,(a,b) in enumerate(zip(RINGS[:-1],RINGS[1:])):
        if a[0]<=y<=b[0]:
            prev=RINGS[max(0,k-1)];nxt=RINGS[min(len(RINGS)-1,k+2)];h=b[0]-a[0];t=(y-a[0])/h
            ma=(b[i]-prev[i])/(b[0]-prev[0]);mb=(nxt[i]-a[i])/(nxt[0]-a[0])
            return (2*t**3-3*t*t+1)*a[i]+(t**3-2*t*t+t)*h*ma+(-2*t**3+3*t*t)*b[i]+(t**3-t*t)*h*mb
    return RINGS[0 if y<RINGS[0][0] else -1][i]

def sculpt(theta,y):
    # Squared cheek contour, narrowing at temples and occiput.
    s,c=math.sin(theta),math.cos(theta)
    x=interp(y,1)*math.copysign(abs(s)**.86,s)
    z=(interp(y,2) if c>=0 else interp(y,3))*math.copysign(abs(c)**.72,c)
    front=smooth(.05,.75,c)
    ax=abs(x)
    if front:
        # Connected broad whisker pads; thick pendent flews and cheek folds.
        z+=front*(.049*gauss(ax,.133,.105)*gauss(y,.082,.071)
                  +.020*gauss(ax,.22,.074)*gauss(y,-.007,.08))
        # Recess oral pocket; skin falls back into throat under free upper lip.
        oral=(1-smooth(.10,.157,ax))*(1-smooth(-.010,.020,y))
        z-=front*.105*oral*gauss(y,-.015,.085)
        z+=front*.035*gauss(ax,.086,.070)*gauss(y,.069,.051)
        z+=front*.025*gauss(x,0,.17)*gauss(y,.030,.018)
        z-=front*.012*gauss(x,0,.012)*gauss(y,.082,.044)
        # The medial upper lip covers the incisor crowns in the neutral bite.
        z+=front*.045*gauss(y,.029,.014)*(1-smooth(.080,.140,ax))
        # Permanent heavy brows, with an actual almond aperture in the same skin.
        brow_y=.209+.19*(ax-.11)
        z+=front*.034*gauss(y,brow_y,.028)*gauss(ax,.15,.082)
        # Curved nasal rope stays medial to the eyes, arching over the nasal shield.
        rope_y=.213-.090*(ax/.125)**2
        rope_gate=1-smooth(.075,.115,ax)
        z+=front*.047*gauss(y,rope_y,.015)*rope_gate
        z-=front*.012*gauss(y,rope_y+.024,.008)*rope_gate
        # Individually laid curved forehead furrows, swept out from the glabella.
        gate=smooth(.218,.242,y)*(1-smooth(.326,.366,y))
        for k in range(4):
            curve=.018+k*.034+(y-.235)*(.18+.15*k)+.006*math.sin(y*32+k*.8)
            z+=front*gate*.014*gauss(ax,curve,.014)
            z-=front*gate*.009*gauss(ax,curve-.018,.007)
        z-=front*.009*gauss(x,0,.009)*gauss(y,.278,.058)
        z+=front*.011*gauss(y,.281+.65*x*x,.011)*gauss(x,0,.13)
        # Pendulous flews end below the mandibular lip on each side.
        lip_y=.033
        lip_gate=gauss(ax,.15,.16)
        z+=front*.026*gauss(y,lip_y+.016,.031)*lip_gate
        z-=front*.011*gauss(y,lip_y-.021,.010)*gauss(ax,.23,.052)
        z+=front*.024*gauss(ax,.210,.061)*gauss(y,.034,.064)
        # The upper and lower lids are part of the continuous coat surface.
        dx=ax-.146;dy=y-(.177+.12*dx)
        socket=(dx/.038)**2+(dy/.028)**2
        blend=1-smooth(1.35,2.8,socket)
        if blend>0:
            globe=.147+math.sqrt(max(.000001,.025**2-dx*dx-dy*dy))
            opening=math.sqrt((dx/.025)**2+(dy/.009)**2)
            lid_z=globe+.006*math.tanh((opening-1)*3.5)
            z=z*(1-blend*front)+lid_z*blend*front
        # Curved cheek creases follow mass into the mouth corners.
        for k,off in enumerate([-.012,.028,.068]):
            cy=.057+off-.59*(ax-.14)+.006*math.sin(ax*32+k)
            z-=front*.014*gauss(y,cy,.008)*gauss(ax,.235,.061)
        # Connected squared chin and mandibular skin, ending at the mouth aperture.
        if y<.019:
            jaw_front=.15+.140*smooth(-.145,-.020,y)
            jaw_zone=(1-smooth(.105,.168,ax))*smooth(-.13,-.065,y)
            z=z*(1-jaw_zone*front)+jaw_front*jaw_zone*front
        # Three dewlap rolls with changing length, connected to the collar.
        z+=front*(.008*math.cos((y+.16)*106))*gauss(y,-.145,.052)*gauss(x,0,.205)
    # Warp the actual lip boundary downward into hanging flews. The monotone
    # map keeps every lower facial ring connected and avoids stacked jaw shells.
    bite_close=.008*(1-smooth(.080,.150,ax))*smooth(.017,.026,y)*(1-smooth(.026,.050,y))*front
    drop=.084*smooth(.070,.218,ax)*(1-smooth(.224,.295,ax))*front
    if y<.017:y-=drop*smooth(-.21,.017,y)
    elif y<.026:y-=drop
    else:y-=drop*(1-smooth(.026,.142,y))
    y-=bite_close
    return (x,y,z)

def texture(name,array):
    a=np.clip(array,0,1).astype(np.float32); h,w=a.shape[:2]
    if a.shape[2]==3:a=np.concatenate([a,np.ones((h,w,1),dtype=np.float32)],axis=2)
    im=bpy.data.images.new(name,width=w,height=h,alpha=True);im.pixels.foreach_set(a.ravel());im.filepath_raw=str(OUT/'textures'/f'{name}.png');im.file_format='PNG';im.save();im.pack();return im

# Hand-painted landmark masks in the loft UV space, original deterministic coat.
N=768; yy,xx=np.mgrid[0:N,0:N]; u=xx/(N-1);v=yy/(N-1)
th=(u-.5)*2*np.pi; y=-.21+v*.58
width=np.interp(y,np.array(RINGS)[:,0],np.array(RINGS)[:,1])
x=width*np.sign(np.sin(th))*abs(np.sin(th))**.86;front=np.clip((np.cos(th)-.05)/.7,0,1)
rng=np.random.default_rng(82);grain=rng.normal(0,.012,(N,N))
coat=np.empty((N,N,3)); coat[:]=[.56,.36,.205]
white=(1/(1+np.exp(np.clip((abs(x)-(.038+.032*np.exp(-((y-.19)/.16)**2)))*150,-30,30))))*front
muzzle_white=1/(1+np.exp(np.clip((y-.115)*65,-30,30)))*front
muzzle_white*=1/(1+np.exp(np.clip((abs(x)-.238)*70,-30,30)))
white=np.maximum(white,muzzle_white)
coat=coat*(1-white[:,:,None])+np.array([.84,.805,.704])*white[:,:,None]
patch=np.exp(-(((x-.174)/.105)**4+((y-.218)/.113)**4))*front
coat=coat*(1-patch[:,:,None]*.93)+np.array([.12,.073,.044])*patch[:,:,None]*.93
# Dark mask is pigment, independent of lighting (no painted cast shadow).
mask=np.exp(-((x/.116)**4+((y-.123)/.064)**4))*front*.64
coat=coat*(1-mask[:,:,None])+np.array([.14,.115,.095])*mask[:,:,None]
oral=(1/(1+np.exp(np.clip((abs(x)-.227)*180,-30,30))))*np.exp(-((y-.022)/.006)**4)*front
oral=np.maximum(oral,.85*np.exp(-((y-.014)/.004)**2)*np.exp(-(abs(x)/.142)**8)*front)
lip_y=.022
oral=np.maximum(oral,.88*np.exp(-((y-lip_y)/.005)**2)*np.exp(-(abs(x)/.239)**8)*front)
coat=coat*(1-oral[:,:,None]*.98)+np.array([.035,.019,.019])*oral[:,:,None]*.98
rim_dist=np.sqrt(((abs(x)-.146)/.027)**2+((y-.177-.12*(abs(x)-.146))/.012)**2)
rim=np.exp(-((rim_dist-1)/.23)**2)*.76*front
coat=coat*(1-rim[:,:,None])+np.array([.045,.029,.021])*rim[:,:,None]
# Scar crosses the character's left brow; edges irregular, not a decal stripe.
scar=np.exp(-((x-(.151+.35*(y-.223)+.002*np.sin(y*510)))/.004)**2)*np.exp(-((y-.228)/.039)**8)*front
coat=coat*(1-scar[:,:,None]*.85)+np.array([.52,.27,.22])*scar[:,:,None]*.85
# Restrained follicles break the flat muzzle pigment without copying a reference.
follicle=np.zeros((N,N))
for px,py,r in [(.082,.080,.0027),(.116,.072,.0030),(.151,.061,.0025),(.104,.052,.0026),(.172,.042,.0024)]:
    follicle=np.maximum(follicle,np.exp(-(((abs(x)-px)/r)**2+((y-py)/(r*.7))**2))*front*.65)
coat=coat*(1-follicle[:,:,None])+np.array([.105,.079,.054])*follicle[:,:,None]
coat=np.clip(coat+grain[:,:,None],0,1)
color=texture('brick-coat-basecolor',coat)
rough=texture('brick-coat-roughness',np.repeat((.78+grain*.7)[:,:,None],3,2));rough.colorspace_settings.name='Non-Color'
# Short directional fur engraving, real normal map rather than painted lighting.
ny,nx=np.mgrid[0:512,0:512]; noise=np.random.default_rng(9).normal(0,1,(512,512))
height=.5*noise+.5*np.roll(noise,1,axis=0)+.25*np.roll(noise,2,axis=0)
dx=(height-np.roll(height,1,axis=1))*.07;dy=(height-np.roll(height,1,axis=0))*.035
normal=texture('brick-short-coat-normal',np.stack([.5-dx,.5-dy,np.ones_like(dx)],2));normal.colorspace_settings.name='Non-Color'

def material(name,col,rough=.7,metal=0,coatmap=False):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*col,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Paint';m.node_tree.links.new(vc.outputs['Color'],p.inputs['Base Color'])
    if coatmap:
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=color
        mul=m.node_tree.nodes.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1
        m.node_tree.links.new(tex.outputs['Color'],mul.inputs[1]);m.node_tree.links.new(vc.outputs['Color'],mul.inputs[2]);m.node_tree.links.new(mul.outputs[0],p.inputs['Base Color'])
        rt=m.node_tree.nodes.new('ShaderNodeTexImage');rt.image=roughmap
        m.node_tree.links.new(rt.outputs['Color'],p.inputs['Roughness'])
        nt=m.node_tree.nodes.new('ShaderNodeTexImage');nt.image=normal;nn=m.node_tree.nodes.new('ShaderNodeNormalMap');nn.inputs['Strength'].default_value=.34;m.node_tree.links.new(nt.outputs['Color'],nn.inputs['Color']);m.node_tree.links.new(nn.outputs['Normal'],p.inputs['Normal'])
    return m
roughmap=rough
skin=material('Brick | short fawn-white coat',(.7,.5,.3),coatmap=True)
wet=material('Brick | wet nose and lips',(.035,.026,.022),.3)
oralmat=material('Brick | oral soft tissue',(.15,.04,.04),.65)
enamel=material('Brick | enamel and gold canine',(.78,.69,.48),.38)
eyemat=material('Brick | cornea and brown iris',(.14,.07,.025),.2)

objects=[]
def mesh(name,verts,faces,uvs=None,colors=None,mat=skin,weights=None):
    me=bpy.data.meshes.new(name);me.from_pydata([co(p) for p in verts],[],faces);me.update();obj=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(obj);me.materials.append(mat)
    me.uv_layers.new(name='BrickUV');me.color_attributes.new(name='Paint',type='FLOAT_COLOR',domain='CORNER')
    uv=me.uv_layers['BrickUV'];att=me.color_attributes['Paint'];me.color_attributes.active_color_index=0
    for p in me.polygons:
        p.use_smooth=True
        for li in p.loop_indices:
            vi=me.loops[li].vertex_index;uv.data[li].uv=uvs[vi] if uvs else (.98,.94);att.data[li].color=(*(colors[vi] if colors else (1,1,1)),1)
    if weights:
        for vi,wd in enumerate(weights):
            for bone,w in wd.items():
                if w>1e-6:
                    vg=obj.vertex_groups.get(bone) or obj.vertex_groups.new(name=bone);vg.add([vi],w,'REPLACE')
    objects.append(obj);return obj

def skinweights(p,basey=None):
    x,y,z=p; basey=y if basey is None else basey; front=smooth(0,.12,z);side='L' if x>=0 else 'R'; ax=abs(x)
    j=.73*gauss(ax,.222,.092)*gauss(y,-.026,.10)*front
    d=.68*gauss(x,0,.19)*gauss(y,-.148,.073)*front
    b=.72*gauss(ax,.145,.071)*gauss(y,.224,.032)*front
    lid=.88*gauss(ax,.146,.035)*gauss(y,.193,.019)*front*smooth(.174,.181,y)
    total=j+d+b+lid
    if total>.9:j*=.9/total;d*=.9/total;b*=.9/total;lid*=.9/total
    jaw=.99*(1-smooth(.105,.225,ax))*smooth(-.145,-.060,y)*(1-smooth(.017,.026,basey))*front
    return {'Brick_Head':(1-j-d-b-lid)*(1-jaw),'Brick_Jaw':jaw,'Brick_Jowl_'+side:j*(1-jaw),'Brick_Dewlap':d*(1-jaw),'Brick_Brow_'+side:b*(1-jaw),'Brick_Lid_U_'+side:lid*(1-jaw)}

verts=[];uvs=[];faces=[];weights=[]
U=144;V=76
thetas=list(np.linspace(-math.pi,-1.1,23))[:-1]+list(np.linspace(-1.1,1.1,101))[:-1]+list(np.linspace(1.1,math.pi,23))
heights=list(np.linspace(-.21,-.010,19))[:-1]+[-.010,0,.009,.017,.026,.035,.047,.061,.078,.095,.112]+list(np.linspace(.13,.24,31))[:-1]+list(np.linspace(.24,.37,25))
V=len(heights)-1
for j,y in enumerate(heights):
    for i,theta in enumerate(thetas):
        u=theta/(2*math.pi)+.5;p=sculpt(theta,y);verts.append(p);uvs.append((u,(y+.21)/.58));weights.append(skinweights(p,y))
for j in range(V):
    for i in range(U):
        a=j*(U+1)+i
        midx=(verts[a][0]+verts[a+1][0])*.5
        midy=(heights[j]+heights[j+1])*.5
        # Real opening; upper and lower lip boundaries stay connected at corners.
        if .017<midy<.026 and abs(midx)<.225 and math.cos(thetas[i])>.5:continue
        faces.append((a,a+1,a+U+2,a+U+1))
faces.append(tuple(V*(U+1)+i for i in range(U)))
head=mesh('Brick_Coat_Continuous_Sculpt',verts,faces,uvs,weights=weights)
head['authorship']='Continuous anatomical loft and authored displacement, not assembled primitives'
head['boundary']='Lower ring intentionally open, y=-0.21m; tucks into neck'

# Eyeballs and fitted thick orbital skin ribbons; eye objects remain independent.
for side,sg in [('L',1),('R',-1)]:
    cx=sg*.146; cy=.177; cz=.147; rad=.025
    ev=[];ef=[];ec=[]
    for j in range(17):
        phi=j/16*math.pi
        for i in range(33):
            t=i/32*2*math.pi; X=math.sin(phi)*math.cos(t);Y=math.sin(phi)*math.sin(t);Z=math.cos(phi)
            ev.append((cx+rad*X,cy+rad*Y,cz+rad*Z))
            r=math.sqrt(X*X+Y*Y)
            if Z>0 and r<.24:c=(.009,.006,.004)
            elif Z>0 and r<.58:
                f=.5+.5*math.sin(t*29+r*40);c=(.085+.045*f,.032+.017*f,.009+.009*f)
            else:c=(.16,.13,.10)
            ec.append(c)
    for j in range(16):
        for i in range(32):a=j*33+i;ef.append((a,a+1,a+34,a+33))
    eye=mesh('Brick_Eye_'+side,ev,ef,colors=ec,mat=eyemat,weights=[{'Brick_Head':1}]*len(ev));eye['aim_pivot']=list((cx,cy,cz))
    # Move geometric coordinates to local centre for runtime object aiming.
    for vtx in eye.data.vertices:vtx.co-=Vector(co((cx,cy,cz)))
    eye.location=co((cx,cy,cz))
# Broad, flattened nose shield sculpted from a contour loft with real nostril pits.
nv=[];nf=[];nc=[]
for j in range(25):
    v=j/24; y=.115+.076*v;hw=.073*(.77+.23*math.sin(v*math.pi))
    for i in range(49):
        u=i/48*2-1;x=u*hw;yedge=y+.008*u*u*(1-2*v)
        z=.214+.046*max(0,1-u*u)**.3*max(0,math.sin(v*math.pi))**.45
        # Two oblique nostril bowls, deep enough to read in silhouette.
        nost=gauss(abs(x),.043,.017)*gauss(y,.146+.18*abs(x),.011)
        z-=.019*nost
        z-=.004*gauss(x,0,.003)*gauss(y,.132,.02)
        nv.append((x,yedge,z));n=.018+.015*(1-nost);nc.append((n,n*.78,n*.67))
for j in range(24):
    for i in range(48):a=j*49+i;nf.append((a,a+1,a+50,a+49))
mesh('Brick_Nose_Sculpt',nv,nf,colors=nc,mat=wet,weights=[{'Brick_Head':1}]*len(nv))

# Visible mandible belongs to the continuous skin, separated by the mouth aperture.
def oral_bowl(name,y,lower=True):
    vs=[];fs=[];cs=[];bone='Brick_Jaw' if lower else 'Brick_Head'
    for j in range(7):
        r=j/6
        for i in range(65):
            t=i/64*2*math.pi;x=.127*r*math.copysign(abs(math.sin(t))**.60,math.sin(t));z=.105+(.182 if lower else .076)*r*math.copysign(abs(math.cos(t))**(.18 if lower else .38),math.cos(t))
            vs.append((x,y-.027*(1-r*r)*(1 if lower else -1),z));cs.append((.036+.015*r,.008,.012))
    for j in range(6):
        for i in range(64):a=j*65+i;fs.append((a,a+1,a+66,a+65))
    return mesh(name,vs,fs,colors=cs,mat=oralmat,weights=[{bone:1}]*len(vs))
oral_bowl('Brick_Lower_Gum_Palate',.001,True);oral_bowl('Brick_Upper_Palate',.039,False)

# Oral lining starts on the exact cut edges of the coat, then retreats into
# the throat. Matched boundary weights prevent an exposed lining curtain.
vs=[];fs=[];cs=[];ws=[]
low=heights.index(.017);high=heights.index(.026)
columns=[]
for i in range(U):
    a=low*(U+1)+i
    if abs((verts[a][0]+verts[a+1][0])*.5)<.225 and math.cos(thetas[i])>.5:
        columns.append(i)
columns.append(columns[-1]+1)
for j in range(17):
    v=j/16
    for i in columns:
        up=Vector(verts[high*(U+1)+i]);lo=Vector(verts[low*(U+1)+i])
        p=up.lerp(lo,v)
        bulge=math.sin(v*math.pi)
        p.z-=.205*bulge**.6
        p.y+=.043*math.sin(v*2*math.pi)
        vs.append(tuple(p));cs.append((.008,.002,.003))
        wu=weights[high*(U+1)+i];wl=weights[low*(U+1)+i]
        t=smooth(.30,.65,v)
        ws.append({b:wu.get(b,0)*(1-t)+wl.get(b,0)*t for b in set(wu)|set(wl)})
cols=len(columns)
for j in range(16):
    for i in range(cols-1):a=j*cols+i;fs.append((a,a+1,a+cols+1,a+cols))
fs.append(tuple(j*cols for j in range(17)))
fs.append(tuple(j*cols+cols-1 for j in range(16,-1,-1)))
mesh('Brick_Oral_Lining',vs,fs,colors=cs,mat=oralmat,weights=ws)

# Individual teeth are shaped root-to-crown lofts, never detached from the gum.
def tooth(name,x,z,y,h,w,bone,gold=False):
    vs=[];fs=[]
    for j in range(7):
        q=j/6; rr=w*((.95-.20*q) if abs(h)<.025 else ((1-q)**.45*.88+.12));xx=x+math.copysign(.005*q*q,x)
        for i in range(12):
            t=i/12*2*math.pi;vs.append((xx+rr*math.cos(t),y+h*q,z+rr*.65*math.sin(t)+.004*q*q))
    for j in range(6):
        for i in range(12):a=j*12+i;b=j*12+(i+1)%12;fs.append((a,b,b+12,a+12))
    fs.append(tuple(range(72,84)))
    c=(.62,.37,.075) if gold else (.78,.71,.54)
    return mesh(name,vs,fs,colors=[c]*len(vs),mat=enamel,weights=[{bone:1}]*len(vs))
for sg in [-1,1]:
    tooth('Brick_Lower_Canine_'+str(sg),sg*.096,.276,.001,.040,.012,'Brick_Jaw',sg==1)
    for k in range(3):tooth('Brick_Lower_Incisor_'+str(sg)+'_'+str(k),sg*(.014+.023*k),.268-.009*k/3,.001,.019,.010,'Brick_Jaw')
    for k in range(3):tooth('Brick_Upper_Tooth_'+str(sg)+'_'+str(k),sg*(.033+.030*k),.174-.019*k,.040,-.018,.012,'Brick_Head')
tv=[];tf=[]
for j in range(17):
    v=j/16; z=.064+.166*v; w=.046*math.sin(v*math.pi)**.55
    for i in range(17):
        u=i/16*2-1;tv.append((u*w,-.004+.012*(1-u*u)*math.sin(v*math.pi)-.003*gauss(u,0,.12),z))
for j in range(16):
    for i in range(16):a=j*17+i;tf.append((a,a+1,a+18,a+17))
tongue_n=len(tv);tv.extend([(x,y-.004,z) for x,y,z in tv[:]])
tf.extend([tuple(i+tongue_n for i in f[::-1]) for f in tf[:]])
for j in range(16):
    for i in [0,16]:
        a=j*17+i;tf.append((a,a+17,a+17+tongue_n,a+tongue_n))
for i in range(16):
    for j in [0,16]:
        a=j*17+i;tf.append((a,a+1,a+1+tongue_n,a+tongue_n))
mesh('Brick_Tongue',tv,tf,colors=[(.18,.045,.052)]*len(tv),mat=oralmat,weights=[{'Brick_Jaw':1}]*len(tv))

# Rose ears: a compact rolled helix enclosing a recessed, folded concha.
EAR=[(.216,.282,.015),(.224,.310,.004),(.245,.330,-.018),(.274,.322,-.046),(.293,.301,-.073),(.276,.279,-.086),(.264,.266,-.061),(.249,.251,-.027),(.227,.258,.010)]
def ear_edge(t):
    q=(t%(2*math.pi))/(2*math.pi)*len(EAR);i=int(q);f=q-i
    a=Vector(EAR[(i-1)%len(EAR)]);b=Vector(EAR[i]);c=Vector(EAR[(i+1)%len(EAR)]);d=Vector(EAR[(i+2)%len(EAR)])
    return .5*((2*b)+(-a+c)*f+(2*a-5*b+4*c-d)*f*f+(-a+3*b-3*c+d)*f*f*f)
for side,sg in [('L',1),('R',-1)]:
    vs=[];fs=[];cs=[];ws=[];Ue=48;Ve=8
    center=Vector((.248,.286,-.043))
    for layer in range(2):
        for j in range(Ve+1):
            r=j/Ve
            for i in range(Ue+1):
                t=i/Ue*2*math.pi;edge=ear_edge(t);p=center*(1-r)+edge*r
                # Soft rolled free edge and folded backward upper cartilage.
                p.z+=.014*gauss(r,.84,.14)-.012*(1-r*r)-.022*gauss(t,2.1,.8)*smooth(.45,1,r)
                p.y-=.010*gauss(t,2.1,.8)*smooth(.6,1,r)
                if sg==1:p.y-=.012*gauss(t,2.58,.13)*smooth(.7,1,r)
                p.z-=layer*.005;p.x*=sg;vs.append(tuple(p))
                rim=smooth(.72,.94,r);inner=(.265,.105,.066) if layer==0 else (.30,.18,.09);outer=(.17,.095,.045)
                cs.append(tuple(inner[k]*(1-rim)+outer[k]*rim for k in range(3)))
                w=.92*smooth(.215,.27,abs(p.x));ws.append({'Brick_Ear_'+side:w,'Brick_Head':1-w})
    count=(Ue+1)*(Ve+1)
    for layer in range(2):
        for j in range(Ve):
            for i in range(Ue):
                a=layer*count+j*(Ue+1)+i;f=(a,a+1,a+Ue+2,a+Ue+1);fs.append(f if layer==0 else f[::-1])
    for i in range(Ue):
        a=Ve*(Ue+1)+i;fs.append((a,a+1,a+1+count,a+count))
    mesh('Brick_Rose_Ear_'+side,vs,fs,colors=cs,mat=oralmat,weights=ws)

# Rig: bones point Blender +Y (delivery -Z); local X remains delivery +X.
arm=bpy.data.armatures.new('Brick_Face_Skeleton');rig=bpy.data.objects.new('Brick_Rig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bones={'Brick_Head':(0,0,0),'Brick_Jaw':(0,.035,.01),'Brick_Brow_L':(.146,.22,.16),'Brick_Brow_R':(-.146,.22,.16),'Brick_Jowl_L':(.24,.04,.14),'Brick_Jowl_R':(-.24,.04,.14),'Brick_Dewlap':(0,-.12,.08),'Brick_Ear_L':(.22,.28,-.01),'Brick_Ear_R':(-.22,.28,-.01),'Brick_Lid_U_L':(.146,.177,.147),'Brick_Lid_U_R':(-.146,.177,.147)}
for name,p in bones.items():
    b=arm.edit_bones.new(name);b.head=co(p);b.tail=Vector(co(p))+Vector((0,.05,0));b.roll=0
    if name!='Brick_Head':b.parent=arm.edit_bones['Brick_Head']
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
for obj in objects:
    mod=obj.modifiers.new('Brick face deformation','ARMATURE');mod.object=rig;obj.parent=rig
    # Apply no mirrored or negative object transform.
    obj['original_art']=True
    # Ensure winding consistently outward without changing the intentionally open rings.
    bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');obj.select_set(False)

# CPU Cycles AO bake of the finished geometry, multiplied into original coat.
# The unbaked procedural coat is regenerated at every build, so this is stable.
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32
scene.render.bake.use_selected_to_active=False
scene.render.bake.margin=8
bpy.ops.object.select_all(action='DESELECT');head.select_set(True)
bpy.context.view_layer.objects.active=head
occlusion=bpy.data.images.new('Brick geometry AO bake',width=N,height=N,alpha=False)
occlusion.colorspace_settings.name='Non-Color'
node=skin.node_tree.nodes.new('ShaderNodeTexImage');node.image=occlusion
skin.node_tree.nodes.active=node
bpy.ops.object.bake(type='AO')
ao=np.array(occlusion.pixels[:],dtype=np.float32).reshape(N,N,4)[:,:,:3].mean(axis=2)
baked=coat*(.26+.74*np.clip(ao,0,1))[:,:,None]
rgba=np.concatenate([np.clip(baked,0,1),np.ones((N,N,1))],axis=2).astype(np.float32)
color.pixels.foreach_set(rgba.ravel());color.save();color.pack()
skin.node_tree.nodes.remove(node);bpy.data.images.remove(occlusion)
head.select_set(False)

scene['delivery_frame']='metres, glTF Y up, +Z nose, +X character left; origin neck axis'
scene['reference_limit']='Six owner references not available. Written measurements only. Not approved likeness.'
scene['authoring']='Original continuous cage sculpture; no external asset or API'
scene['rig_limits']='Jaw +X 0 to 0.32 rad opens; spring translations 0.015m nominal, 0.03m stress'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'brick-head.blend'),compress=True)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for obj in objects:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'brick-head.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_morph=False,export_normals=True,export_texcoords=True,export_extras=True,export_apply=False,export_draco_mesh_compression_enable=False,export_image_format='AUTO',export_vertex_color='ACTIVE',export_all_vertex_colors=False)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)
manifest={'asset':'Brick authored head','version':2,'status':'anatomy revision for art review; not integrated or owner-approved','source':'brick-head.blend','runtime':'brick-head.glb','authoringScript':'scripts/authoring/build_brick_head_sculpt.py','blender':bpy.app.version_string,'triangles':triangles,'materials':5,'glbBytes':(OUT/'brick-head.glb').stat().st_size,'bones':list(bones),'morphTargets':[],'textures':[{'file':'textures/'+im.name+'.png','width':im.size[0],'height':im.size[1]} for im in [color,roughmap,normal]],'referenceLimit':'Six owner images unavailable; written spec used. No reference parity claimed.','axes':'+Y up, +Z nose, +X character-left','units':'metres','root':'Brick_Head','jaw':{'axis':'local X','openRadians':[0,.32]},'qa':'qa/character-art/brick/','provenance':'Original offline Blender anatomical loft and displacement; no external meshes/textures'}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('BRICK_DELIVERY',json.dumps(manifest))
