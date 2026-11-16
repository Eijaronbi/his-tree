import bpy, os
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/data/home/luxin/unz/mesh/tex_mesh.glb")
for im in bpy.data.images:
    if im.size[0] > 1024:
        im.scale(1024, 1024)
        print("resized", im.name, im.size[:])
objs=[o for o in bpy.data.objects if o.type=="MESH"]
for o in objs:
    o.data.calc_loop_triangles()
    print(o.name, "tris", len(o.data.loop_triangles))
    if len(o.data.loop_triangles) > 200000:
        mod=o.modifiers.new("dec","DECIMATE")
        mod.ratio=200000/len(o.data.loop_triangles)
        mod.use_collapse_triangulate=True
bpy.context.view_layer.objects.active=objs[0]
for o in bpy.data.objects: o.select_set(o.type=="MESH")
out="/data/home/his-tree/assets/models/characters/lincoln_bust.glb"
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_animations=False, export_skins=False, export_normals=True, export_texcoords=True, export_materials="EXPORT")
print("wrote", out, round(os.path.getsize(out)/1e6,2),"MB")
