import bpy, os, sys, math
from mathutils import Vector
OUT="/data/home/luxin/renders_opt"
os.makedirs(OUT, exist_ok=True)
def bbox(objs):
    xs=[];ys=[];zs=[]
    for o in objs:
        for c in o.bound_box:
            w=o.matrix_world @ Vector(c); xs.append(w.x);ys.append(w.y);zs.append(w.z)
    return (min(xs),max(xs),min(ys),max(ys),min(zs),max(zs))
def render(glb, tag):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    sc=bpy.context.scene
    sc.render.engine="CYCLES"; sc.cycles.device="CPU"; sc.cycles.samples=16; sc.cycles.use_denoising=False
    sc.render.resolution_x=460; sc.render.resolution_y=680
    sc.view_settings.view_transform="AgX"
    w=bpy.data.worlds.new("W"); w.use_nodes=True
    w.node_tree.nodes["Background"].inputs[0].default_value=(0.3,0.31,0.34,1)
    sc.world=w
    objs=[o for o in bpy.data.objects if o.type=="MESH"]
    b=bbox(objs)
    h=b[5]-b[4]
    cx=(b[0]+b[1])/2; cy=(b[2]+b[3])/2
    target=Vector((cx, cy, b[4]+h*0.5))
    camd=bpy.data.cameras.new("C"); camd.lens=50
    camd.clip_start=max(0.01,h*0.01); camd.clip_end=max(100,h*20)
    cam=bpy.data.objects.new("Camera",camd); sc.collection.objects.link(cam); sc.camera=cam
    def area(n,off,e,s,c):
        ld=bpy.data.lights.new(n,"AREA"); ld.energy=e; ld.size=s; ld.color=c
        o=bpy.data.objects.new(n,ld); sc.collection.objects.link(o)
        o.location=(cx+off[0], cy+off[1], target.z+off[2])
        dd=target-o.location; o.rotation_euler=dd.to_track_quat("-Z","Y").to_euler()
    area("k",(-1.5,-2.2,1.4),500,2.5,(1.0,0.95,0.88))
    area("f",(1.8,-1.4,0.2),200,3.0,(0.8,0.86,1.0))
    area("r",(0.4,2.0,1.2),300,2.0,(1.0,0.88,0.75))
    dist=h*2.6
    for v,ang in (("front",0.0),("3q",0.62)):
        cam.location=(cx+dist*math.sin(ang), cy-dist*math.cos(ang), target.z)
        d=target-cam.location; cam.rotation_euler=d.to_track_quat("-Z","Y").to_euler()
        sc.render.filepath=os.path.join(OUT,f"{tag}_{v}.png")
        bpy.ops.render.render(write_still=True)
    print("rendered", tag, flush=True)
for tag in sys.argv[sys.argv.index("--")+1:]:
    glb=f"/data/home/his-tree/assets/models/characters/{tag}.glb"
    if not os.path.exists(glb): print("missing", tag); continue
    try: render(glb, tag)
    except Exception as e: print("fail", tag, str(e)[:160], flush=True)
