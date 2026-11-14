"""Original unbranded compact hatchback, offline Blender 4.3.2.

blender -b -t 2 --python scripts/authoring/build_street_car.py
X forward, Blender Z up; exported metres, X forward / Y up. No add-ons or API.
"""
import bpy,math,json,sys
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from city_blender_helpers import material,group,box,mesh,rod,tube,batch
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/street/ch01-car';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
M={
 'paint':material('petrol blue enamel','#436774',.31,.24),
 'rubber':material('tires seals and soft trim','#242a2c',.88),
 'dark':material('dark chassis and lamp cavities','#30383b',.78,.15),
 'metal':material('brushed alloy and reflector','#8b969a',.33,.78),
 'glass':material('recessed window glass','#a4bcc0',.17,.02,.20),
 'lens':material('clear headlamp lens','#dae2dc',.18,.02,.30),
 'seat':material('woven charcoal upholstery','#4a5354',.96),
 'white':material('headlamp bulb and plate','#e5e4d7',.45,0,1,.18),
 'red':material('red rear lens','#943c37',.26,0,1,.12),
 'amber':material('amber indicator','#bb873f',.33),
}
for key,m in M.items():m.use_backface_culling=key not in ['glass','lens']
root=group('Gloryland_compact_car');root['units']='metres';root['front_direction']='glTF +X';root['wheel_radius_m']=.298
body=group('Body',parent=root)

def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def interpolate(x,data):
    if x<=data[0][0]:return data[0][1:]
    if x>=data[-1][0]:return data[-1][1:]
    for i in range(len(data)-1):
        if data[i][0]<=x<=data[i+1][0]:
            t=(x-data[i][0])/(data[i+1][0]-data[i][0]);p0=data[max(0,i-1)];p1=data[i];p2=data[i+1];p3=data[min(len(data)-1,i+2)]
            return tuple(.5*((2*p1[j])+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t*t+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t**3) for j in range(1,len(p1)))
DATA=[(-2,.67,.34,.76),(-1.82,.79,.28,.83),(-1.45,.85,.25,.88),(-.95,.86,.25,.92),(-.25,.86,.25,.96),(.55,.855,.26,.95),(1.10,.85,.26,.91),(1.55,.80,.27,.85),(1.88,.72,.32,.78),(2,.67,.34,.76)]
CAB=[(-1.56,.78,.86,.74,.90),(-1.15,.85,.90,.62,1.38),(-.75,.86,.93,.66,1.47),(-.35,.86,.96,.66,1.48),(.15,.855,.96,.64,1.43),(.68,.835,.95,.82,.97)]
AXLES=[-1.20,1.25]
def warp(x,y):return x-math.copysign(.07*smooth((abs(x)-1.72)/.28)*(abs(y)/.85)**2,x)
def side_y(x,z):
    w,lo,hi=interpolate(x,DATA);return w*(.90+.10*smooth((z-lo)/max(.01,.70-lo)))
def roof_z(x,y):
    wl,lo,wt,top=interpolate(x,CAB);return top+.025*(1-(y/wt)**2)-.03*(abs(y)/wt)**6
def boolean(target,cutter):
    bpy.context.view_layer.update();bpy.context.view_layer.objects.active=target
    m=target.modifiers.new('manufactured opening','BOOLEAN');m.operation='DIFFERENCE';m.object=cutter;bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(cutter,do_unlink=True)
def prism_xz(name,points,y0,y1):
    if sum(points[i][0]*points[(i+1)%len(points)][1]-points[(i+1)%len(points)][0]*points[i][1] for i in range(len(points)))<0:points=list(reversed(points))
    n=len(points);v=[(x,y,z) for y in [y0,y1] for x,z in points]
    f=[tuple(range(n)),tuple(range(2*n-1,n-1,-1))]+[(i,i+n,(i+1)%n+n,(i+1)%n) for i in range(n)]
    return mesh(name,v,f,None,body)
def prism_xy(name,points,z0,z1):
    n=len(points);v=[(x,y,z) for z in [z0,z1] for x,y in points]
    f=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,v,f,None,body)

# Crowned lower coachwork. The lower boundary rises around actual wheel holes.
N=240;NZ=7
for side in [-1,1]:
    vs=[]
    for i in range(N+1):
        x=-2+4*i/N;w,lo,hi=interpolate(x,DATA);bottom=lo
        for axle in AXLES:
            dx=x-axle
            if abs(dx)<.34:bottom=max(bottom,.298+math.sqrt(.34**2-dx*dx))
        for j in range(NZ):
            z=bottom+(hi-bottom)*j/(NZ-1);y=side*side_y(x,z);vs.append((warp(x,y),y,z))
    fs=[]
    for i in range(N):
        for j in range(NZ-1):
            f=(i*NZ+j,(i+1)*NZ+j,(i+1)*NZ+j+1,i*NZ+j+1);fs.append(f if side<0 else f[::-1])
    o=mesh('formed side with wheel apertures',vs,fs,M['paint'],body,True)
    s=o.modifiers.new('coachwork thickness','SOLIDIFY');s.thickness=.014;s.offset=-1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=s.name)
    for axle in AXLES:
        pp=[]
        for i in range(33):
            a=i/32*math.pi;x=axle+.344*math.cos(a);z=.298+.344*math.sin(a);y=side*(side_y(x,z)+.003);pp.append((warp(x,y),y,z))
        tube('thin arch bead',pp,.008,M['paint'],body)
        vv=[(axle+.343*math.cos(i/24*math.pi),side*y,.298+.343*math.sin(i/24*math.pi)) for y in [.62,.852] for i in range(25)]
        mesh('recessed wheel liner',vv,[(i,i+1,26+i,25+i) for i in range(24)],M['dark'],body,True)

# Hood and lower hatch panel connect to the side shoulder without a box-shaped upper body.
for lo,hi in [(-2,-1.56),(.68,2)]:
    nx=32;ny=18;vs=[]
    for i in range(nx+1):
        x=lo+(hi-lo)*i/nx;w,sill,shoulder=interpolate(x,DATA)
        for j in range(ny+1):
            u=-1+2*j/ny;y=u*w;z=shoulder+.045*(1-u*u);vs.append((warp(x,y),y,z))
    mesh('curved hood or hatch shoulder',vs,[(i*(ny+1)+j,(i+1)*(ny+1)+j,(i+1)*(ny+1)+j+1,i*(ny+1)+j+1) for i in range(nx) for j in range(ny)],M['paint'],body,True)
box('underbody floor',(-.05,0,.22),(3.5,1.30,.10),M['dark'],body,.045)
# Close the belt ledge where the cabin narrows inside the lower body's shoulder.
for side in [-1,1]:
    vv=[];n=90
    for i in range(n+1):
        x=-1.56+2.24*i/n;w,lo,hi=interpolate(x,DATA);wl,cl,wt,ct=interpolate(x,CAB)
        vv.extend([(x,side*w,hi),(x,side*wl,cl)])
    fs=[(i*2,i*2+2,i*2+3,i*2+1) if side<0 else (i*2+1,i*2+3,i*2+2,i*2) for i in range(n)]
    mesh('continuous cabin belt ledge',vv,fs,M['paint'],body,True)

def cabin_loft(name,inside=False):
    vs=[];nx=60;nr=17
    for i in range(nx+1):
        x=-1.56+2.24*i/nx;wl,lo,wt,top=interpolate(x,CAB)
        if inside:wl-=.045;wt-=.042;top-=.038;lo=.30
        vs.append((x,-wl,lo))
        for j in range(nr):
            y=-wt+2*wt*j/(nr-1);z=top+.025*(1-(y/wt)**2)-.03*(abs(y)/wt)**6;vs.append((x,y,z))
        vs.append((x,wl,lo))
    n=nr+2;fs=[]
    for i in range(nx):
        for j in range(n):fs.append((i*n+j,(i+1)*n+j,(i+1)*n+(j+1)%n,i*n+(j+1)%n))
    fs.extend([tuple(range(n)),tuple(range(nx*n+n-1,nx*n-1,-1))])
    return mesh(name,vs,fs,None if inside else M['paint'],body,True)
cab=cabin_loft('continuous roof and cabin shell');boolean(cab,cabin_loft('temporary inner cabin',True))
SIDE_WINDOWS=[[(-.34,1.025),(.585,.995),(.105,1.365),(-.34,1.405)],[(-1.40,.98),(-.46,1.025),(-.46,1.405),(-.96,1.345)]]
for pp in SIDE_WINDOWS:boolean(cab,prism_xz('temporary side glazing aperture',pp,-1.4,1.4))

for side in [-1,1]:
    for pp in SIDE_WINDOWS:
        vv=[]
        for x,z in pp:
            wl,lo,wt,top=interpolate(x,CAB);t=(z-lo)/max(.01,top-.03-lo);y=side*(wl+(wt-wl)*t-.009);vv.append((x,y,z))
        mesh('inset side window',vv,[(0,1,2,3) if side<0 else (3,2,1,0)],M['glass'],body)
        tube('side window gasket',vv+[vv[0]],.008,M['rubber'],body)
    # Door lower gaps follow the shaped outer panel instead of thick black bands.
    for outline in [[(-.37,.97),(-.43,.39),(.62,.39),(.82,.84),(.68,.95)],[(-1.43,.89),(-1.42,.45),(-1.22,.37),(-.51,.39),(-.45,.96)]]:
        pp=[(warp(x,side*side_y(x,z)),side*(side_y(x,z)+.003),z) for x,z in outline];tube('narrow door shut line',pp,.0025,M['dark'],body)
    for x in [.34,-.94]:
        z=.87;y=side*(side_y(x,z)+.010)
        box('recess behind door pull',(x,y,z),(.16,.015,.033),M['dark'],body,.012)
        box('body colored door handle',(x,y+side*.009,z+.009),(.13,.018,.022),M['paint'],body,.009)

# Windscreen and hatch glass follow the exact crowned roof surface, cut into it.
for x0,x1 in [(.22,.60),(-1.49,-1.10)]:
    w0=interpolate(x0,CAB)[2]*.87;w1=interpolate(x1,CAB)[2]*.87
    boolean(cab,prism_xy('temporary roof glazing aperture',[(x0,-w0),(x1,-w1),(x1,w1),(x0,w0)],.87,1.65))
    nx=12;ny=16;vv=[]
    for i in range(nx+1):
        x=x0+(x1-x0)*i/nx;w=interpolate(x,CAB)[2]*.87
        for j in range(ny+1):y=(-1+2*j/ny)*w;vv.append((x,y,roof_z(x,y)-.007))
    mesh('curved windscreen or hatch glass',vv,[(i*(ny+1)+j,(i+1)*(ny+1)+j,(i+1)*(ny+1)+j+1,i*(ny+1)+j+1) for i in range(nx) for j in range(ny)],M['glass'],body,True)
    border=[]
    for i in range(nx+1):x=x0+(x1-x0)*i/nx;y=-interpolate(x,CAB)[2]*.87;border.append((x,y,roof_z(x,y)))
    for j in range(1,ny+1):y=(-1+2*j/ny)*w1;border.append((x1,y,roof_z(x1,y)))
    for i in range(nx-1,-1,-1):x=x0+(x1-x0)*i/nx;y=interpolate(x,CAB)[2]*.87;border.append((x,y,roof_z(x,y)))
    for j in range(ny-1,0,-1):y=(-1+2*j/ny)*w0;border.append((x0,y,roof_z(x0,y)))
    tube('windscreen bonded edge',border+[border[0]],.007,M['rubber'],body)
for sy in [-.26,.28]:
    pp=[]
    for i in range(6):x=.55-.23*i/5;y=sy+.05*i/5;pp.append((x,y,roof_z(x,y)+.002))
    tube('windscreen wiper',pp,.008,M['rubber'],body)

def cap_point(direction,u,v):
    x=direction*2;w,lo,hi=interpolate(x,DATA);z=lo+(hi-lo)*v+.045*(1-u*u)*v**6;y=u*side_y(x,z);return (warp(x,y),y,z)
def cap(direction):
    holes=[(-.73,.55,.43,.35),(.73,.55,.43,.35)] if direction>0 else [(-.76,.32,.32,.59),(.76,.32,.32,.59)]
    if direction>0:holes.append((0,.05,.86,.26))
    us=sorted(set([-1,1]+[v for u,z,w,h in holes for v in [u-w/2,u+w/2]]));zs=sorted(set([0,1]+[v for u,z,w,h in holes for v in [z,z+h]]));vv=[cap_point(direction,u,v) for v in zs for u in us];fs=[];n=len(us)
    for j in range(len(zs)-1):
        for i in range(n-1):
            u=(us[i]+us[i+1])/2;v=(zs[j]+zs[j+1])/2
            if any(abs(u-a)<w/2 and z<v<z+h for a,z,w,h in holes):continue
            f=(j*n+i,j*n+i+1,(j+1)*n+i+1,(j+1)*n+i);fs.append(f if direction>0 else f[::-1])
    o=mesh('formed front or rear fascia',vv,fs,M['paint'],body,True);s=o.modifiers.new('fascia wall thickness','SOLIDIFY');s.thickness=.012;s.offset=-1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=s.name)
    for u,z,w,h in holes:
        if direction>0 and u==0:
            # Actual grille aperture, recessed cavity and separate thin louvres.
            p=cap_point(direction,0,z+h/2);box('recessed grille cavity',(p[0]-.04,0,p[2]),(.045,.58,.13),M['dark'],body,.012)
            for j in range(5):box('radiator grille louver',(p[0]-.008,0,p[2]-.045+j*.022),(.012,.55,.007),M['rubber'],body,.003)
            continue
        pp=[cap_point(direction,u-w/2,z),cap_point(direction,u+w/2,z),cap_point(direction,u+w/2,z+h),cap_point(direction,u-w/2,z+h)]
        rear=[(x-direction*.045,y,zz) for x,y,zz in pp]
        mesh('headlight reflector cavity' if direction>0 else 'rear light well',rear,[(0,1,2,3) if direction>0 else (3,2,1,0)],M['dark'],body)
        for i in range(4):mesh('lamp pocket side',[pp[i],rear[i],rear[(i+1)%4],pp[(i+1)%4]],[(0,1,2,3)],M['dark'],body)
        tube('lamp perimeter seal',pp+[pp[0]],.006,M['rubber'],body)
        mesh('headlight lens' if direction>0 else 'red tail light lens',[(x+direction*.002,y,zz) for x,y,zz in pp],[(0,1,2,3) if direction>0 else (3,2,1,0)],M['lens'] if direction>0 else M['red'],body)
        mid=cap_point(direction,u,z+h/2)
        if direction>0:
            for dy in [-.057,.057]:
                vv=[];nn=20
                for xx,r in [(mid[0]-.04,.018),(mid[0]-.009,.054)]:
                    for i in range(nn):a=i/nn*math.tau;vv.append((xx,mid[1]+dy+r*math.cos(a),mid[2]+r*math.sin(a)))
                mesh('concave headlamp reflector',vv,[(i,(i+1)%nn,(i+1)%nn+nn,i+nn) for i in range(nn)],M['metal'],body,True)
                rod('headlamp bulb',(mid[0]-.032,mid[1]+dy,mid[2]),(mid[0]-.018,mid[1]+dy,mid[2]),.013,M['white'],body,12)
        else:
            for zz in [-.07,0,.07]:box('tail lens rib',(mid[0]-.003,mid[1],mid[2]+zz),(.01,.17,.009),M['red'],body,.003)
    # Fitted bumper strip and fictional plate, no real manufacturer badge.
    pp=[cap_point(direction,-.95+1.9*i/32,.10) for i in range(33)];tube('bumper rubbing strip',[(x+direction*.005,y,z-.025) for x,y,z in pp],.035,M['rubber'],body)
    p=cap_point(direction,0,.46);box('numberplate mount',(p[0]+direction*.010,0,p[2]),(.020,.46,.12),M['dark'],body,.012)
    box('enamel numberplate',(p[0]+direction*.023,0,p[2]),(.008,.42,.095),M['white'],body,.008)
    c=bpy.data.curves.new('fictional registration','FONT');c.body='GL 024';c.size=.065;c.align_x='CENTER';c.align_y='CENTER';c.extrude=.0003;c.resolution_u=2
    o=bpy.data.objects.new('registration',c);bpy.context.collection.objects.link(o);o.parent=body;o.location=(p[0]+direction*.029,0,p[2]);o.rotation_euler=(math.pi/2,0,direction*math.pi/2);o.data.materials.append(M['dark']);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
cap(1);cap(-1)

# Real wheel profiles and open alloy spokes. Rolling pivots remain available to integration.
wheels=[]
for x in AXLES:
    for side in [-1,1]:
        steer=group(('Front' if x>0 else 'Rear')+('_curb' if side>0 else '_road')+'_steer',(x,side*.75,.298),root);wheel=group(steer.name.replace('_steer','_wheel'),parent=steer);wheels.append(wheel)
        profile=[(-.105,.20),(-.105,.26),(-.085,.292),(-.052,.298),(.052,.298),(.085,.292),(.105,.26),(.105,.20)];n=40
        vv=[(r*math.sin(i/n*math.tau),y,r*math.cos(i/n*math.tau)) for y,r in profile for i in range(n)]
        mesh('rounded radial tire',vv,[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(profile)-1) for i in range(n)],M['rubber'],wheel,True)
        # Annular outer rim, actual open spaces between five spokes.
        for yy in [side*.104,side*.082]:
            vv=[(r*math.sin(i/n*math.tau),yy,r*math.cos(i/n*math.tau)) for r in [.155,.202] for i in range(n)]
            mesh('alloy rim flange',vv,[(i,(i+1)%n,(i+1)%n+n,i+n) if side<0 else (i+n,(i+1)%n+n,(i+1)%n,i) for i in range(n)],M['metal'],wheel,True)
        for r in [.155,.202]:
            vv=[(r*math.sin(i/n*math.tau),yy,r*math.cos(i/n*math.tau)) for yy in [side*.082,side*.104] for i in range(n)]
            mesh('rim edge wall',vv,[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],M['metal'],wheel,True)
        rod('recessed brake disc',(0,-.04,0),(0,.04,0),.152,M['dark'],wheel,32)
        rod('alloy hub',(0,side*.07,0),(0,side*.113,0),.060,M['metal'],wheel,20)
        for i in range(5):
            a=i/5*math.tau;outline=[]
            for r,offset in [(.052,-.19),(.185,-.10),(.185,.10),(.052,.19)]:outline.append((r*math.sin(a+offset),side*.102,r*math.cos(a+offset)))
            front=outline;back=[(xx,yy-side*.012,zz) for xx,yy,zz in outline];vv=front+back
            ff=[(0,1,2,3),(7,6,5,4)]+[(j,(j+1)%4,(j+1)%4+4,j+4) for j in range(4)]
            if side<0:ff=[f[::-1] for f in ff]
            mesh('solid alloy wheel spoke',vv,ff,M['metal'],wheel)
            rod('wheel lug',(.04*math.sin(a),side*.111,.04*math.cos(a)),(.04*math.sin(a),side*.12,.04*math.cos(a)),.007,M['dark'],wheel,6)
        for i in range(40):
            a=i/40*math.tau
            for yy in [-.034,.034]:
                o=box('tread sipe',(.299*math.sin(a),yy,.299*math.cos(a)),(.012,.040,.003),M['dark'],wheel,0);o.rotation_euler.y=a

# Interior and fitted mirrors; no filled opaque block behind the windows.
for x,z in [(.02,.49),(-1.0,.65)]:
    for y in [-.34,.34]:
        box('seat cushion',(x,y,z),(.48,.46,.14),M['seat'],body,.055)
        o=box('shaped seat back',(x-.22,y,z+.27),(.12,.46,.55),M['seat'],body,.05);o.rotation_euler.y=-.10
        box('head restraint',(x-.22,y,z+.60),(.14,.29,.13),M['seat'],body,.05)
box('sculpted dashboard',(.59,0,.83),(.27,1.29,.19),M['dark'],body,.065)
box('centre console',(.12,0,.48),(.56,.16,.18),M['dark'],body,.035)
rod('steering column',(.55,-.34,.72),(.42,-.34,.96),.018,M['dark'],body)
bpy.ops.mesh.primitive_torus_add(major_radius=.123,minor_radius=.011,major_segments=28,minor_segments=8,location=(.42,-.34,.96),rotation=(0,math.pi/2,0));o=bpy.context.object;o.parent=body;o.data.materials.append(M['rubber']);o.name='steering wheel'
for side in [-1,1]:
    tube('mirror mounting stalk',[(.59,side*.80,.98),(.55,side*.93,1.025)],.018,M['dark'],body)
    # Small integrated housing; the main car shell is continuously lofted.
    o=box('mirror shell',(.54,side*.96,1.055),(.18,.17,.11),M['paint'],body,.045)
    box('mirror glass inset',(.444,side*.96,1.055),(.007,.12,.073),M['metal'],body,.025)

for parent in [body]+wheels:batch(parent)
bpy.ops.object.select_all(action='DESELECT');objects=[root]+list(root.children_recursive)
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'compact-car.glb'),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False)
stats={'source_sha':'8fe3600','main_checked':'dab12f6','authoring':'Blender '+bpy.app.version_string,'units':'metres','glb_bytes':(OUT/'compact-car.glb').stat().st_size,'triangles':0,'mesh_nodes':0,'wheel_radius_m':.298,'wheelbase_m':2.45,'game_integration':False,'physical_phone':'NOT VERIFIED'}
for o in objects:
    if o.type=='MESH':o.data.calc_loop_triangles();stats['triangles']+=len(o.data.loop_triangles);stats['mesh_nodes']+=1
(OUT/'manifest.json').write_text(json.dumps(stats,indent=2)+'\n')
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'compact-car.blend'))
print('CAR_MANIFEST '+json.dumps(stats))
