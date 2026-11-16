import bpy, math, os, sys
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/data/home/luxin/unz/mesh/tex_mesh.glb")
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = 32
sc.cycles.use_denoising = False
sc.render.resolution_x = 700
sc.render.resolution_y = 900
sc.render.film_transparent = False
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"

world = bpy.data.worlds.new("W")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.055, 0.065, 1)
sc.world = world

objs = [o for o in bpy.data.objects if o.type == "MESH"]
bpy.context.view_layer.objects.active = objs[0]
for o in bpy.data.objects: o.select_set(o.type == "MESH")

def bbox():
    xs=[];ys=[];zs=[]
    for o in objs:
        for c in o.bound_box:
            w=o.matrix_world @ Vector(c); xs.append(w.x);ys.append(w.y);zs.append(w.z)
    return (min(xs),max(xs),min(ys),max(ys),min(zs),max(zs))
b=bbox()
print("bbox", b)
cx=(b[0]+b[1])/2; cz=(b[4]+b[5])/2
# place camera in front (-Y side) looking at the head area (upper part of model)
target = Vector((cx, 0.0, b[5] - (b[5]-b[4])*0.18))
cam_data = bpy.data.cameras.new("C"); cam_data.lens = 85
cam = bpy.data.objects.new("Camera", cam_data); sc.collection.objects.link(cam)
cam.location = (cx, -(b[3]-b[1])*0.9, target.z)
d = target - cam.location
cam.rotation_euler = d.to_track_quat("-Z","Y").to_euler()
sc.camera = cam

def area(name, loc, energy, size, color):
    ld=bpy.data.lights.new(name,"AREA"); ld.energy=energy; ld.size=size; ld.color=color
    o=bpy.data.objects.new(name,ld); sc.collection.objects.link(o); o.location=loc
    dd=Vector((cx,0,target.z))-o.location
    o.rotation_euler=dd.to_track_quat("-Z","Y").to_euler()
    return o
area("key",(cx-1.2,-2.0,target.z+1.2),420,2.0,(1.0,0.92,0.82))
area("fill",(cx+1.6,-1.4,target.z+0.2),160,2.5,(0.72,0.82,1.0))
area("rim",(cx+0.6,1.8,target.z+1.0),260,1.5,(1.0,0.85,0.7))
sc.render.filepath = "/data/home/luxin/lincoln_lux.png"
bpy.ops.render.render(write_still=True)
print("rendered")
