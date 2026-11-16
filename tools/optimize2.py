import bpy, os
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/data/home/luxin/unz/mesh/tex_mesh.glb")
for im in bpy.data.images:
    if im.size[0] > 1024: im.scale(1024,1024)
    im.file_format="JPEG"
o=[x for x in bpy.data.objects if x.type=="MESH"][0]
o.data.calc_loop_triangles(); n=len(o.data.loop_triangles)
if n>150000:
    m=o.modifiers.new("dec","DECIMATE"); m.ratio=150000/n; m.use_collapse_triangulate=True
bpy.context.view_layer.objects.active=o; o.select_set(True)
out="/data/home/his-tree/assets/models/characters/lincoln_bust.glb"
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_animations=False, export_skins=False, export_image_format="JPEG", export_jpeg_quality=88)
print("wrote", round(os.path.getsize(out)/1e6,2),"MB")
