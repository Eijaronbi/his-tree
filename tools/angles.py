import bpy, math, os
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/data/home/luxin/unz/mesh/tex_mesh.glb")
sc=bpy.context.scene
sc.render.engine="CYCLES"; sc.cycles.device="CPU"; sc.cycles.samples=12; sc.cycles.use_denoising=False
sc.render.resolution_x=340; sc.render.resolution_y=420
sc.view_settings.view_transform="AgX"
w=bpy.data.worlds.new("W"); w.use_nodes=True
w.node_tree.nodes["Background"].inputs[0].default_value=(0.25,0.27,0.3,1)
sc.world=w
objs=[o for o in bpy.data.objects if o.type=="MESH"]
bpy.context.view_layer.objects.active=objs[0]
cd=bpy.data.cameras.new("C"); cd.lens=60
cam=bpy.data.objects.new("Camera",cd); sc.collection.objects.link(cam); sc.camera=cam
ld=bpy.data.lights.new("L","AREA"); ld.energy=900; ld.size=4
lo=bpy.data.objects.new("L",ld); sc.collection.objects.link(lo); lo.location=(2,-3,3); lo.rotation_euler=(Vector((0,0,0))-lo.location).to_track_quat("-Z","Y").to_euler()
ld2=bpy.data.lights.new("L2","AREA"); ld2.energy=400; ld2.size=4
lo2=bpy.data.objects.new("L2",ld2); sc.collection.objects.link(lo2); lo2.location=(-3,-2,1); lo2.rotation_euler=(Vector((0,0,0))-lo2.location).to_track_quat("-Z","Y").to_euler()
for i,ang in enumerate([0,90,180,270]):
    a=math.radians(ang)
    cam.location=(math.sin(a)*3.2, -math.cos(a)*3.2, 0.35)
    d=Vector((0,0,0.1))-cam.location
    cam.rotation_euler=d.to_track_quat("-Z","Y").to_euler()
    sc.render.filepath=f"/data/home/luxin/ang{ang}.png"
    bpy.ops.render.render(write_still=True)
print("angles done")
