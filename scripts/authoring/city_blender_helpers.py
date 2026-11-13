"""Small build-time Blender helpers for subsequent original city components."""
import bpy,math
from mathutils import Vector

def material(name,color,rough=.8,metal=0,alpha=1,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF']
    rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)];rgb=[v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    p.inputs['Base Color'].default_value=(*rgb,alpha);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Alpha'].default_value=alpha
    if alpha<1:m.surface_render_method='DITHERED';m.use_transparency_overlap=False
    if emission:p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=emission
    return m
def textured(name,folder,prefix,color=None):
    m=material(name,'#ffffff');p=m.node_tree.nodes['Principled BSDF'];links=m.node_tree.links
    for suffix,slot in [('color','Base Color'),('roughness','Roughness'),('normal',None)]:
        f=folder/(color if suffix=='color' and color else prefix+'-'+suffix+'.png')
        n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(f),check_existing=True)
        if suffix!='color':n.image.colorspace_settings.name='Non-Color'
        if slot:links.new(n.outputs['Color'],p.inputs[slot])
        else:
            normal=m.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.55;links.new(n.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],p.inputs['Normal'])
    return m
def group(name,pos=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=pos;o.parent=parent;return o
def finish(o,name,mat,parent):
    o.name=name;o.parent=parent
    if mat:o.data.materials.append(mat)
    return o
def box(name,loc,size,mat,parent,bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        b=o.modifiers.new('edge radii','BEVEL');b.width=bevel;b.segments=2;bpy.ops.object.modifier_apply(modifier=b.name)
        n=o.modifiers.new('weighted normals','WEIGHTED_NORMAL');n.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=n.name)
    return finish(o,name,mat,parent)
def mesh(name,vs,fs,mat,parent,smooth=False):
    d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);finish(o,name,mat,parent)
    for f in d.polygons:f.use_smooth=smooth
    return o
def rod(name,a,b,r,mat,parent,sides=12):
    a,b=Vector(a),Vector(b);delta=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=r,depth=delta.length,location=(a+b)/2)
    o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=delta.to_track_quat('Z','Y');finish(o,name,mat,parent)
    for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
    return o
def tube(name,points,r,mat,parent):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2;s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,co in zip(s.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);finish(o,name,mat,parent)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False)
    return o
def text(name,body,loc,size,mat,parent):
    c=bpy.data.curves.new(name,'FONT');c.body=body;c.size=size;c.align_x='CENTER';c.align_y='CENTER';c.extrude=.0004;c.resolution_u=2
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler.x=math.pi/2;finish(o,name,mat,parent)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False)
def uv_planar(o,scale=(1,1),front_unique=False,extent=None):
    uv=o.data.uv_layers.active or o.data.uv_layers.new()
    for f in o.data.polygons:
        normal=o.matrix_local.to_3x3() @ f.normal;axis=max(range(3),key=lambda i:abs(normal[i]))
        for i in f.loop_indices:
            v=o.matrix_local @ o.data.vertices[o.data.loops[i].vertex_index].co
            if front_unique and axis==1:
                u=(v.x+extent[0]/2)/extent[0];w=v.z/extent[1]
            else:
                u=(v.y if axis==0 else v.x)/scale[0];w=(v.y if axis==2 else v.z)/scale[1]
            uv.data[i].uv=(u,w)
def batch(parent):
    groups={}
    for o in list(parent.children_recursive):
        if o.type=='MESH':groups.setdefault(o.data.materials[0],[]).append(o)
    for mat,obs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in obs:o.select_set(True)
        bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();o=obs[0];world=o.matrix_world.copy();o.parent=parent;o.matrix_world=world;o.name=parent.name+'__'+mat.name
