"""Original Old Town masonry buildings, Blender 4.3.2, geometry/PBR only.

python scripts/authoring/build_oldtown_textures.py
blender -b -t 2 --python scripts/authoring/build_oldtown_kit.py
Each building's origin is its front-door line at ground. Blender -Y / glTF +Z faces street.
"""
import bpy,math,json,sys,random
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from city_blender_helpers import material,textured,group,box,mesh,rod,tube,text,uv_planar,batch
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/street/ch01-oldtown';TEX=OUT/'textures'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
random.seed(13117)
M={
 'brick':textured('fired brick and lime mortar',TEX,'brick'),
 'plaster':textured('lime plaster',TEX,'plaster'),
 'front':textured('plaster front with sill runoff',TEX,'plaster','plaster-front-color.png'),
 'roof':textured('terracotta pan tiles',TEX,'roof'),
 'stone':material('carved limestone sills and cornice','#b7ad94',.86),
 'frame':material('painted ivory timber','#d5ccae',.72),
 'green':material('aged green shop timber','#3c594e',.7),
 'iron':material('dark ironwork and pipes','#394344',.56,.2),
 'flashing':material('weathered zinc flashing','#515c5e',.72,.35),
 'glass':material('thin window glass','#a3babe',.19,.03,.17),
 'room':material('dim warm room plaster','#706559',.95),
 'wood':material('interior timber','#5b4936',.85),
 'linen':material('warm linen curtains','#b9a68a',.97),
 'clay':material('unglazed flowerpot','#946549',.9),
 'leaf':material('window herbs','#455b31',.94),
 'dark':material('soil and roof membrane','#333b38',.98),
 'light':material('window lamp glow','#e7bf85',.6,0,1,.55),
 'canvas':material('shop awning canvas','#b99565',.96),
 'gold':material('shop lettering and brass','#d5b57a',.53,.15),
}
for key,m in M.items():m.use_backface_culling=key not in ['glass','linen','leaf','canvas']
for key,strength in [('brick',.85),('roof',1.25)]:
    for n in M[key].node_tree.nodes:
        if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=strength
# Authored corner shading for compact interior pockets, using standard glTF vertex colors.
vc=M['room'].node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color'
M['room'].node_tree.links.new(vc.outputs['Color'],M['room'].node_tree.nodes['Principled BSDF'].inputs['Base Color'])
root=group('Gloryland_OldTown_kit');root['units']='metres';root['front_direction']='glTF +Z';root['asset_version']='0.1-review'
A=group('OldTown_brick_hiproof',(-4.05,0,0),root)
B=group('OldTown_plaster_parapet',(3.45,0,0),root)

def wall(parent,w,h,depth,openings,mat,loc=(0,0,0),rotation=0,base=0):
    """One welded extruded masonry surface with true holes, reveals and closed perimeter."""
    xs=sorted(set([-w/2,w/2]+[x for a in openings for x in [a[0]-a[2]/2,a[0]+a[2]/2]]))
    zs=sorted(set([0,h]+[z for a in openings for z in [a[1],a[1]+a[3]]]))
    solid=set()
    for i in range(len(xs)-1):
        for j in range(len(zs)-1):
            cx=(xs[i]+xs[i+1])/2;cz=(zs[j]+zs[j+1])/2
            if not any(abs(cx-a[0])<a[2]/2 and a[1]<cz<a[1]+a[3] for a in openings):solid.add((i,j))
    vs=[];fs=[];lookup={}
    def v(i,j,k):
        key=(i,j,k)
        if key not in lookup:lookup[key]=len(vs);vs.append((xs[i],base+k*depth,zs[j]))
        return lookup[key]
    for i,j in solid:
        f=(v(i,j,0),v(i+1,j,0),v(i+1,j+1,0),v(i,j+1,0));fs.append(f)
        fs.append(tuple(v(a,b,1) for a,b in [(i,j+1),(i+1,j+1),(i+1,j),(i,j)]))
        if (i-1,j) not in solid:fs.append((v(i,j,0),v(i,j+1,0),v(i,j+1,1),v(i,j,1)))
        if (i+1,j) not in solid:fs.append((v(i+1,j,0),v(i+1,j,1),v(i+1,j+1,1),v(i+1,j+1,0)))
        if (i,j-1) not in solid:fs.append((v(i,j,0),v(i,j,1),v(i+1,j,1),v(i+1,j,0)))
        if (i,j+1) not in solid:fs.append((v(i,j+1,0),v(i+1,j+1,0),v(i+1,j+1,1),v(i,j+1,1)))
    o=mesh('continuous wall with reveals',vs,fs,mat,parent);o.location=loc;o.rotation_euler.z=rotation
    return o

def transform(p,loc,rot):
    x,y,z=p;c,s=math.cos(rot),math.sin(rot);return (loc[0]+x*c-y*s,loc[1]+x*s+y*c,z)
def fitted_box(name,p,size,mat,parent,loc=(0,0,0),rot=0,bevel=.012):
    o=box(name,transform(p,loc,rot),size,mat,parent,bevel);o.rotation_euler.z=rot
    if mat==M['room']:
        color=o.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
        for c in color.data:c.color=(.075,.064,.050,1)
    return o
def pot(parent,x,y,z,loc=(0,0,0),rot=0):
    vs=[];fs=[];n=16
    profile=[(0,.095),(.035,.10),(.24,.135),(.26,.145),(.285,.145),(.285,.12),(.25,.115)]
    for zz,r in profile:
        for i in range(n):a=i/n*math.tau;vs.append(transform((x+r*math.cos(a),y+r*math.sin(a),z+zz),loc,rot))
    for j in range(len(profile)-1):
        for i in range(n):fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    mesh('formed clay pot',vs,fs,M['clay'],parent,True)
    fitted_box('pot soil',(x,y,z+.25),(.19,.19,.018),M['dark'],parent,loc,rot,.04)
    for i in range(9):
        a=i*2.4;length=.20+random.random()*.13;cx=x+math.cos(a)*.08;cy=y+math.sin(a)*.08;cz=z+.32+random.random()*.20
        rod('herb stem',transform((x,y,z+.25),loc,rot),transform((cx,cy,cz),loc,rot),.004,M['leaf'],parent,6)
        # Tapered cupped leaf around a curved central vein.
        vv=[]
        for j in range(5):
            t=j/4;ww=math.sin(t*math.pi)*.028;xx=cx+math.cos(a)*length*t;yy=cy+math.sin(a)*length*t;zz=cz+.05*math.sin(t*math.pi)-.03*t
            for s in [-1,1]:vv.append(transform((xx-math.sin(a)*ww*s,yy+math.cos(a)*ww*s,zz-.012*abs(s)*math.sin(t*math.pi)),loc,rot))
        mesh('curved herb leaf',vv,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(4)],M['leaf'],parent,True)

def window(parent,cx,b,w=1.15,h=1.7,variant=0,loc=(0,0,0),rot=0,shop=False):
    depth=1.05;left=cx-w/2;right=cx+w/2
    # Interior cassette is a volume with sidewalls/floor/ceiling, not a dark pasted rectangle.
    vv=[transform((left+w*i/2,depth,b+h*j/2),loc,rot) for j in range(3) for i in range(3)]
    back=mesh('room rear wall with shaded corners',vv,[(j*3+i,j*3+i+1,(j+1)*3+i+1,(j+1)*3+i) for j in range(2) for i in range(2)],M['room'],parent)
    color=back.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for i,loop in enumerate(back.data.loops):
        center=loop.vertex_index==4;color.data[i].color=(.090,.077,.061,1) if center else (.024,.020,.015,1)
    for x in [left-.02,right+.02]:fitted_box('room side',(x,.68,b+h/2),(.04,.76,h),M['room'],parent,loc,rot,0)
    for z in [b,b+h]:fitted_box('room floor or soffit',(cx,.68,z),(w,.76,.035),M['wood'] if z==b else M['room'],parent,loc,rot,0)
    frame=M['green'] if shop else M['frame']
    for x in [left+.045,right-.045]:fitted_box('window jamb',(x,.205,b+h/2),(.09,.09,h),frame,parent,loc,rot,.012)
    for z in [b+.045,b+h-.045]:fitted_box('window head and sill rail',(cx,.205,z),(w,.09,.09),frame,parent,loc,rot,.012)
    if not shop:
        fitted_box('window centre mullion',(cx,.20,b+h/2),(.045,.08,h-.10),frame,parent,loc,rot,.008)
        fitted_box('window transom',(cx,.20,b+h*.64),(w-.10,.08,.045),frame,parent,loc,rot,.008)
    points=[(left+.08,.255,b+.08),(right-.08,.255,b+.08),(right-.08,.255,b+h-.08),(left+.08,.255,b+h-.08)]
    mesh('recessed glazing',[transform(p,loc,rot) for p in points],[(0,1,2,3)],M['glass'],parent)
    fitted_box('projecting stone sill',(cx,-.08,b-.025),(w+.30,.38,.11),M['stone'],parent,loc,rot,.018)
    fitted_box('masonry lintel',(cx,.015,b+h+.085),(w+.25,.10,.15),M['stone'],parent,loc,rot,.014)
    if shop:
        fitted_box('shop counter',(cx,.76,b+.51),(w*.85,.36,.12),M['wood'],parent,loc,rot,.025)
        for i in range(4):
            fitted_box('folded paper package',(cx-w*.30+i*w*.19,.77,b+.67),(.16,.18,.20+random.random()*.09),M['linen'],parent,loc,rot,.012)
        pot(parent,cx+w*.30,.72,b+.57,loc,rot)
    elif variant%3==0:
        for side in [-1,1]:
            vv=[];a=left+.10 if side<0 else right-.35
            for i in range(11):
                x=a+i*.025;y=.38+.028*math.cos(i*math.pi*.8)
                vv.extend([transform((x,y,b+.07),loc,rot),transform((x,y,b+h-.07),loc,rot)])
            mesh('gathered linen curtain',vv,[(i*2,i*2+2,i*2+3,i*2+1) for i in range(10)],M['linen'],parent,True)
    elif variant%3==1:
        pot(parent,cx+.21,.48,b+.07,loc,rot)
        for i in range(4):fitted_box('books on inner sill',(cx-.35+i*.065,.52,b+.20),(.05,.16,.27+random.random()*.08),M['wood'] if i%2 else M['green'],parent,loc,rot,.006)
    else:
        fitted_box('rolled inner blind',(cx,.43,b+h-.10),(w-.16,.10,.13),M['linen'],parent,loc,rot,.035)
        # One restrained lamp per selected room; warm accent, not a full glowing pane.
        fitted_box('broad inner lamp shelf',(cx,.71,b+.075),(.43,.34,.10),M['wood'],parent,loc,rot,.014)
        fitted_box('window lamp base',(cx,.71,b+.145),(.20,.18,.04),M['wood'],parent,loc,rot,.035)
        rod('window lamp stem',transform((cx,.71,b+.166),loc,rot),transform((cx,.71,b+.50),loc,rot),.014,M['iron'],parent)
        n=16;vs=[]
        for z,r in [(b+.41,.135),(b+.65,.075)]:
            for i in range(n):a=i/n*math.tau;vs.append(transform((cx+math.cos(a)*r,.71+math.sin(a)*r,z),loc,rot))
        mesh('window lamp shade',vs,[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],M['light'],parent)
        if loc==(0,0,0):group('Warm_room_anchor_'+str(int(cx*100))+'_'+str(int(b*100)),(cx,.68,b+.50),parent)

def cornice(parent,w,d,z):
    profile=[(z-.30,.025),(z-.21,.025),(z-.21,.09),(z-.10,.09),(z-.10,.20),(z,.23)]
    vs=[]
    for zz,t in profile:vs.extend([(-w/2-t,-t,zz),(w/2+t,-t,zz),(w/2+t,d+t,zz),(-w/2-t,d+t,zz)])
    fs=[(j*4+i,j*4+(i+1)%4,(j+1)*4+(i+1)%4,(j+1)*4+i) for j in range(len(profile)-1) for i in range(4)]
    mesh('connected projecting cornice',vs,fs,M['stone'],parent)
    box('ceiling beneath roof',(0,d/2,z-.035),(w+.42,d+.42,.07),M['stone'],parent,.015)

def rainpipe(parent,w,d,h):
    x=-w/2-.09
    tube('rainwater downpipe',[(x,-.24,h),(x,-.24,h-.20),(x,-.10,h-.38),(x,-.10,.40),(x,-.22,.24),(x,-.38,.24)],.044,M['iron'],parent)
    for z in [1,3.2,5.5,8.0]:
        if z>h-.3:continue
        box('pipe wall bracket',(x,.015,z),(.17,.035,.09),M['iron'],parent,.008)
        rod('pipe bracket standoff',(x,-.10,z),(x,.015,z),.012,M['iron'],parent,8)
    # Open half-round gutter follows the actual roof edge.
    vs=[];n=12
    for xx in [-w/2-.22,w/2+.22]:
        for i in range(n+1):a=math.pi+i/n*math.pi;vs.append((xx,-.22+math.cos(a)*.075,h+.015+math.sin(a)*.075))
    mesh('half-round gutter',vs,[(i,i+1,n+i+2,n+i+1) for i in range(n)],M['iron'],parent,True)

def roof(parent,w,d,z):
    e=.20;rise=1.55;ridge_a=(0,1.5,z+rise);ridge_b=(0,d-1.5,z+rise)
    corners=[(-w/2-e,-e,z),(w/2+e,-e,z),(w/2+e,d+e,z),(-w/2-e,d+e,z)]
    faces=[([corners[0],corners[1],ridge_a],0),([corners[1],corners[2],ridge_b,ridge_a],1),([corners[2],corners[3],ridge_b],2),([corners[3],corners[0],ridge_a,ridge_b],3)]
    for vs,index in faces:
        o=mesh('hipped terracotta roof',vs,[tuple(range(len(vs)))],M['roof'],parent)
        uv=o.data.uv_layers.new()
        for j,p in enumerate(vs):
            if index==0:u,v=p[0],(p[1]+e)*math.sqrt(1+(rise/(1.5+e))**2)
            elif index==2:u,v=-p[0],(d+e-p[1])*math.sqrt(1+(rise/(1.5+e))**2)
            elif index==1:u,v=p[1],(w/2+e-p[0])*math.sqrt(1+(rise/(w/2+e))**2)
            else:u,v=-p[1],(p[0]+w/2+e)*math.sqrt(1+(rise/(w/2+e))**2)
            uv.data[j].uv=(u/1.44,v/2.24)
        sol=o.modifiers.new('roof build-up','SOLIDIFY');sol.thickness=.10;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=sol.name)
    # Rounded overlapping ridge/hip covers break the silhouette at every important seam.
    for a,b in [(ridge_a,ridge_b)]+[(corners[i],ridge_a if i<2 else ridge_b) for i in range(4)]:
        a,b=Vector(a),Vector(b);delta=b-a;steps=max(1,int(delta.length/.27));axis=delta.normalized();side=Vector((-axis.y,axis.x,0)).normalized();up=axis.cross(side)
        if up.z<0:up=-up
        for k in range(steps):
            start=a+delta*(k/steps);end=a+delta*min(1,(k+1.08)/steps);vv=[]
            for p in [start,end]:
                for i in range(9):t=i/8*math.pi;v=p+side*(math.cos(t)*.105)+up*(math.sin(t)*.105)+Vector((0,0,.018));vv.append(tuple(v))
            o=mesh('overlapping ridge cap',vv,[(i,i+1,i+10,i+9) for i in range(8)],M['roof'],parent,True);uv_planar(o,(1.44,2.24))
    # Two visible courses of curved clay pans at front/rear eaves, in addition to
    # the broad textured roof. They have real rounded edge silhouette and laps.
    for back in [False,True]:
        for row in [0,1]:
            advance=row*.25;length=.29;limit=(w/2+e)*(1-(advance+length)/(1.5+e))
            for i in range(int(2*limit/.18)):
                cx=-limit+.09+i*.18;vv=[]
                for t in [0,1]:
                    v=advance+length*t;y=d+e-v if back else -e+v;zz=z+v*rise/(1.5+e)+.012+row*.004
                    for j in range(9):a=j/8;vv.append((cx+(a-.5)*.18,y,zz+.018*(1+math.cos(a*math.tau))))
                o=mesh('curved eave pan tile',vv,[(j+9,j+10,j+1,j) if back else (j,j+1,j+10,j+9) for j in range(8)],M['roof'],parent,True);uv_planar(o,(1.44,2.24))
    # Brick chimney with fitted hip-roof flashing and an open flue.
    for yy in [-.255,.255]:
        chimney=box('hollow chimney masonry',(0,d/2+yy,z+1.83),(.61,.13,1.04),M['brick'],parent,.008);uv_planar(chimney,(1.84,.64))
    for xx in [-.24,.24]:
        chimney=box('chimney masonry return',(xx,d/2,z+1.83),(.13,.38,1.04),M['brick'],parent,.008);uv_planar(chimney,(1.84,.64))
    for yy in [-.2975,.2975]:box('open chimney crown',(0,d/2+yy,z+2.38),(.78,.215,.10),M['stone'],parent,.012)
    for xx in [-.2825,.2825]:box('crown return',(xx,d/2,z+2.38),(.215,.38,.10),M['stone'],parent,.012)
    box('deep flue floor',(0,d/2,z+1.31),(.35,.38,.015),M['dark'],parent,0)
    vs=[]
    for x,y in [(-.48,-.49),(.48,-.49),(.48,.49),(-.48,.49)]:vs.append((x,d/2+y,z+rise-abs(x)*rise/(w/2+e)+.018))
    vs.extend([(-.32,d/2-.34,z+1.76),(.32,d/2-.34,z+1.76),(.32,d/2+.34,z+1.76),(-.32,d/2+.34,z+1.76)])
    mesh('fitted chimney flashing',vs,[(i,(i+1)%4,(i+1)%4+4,i+4) for i in range(4)],M['flashing'],parent)

def awning(parent,width):
    vs=[];n=12;nx=8
    for j in range(nx+1):
        x=-width/2+width*j/nx
        for i in range(n+1):
            t=i/n;vs.append((x,-.10-.92*t,3.10-.44*t+.08*math.sin(t*math.pi)-.035*math.sin(j/nx*math.pi)*math.sin(t*math.pi/2)))
    o=mesh('curved shop canopy',vs,[(j*(n+1)+i,j*(n+1)+i+1,(j+1)*(n+1)+i+1,(j+1)*(n+1)+i) for j in range(nx) for i in range(n)],M['canvas'],parent,True)
    sol=o.modifiers.new('canvas edge thickness','SOLIDIFY');sol.thickness=.006;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=sol.name)
    for x in [-width/2,width/2]:
        tube('awning support',[(x,-.02,3.11),(x,-1.016,2.655),(x,-.026,2.38)],.018,M['iron'],parent)
        for zz in [3.11,2.38]:box('awning wall mounting plate',(x,-.015,zz),(.11,.04,.15),M['iron'],parent,.008)
    tube('front canvas carrier',[(-width/2+width*i/16,-1.016,2.650-.035*math.sin(i/16*math.pi)) for i in range(17)],.012,M['iron'],parent)
    for i in range(16):
        x0=-width/2+width*i/16;x1=-width/2+width*(i+1)/16
        z0=2.66-.035*math.sin(i/16*math.pi);z1=2.66-.035*math.sin((i+1)/16*math.pi)
        vv=[(x0,-1.022,z0),(x1,-1.022,z1)]
        for j in range(9):
            t=j/8;vv.append((x1+(x0-x1)*t,-1.022,z1+(z0-z1)*t-.12-.04*math.sin(t*math.pi)))
        mesh('rounded scalloped valance',vv,[tuple(reversed(range(len(vv))))],M['canvas'],parent)

def building(parent,w,d,h,plaster=False):
    box('foundation below pavement',(0,d/2,-.20),(w,d,.40),M['stone'],parent,.01)
    front=[(-1.65,.40,2.30,2.35),(1.65,0,1.08,2.65)]
    levels=[4.05]+([7.05] if h>8 else [])
    for z in levels:
        for x in [-2.18,0,2.18]:front.append((x,z,1.15,1.7))
    faces=[(w,front,(0,0,0),0)]
    side=[(c,z,1.05,1.6) for z in levels for c in [-1.65,1.65]]
    faces += [(d,side,(-w/2,d/2,0),-math.pi/2),(d,side,(w/2,d/2,0),math.pi/2)]
    back=[(x,z,1.1,1.65) for z in levels for x in [-1.65,1.65]]
    faces.append((w,back,(0,d,0),math.pi))
    for fi,(length,holes,loc,rot) in enumerate(faces):
        core_length=length-.70 if fi in [1,2] else length-(.044 if plaster else 0)
        o=wall(parent,core_length,h,.35,holes,M['brick'],loc,rot,.022 if plaster else 0);uv_planar(o,(1.84,.64))
        if plaster:
            skin=wall(parent,length-(.046 if fi in [1,2] else 0),h,.023,holes,M['front'] if fi==0 else M['plaster'],loc,rot)
            if fi==0:
                # Remove only the thin plaster, exposing the continuous masonry underneath.
                outline=[(-w/2-.02,.15),(-w/2+.48,.15),(-w/2+.63,.44),(-w/2+.51,.79),(-w/2+.67,1.03),(-w/2+.45,1.35),(-w/2+.58,1.60),(-w/2+.32,1.92),(-w/2+.39,2.22),(-w/2-.02,2.30)]
                vs=[(x,y,z) for y in [-.04,.035] for x,z in outline];n=len(outline)
                # Outward winding is essential: an inverted cutter is not a solid
                # volume to the boolean solver and can leave this coat intact.
                fs=[tuple(range(n)),tuple(range(2*n-1,n-1,-1))]+[(i,i+n,(i+1)%n+n,(i+1)%n) for i in range(n)]
                cut=mesh('temporary plaster chip volume',vs,fs,None,parent);bpy.context.view_layer.objects.active=skin
                mod=skin.modifiers.new('irregular exposed masonry','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
                uv_planar(skin,front_unique=True,extent=(w,h))
            else:uv_planar(skin,(3.0,3.0))
        for k,(cx,b,ww,hh) in enumerate(holes):window(parent,cx,b,ww,hh,k+fi,loc,rot,b<1 and ww>1.5)
    # A fitted threshold and a solid half-height door behind the entry glazing.
    box('door threshold',(1.65,-.04,.035),(1.25,.42,.07),M['stone'],parent,.015)
    box('entry door lower panel',(1.65,.19,.40),(.91,.07,.72),M['green'],parent,.018)
    rod('brass door pull',(2.00,.12,1.05),(2.00,.12,1.35),.016,M['gold'],parent)
    # Shop frontage, molding and original sign.
    box('shop sign board',(0,-.04,3.28),(w-.45,.10,.37),M['green'],parent,.025)
    text('original shop sign','CORNER COFFEE' if plaster else 'OLD TOWN BAKERY',(0,-.096,3.28),.235,M['gold'],parent)
    awning(parent,w-.65)
    cornice(parent,w,d,h+.02);rainpipe(parent,w,d,h-.06)
    if plaster:
        # A closed flat roof with substantial parapet walls and coping, not a floating slab.
        box('flat roof membrane',(0,d/2,h+.09),(w-.38,d-.38,.14),M['dark'],parent,.012)
        for y in [.10,d-.10]:box('parapet masonry',(0,y,h+.31),(w,.22,.48),M['plaster'],parent,.008)
        for x in [-w/2+.1,w/2-.1]:box('parapet return',(x,d/2,h+.31),(.22,d,.48),M['plaster'],parent,.008)
        for y in [.10,d-.10]:box('parapet coping',(0,y,h+.58),(w+.12,.34,.09),M['stone'],parent,.015)
        for x in [-w/2+.1,w/2-.1]:box('coping return',(x,d/2,h+.58),(.34,d+.12,.09),M['stone'],parent,.015)
        box('roof vent casing',(1.15,d-.95,h+.49),(.82,.68,.58),M['flashing'],parent,.045)
        for z in [h+.3+i*.09 for i in range(4)]:box('vent louver',(1.15,d-1.30,z),(.65,.018,.026),M['dark'],parent,.005)
        # Original worn paint tag; standard alpha, fitted to an uninterrupted wall area.
        tag=material('original RISE graffiti','#ffffff',.96);n=tag.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(TEX/'graffiti-rise.png'));p=tag.node_tree.nodes['Principled BSDF'];tag.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color']);tag.node_tree.links.new(n.outputs['Alpha'],p.inputs['Alpha']);tag.surface_render_method='DITHERED'
        o=mesh('graffiti on plaster',[(-.28,-.004,1.03),(.91,-.004,1.03),(.91,-.004,1.63),(-.28,-.004,1.63)],[(0,1,2,3)],tag,parent);uv=o.data.uv_layers.new()
        for i,p in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=p
    else:roof(parent,w,d,h+.08)
    # One fitted external window box at the street-facing upper sill.
    box('timber window box',(0,-.23,4.01),(1.12,.25,.22),M['wood'],parent,.018)
    for x in [-.33,.30]:pot(parent,x,-.23,4.11)
    parent['footprint_m']=[w,d];parent['wall_height_m']=h;parent['wall_thickness_m']=.35
    parent['window_recess_m']=.205;parent['window_pocket_depth_m']=1.05

building(A,7.2,6.4,9.5)
building(B,6.6,6.4,6.6,True)
for parent in [A,B]:
    batch(parent)
    for o in parent.children:
        if o.type=='MESH' and o.data.materials[0] in [M['brick'],M['plaster']]:
            uv_planar(o,(1.84,.64) if o.data.materials[0]==M['brick'] else (3,3))
bpy.ops.object.select_all(action='DESELECT');objects=[root]+list(root.children_recursive)
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'gloryland-oldtown.glb'),use_selection=True,export_format='GLB',export_yup=True,export_extras=True,export_animations=False)
stats={'source_sha':'791e1d05bf3835c03d5b79d9e1884517fc689fa8','current_main_checked':'dab12f682e58f68f1d35398069aa606fe15001fa','authoring':'Blender '+bpy.app.version_string,'glb_bytes':(OUT/'gloryland-oldtown.glb').stat().st_size,'triangles':0,'mesh_nodes':0,'buildings':2,'game_integration':False,'physical_phone':'NOT VERIFIED'}
for o in objects:
    if o.type=='MESH':o.data.calc_loop_triangles();stats['triangles']+=len(o.data.loop_triangles);stats['mesh_nodes']+=1
(OUT/'manifest.json').write_text(json.dumps(stats,indent=2)+'\n')
bpy.ops.file.pack_all();bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'gloryland-oldtown.blend'))
print('OLDTOWN_MANIFEST '+json.dumps(stats))
