import bpy, os, sys, glob
from mathutils import Vector

OUT = "/data/home/luxin/renders"
os.makedirs(OUT, exist_ok=True)

def bbox(objs):
    xs=[];ys=[];zs=[]
    for o in objs:
        for c in o.bound_box:
            w=o.matrix_world @ Vector(c); xs.append(w.x);ys.append(w.y);zs.append(w.z)
    return (min(xs),max(xs),min(ys),max(ys),min(zs),max(zs))

def render(glb, tag, views=("front","3q")):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    sc=bpy.context.scene
    sc.render.engine="CYCLES"; sc.cycles.device="CPU"; sc.cycles.samples=16
    sc.cycles.use_denoising=False
    sc.render.resolution_x=520; sc.render.resolution_y=760
    sc.view_settings.view_transform="AgX"
    world=bpy.data.worlds.new("W"); world.use_nodes=True
    world.node_tree.nodes["Background"].inputs[0].default_value=(0.28,0.29,0.32,1)
    sc.world=world
    objs=[o for o in bpy.data.objects if o.type=="MESH"]
    b=bbox(objs)
    h=b[3]-b[1]
    cx=(b[0]+b[1])/2; cz=(b[4]+b[5])/2
    target=Vector((cx,0.0,b[2]+h*0.55))
    camd=bpy.data.cameras.new("C"); camd.lens=70
    cam=bpy.data.objects.new("Camera",camd); sc.collection.objects.link(cam); sc.camera=cam
    def area(name,loc,energy,size,color):
        ld=bpy.data.lights.new(name,"AREA"); ld.energy=energy; ld.size=size; ld.color=color
        o=bpy.data.objects.new(name,ld); sc.collection.objects.link(o); o.location=loc
        dd=target-o.location; o.rotation_euler=dd.to_track_quat("-Z","Y").to_euler()
    area("key",(cx-1.5,-2.2,target.z+1.4),500,2.5,(1.0,0.95,0.88))
    area("fill",(cx+1.8,-1.4,target.z+0.2),200,3.0,(0.8,0.86,1.0))
    area("rim",(cx+0.4,2.0,target.z+1.2),300,2.0,(1.0,0.88,0.75))
    dist=h*1.15
    for v in views:
        ang=0.0 if v=="front" else 0.62
        cam.location=(cx+dist*math.sin(ang), -dist*math.cos(ang), target.z)
        d=target-cam.location
        cam.rotation_euler=d.to_track_quat("-Z","Y").to_euler()
        sc.render.filepath=os.path.join(OUT,f"{tag}_{v}.png")
        bpy.ops.render.render(write_still=True)
    print("rendered", tag, flush=True)

import math
for tag in sys.argv[1:]:
    glb=f"/data/home/luxin/glb/{tag}/mesh/tex_mesh.glb"
    if not os.path.exists(glb):
        print("missing", tag); continue
    try:
        render(glb, tag)
    except Exception as e:
        print("fail", tag, str(e)[:200], flush=True)
