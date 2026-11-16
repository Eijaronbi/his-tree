import bpy, os, sys
OUT="/data/home/his-tree/assets/models/characters"
os.makedirs(OUT, exist_ok=True)
for tag in sys.argv[sys.argv.index("--")+1:]:
    src=f"/data/home/luxin/glb/{tag}/mesh/tex_mesh.glb"
    if not os.path.exists(src):
        print("missing", tag); continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    for im in bpy.data.images:
        if im.size[0] > 1024:
            im.scale(1024,1024)
        im.file_format="JPEG"
    meshes=[x for x in bpy.data.objects if x.type=="MESH"]
    for o in meshes:
        o.data.calc_loop_triangles()
        n=len(o.data.loop_triangles)
        if n>150000:
            m=o.modifiers.new("dec","DECIMATE"); m.ratio=150000/n; m.use_collapse_triangulate=True
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    out=os.path.join(OUT, tag+".glb")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True,
        export_apply=True, export_yup=True, export_animations=False, export_skins=False,
        export_image_format="JPEG", export_jpeg_quality=85)
    print("wrote", tag, round(os.path.getsize(out)/1e6,2),"MB", flush=True)
