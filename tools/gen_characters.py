import bpy, bmesh, math, os, sys, json
from mathutils import Vector, Matrix

from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

T = "/data/home/.config/blender/4.3/extensions/user_default/mpfb/data/targets"
OUT = "/data/home/his-tree/assets/models/characters"
os.makedirs(OUT, exist_ok=True)


def clear():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.meshes):
        if m.users == 0:
            bpy.data.meshes.remove(m)


def new_human():
    clear()
    HumanService.create_human()
    obj = [o for o in bpy.data.objects if o.type == "MESH"][0]
    return obj


def zero_macros(obj):
    for k in obj.data.shape_keys.key_blocks:
        if k.name.startswith("$md"):
            k.value = 0.0


def target(obj, rel, w=1.0):
    path = os.path.join(T, rel)
    if not os.path.exists(path):
        print("  miss", rel)
        return False
    TargetService.load_target(obj, path, weight=w)
    return True


def evaluated_bounds(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    zs = [v.co.z for v in me.vertices]
    xs = [v.co.x for v in me.vertices]
    res = (min(zs), max(zs), min(xs), max(xs))
    ev.to_mesh_clear()
    return res


def height_scale(obj, want):
    lo, hi, _, _ = evaluated_bounds(obj)
    cur = hi - lo
    f = want / cur
    obj.scale = (f, f, f)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    print("  height %.3f -> %.3f (x%.3f)" % (cur, want, f))


def skin(obj, hum):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.mpfb.create_v2_skin()
    for k, v in hum.items():
        obj["MPFB_HUM_" + k] = float(v)
    obj.active_material.name = "skin"


def eye_material():
    mat = bpy.data.materials.get("eye")
    if mat:
        return mat
    mat = bpy.data.materials.new("eye")
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = nt.nodes.new("ShaderNodeTexImage")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    img = bpy.data.images.get("iris")
    if img is None:
        img = bpy.data.images.new("iris", 256, 256)
        px = []
        for y in range(256):
            for x in range(256):
                dx = (x - 127.5) / 127.5
                dy = (y - 127.5) / 127.5
                r = math.hypot(dx, dy)
                if r > 0.30:
                    px += [0.86, 0.84, 0.80, 1.0]
                elif r > 0.115:
                    t = (r - 0.115) / 0.185
                    px += [0.20 + 0.30 * t, 0.12 + 0.16 * t, 0.05 + 0.05 * t, 1.0]
                elif r > 0.048:
                    px += [0.05, 0.03, 0.02, 1.0]
                else:
                    px += [0.01, 0.01, 0.01, 1.0]
        img.pixels = px
    tex.image = img
    mapping.inputs["Scale"].default_value = (1.0, 1.0, 1.0)
    nt.links.new(coord.outputs["UV"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.22
    bsdf.inputs["Specular IOR Level"].default_value = 0.6
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def add_eyes(obj, r=0.0132):
    arm = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    eyes = []
    mat = eye_material()
    for side in ("eye.L", "eye.R"):
        if arm:
            b = arm[0].data.bones.get(side)
            if b is None:
                continue
            p = arm[0].matrix_world @ b.head_local
        else:
            p = Vector((0.029 if side.endswith("L") else -0.029, -0.118, 1.553))
        p = p + Vector((0.0, -0.0095, 0.0))
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=28, ring_count=18, location=p)
        e = bpy.context.object
        e.name = "eyeball_" + side[-1]
        bpy.ops.object.shade_smooth()
        e.scale = (1.0, 1.0, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        e.rotation_euler = (math.radians(90), 0, 0)
        e.data.materials.append(mat)
        eyes.append(e)
    return eyes


def hair_material(name="hair", color=(0.045, 0.032, 0.024)):
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    bump = nt.nodes.new("ShaderNodeBump")
    noise.inputs["Scale"].default_value = 420.0
    noise.inputs["Detail"].default_value = 8.0
    bump.inputs["Strength"].default_value = 0.5
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.42
    bsdf.inputs["Specular IOR Level"].default_value = 0.4
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def shell(obj, predicate, thickness=0.008, name="shell", mat=None):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.normal_update()
    keep = [f for f in bm.faces if predicate(f.calc_center_median(), f.normal)]
    if not keep:
        print("  shell empty", name)
        bm.free()
        ev.to_mesh_clear()
        return None
    bm2 = bmesh.new()
    vmap = {}
    for f in keep:
        n = f.normal.copy()
        vs = []
        for v in f.verts:
            if v.index not in vmap:
                vmap[v.index] = bm2.verts.new(v.co + n * thickness)
            vs.append(vmap[v.index])
        try:
            bm2.faces.new(vs)
        except ValueError:
            pass
    bm2.normal_update()
    res = bpy.data.meshes.new(name)
    bm2.to_mesh(res)
    bm2.free()
    bm.free()
    ev.to_mesh_clear()
    o = bpy.data.objects.new(name, res)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat or hair_material())
    for p in o.data.polygons:
        p.use_smooth = True
    sol = o.modifiers.new("solid", "SOLIDIFY")
    sol.thickness = 0.006
    sol.offset = 0.0
    print("  shell", name, len(keep), "faces")
    return o




SKIN_DIR = "/data/home/his-tree/assets/textures/skins"
os.makedirs(SKIN_DIR, exist_ok=True)


def bake_skin(obj, spec, res=512):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 24
    sc.cycles.bake_type = "DIFFUSE"
    sc.render.bake.use_pass_direct = False
    sc.render.bake.use_pass_indirect = False
    sc.render.bake.use_pass_color = True
    sc.render.bake.margin = 8

    mat = obj.data.materials[0]
    nt = mat.node_tree
    img = bpy.data.images.new("bake_albedo_" + spec["id"], res, res, alpha=False)
    node = nt.nodes.new("ShaderNodeTexImage")
    node.image = img
    nt.nodes.active = node
    for n in nt.nodes:
        n.select = False
    node.select = True

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.bake(type="DIFFUSE")
    path = os.path.join(SKIN_DIR, spec["id"] + "_albedo.png")
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    print("  baked", path)

    sc.cycles.bake_type = "ROUGHNESS"
    rimg = bpy.data.images.new("bake_rough_" + spec["id"], res // 2, res // 2, alpha=False)
    rnode = nt.nodes.new("ShaderNodeTexImage")
    rnode.image = rimg
    nt.nodes.active = rnode
    for n in nt.nodes:
        n.select = False
    rnode.select = True
    bpy.ops.object.bake(type="ROUGHNESS")
    rpath = os.path.join(SKIN_DIR, spec["id"] + "_rough.png")
    rimg.filepath_raw = rpath
    rimg.file_format = "PNG"
    rimg.save()
    print("  baked", rpath)

    newmat = bpy.data.materials.new("skin_baked_" + spec["id"])
    newmat.use_nodes = True
    n2 = newmat.node_tree
    for n in list(n2.nodes):
        n2.nodes.remove(n)
    out = n2.nodes.new("ShaderNodeOutputMaterial")
    bsdf = n2.nodes.new("ShaderNodeBsdfPrincipled")
    t1 = n2.nodes.new("ShaderNodeTexImage")
    t1.image = img
    t2 = n2.nodes.new("ShaderNodeTexImage")
    t2.image = rimg
    t2.image.colorspace_settings.name = "Non-Color"
    nrm = n2.nodes.new("ShaderNodeTexImage")
    try:
        nrm.image = bpy.data.images.load("/data/home/his-tree/assets/textures/skin_pores_normal.png")
        nrm.image.colorspace_settings.name = "Non-Color"
        nmap = n2.nodes.new("ShaderNodeNormalMap")
        nmap.inputs["Strength"].default_value = 0.18
        n2.links.new(nrm.outputs["Color"], nmap.inputs["Color"])
        n2.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    except Exception as e:
        print("  no pore normal", e)
    bsdf.inputs["Roughness"].default_value = 0.62
    bsdf.inputs["Specular IOR Level"].default_value = 0.42
    bsdf.inputs["Subsurface Weight"].default_value = 0.12
    bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
    n2.links.new(t1.outputs["Color"], bsdf.inputs["Base Color"])
    n2.links.new(t1.outputs["Alpha"], bsdf.inputs["Alpha"])
    n2.links.new(t2.outputs["Color"], bsdf.inputs["Roughness"])
    n2.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    obj.data.materials[0] = newmat
    return newmat

def export(path, extra=()):
    objs = [o for o in bpy.data.objects if o.type in ("MESH", "ARMATURE")]
    for o in bpy.data.objects:
        o.select_set(o in objs)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_animations=False,
        export_skins=True,
        export_normals=True,
        export_texcoords=True,
    )
    print("  wrote", path, round(os.path.getsize(path) / 1e6, 2), "MB")


def pose_apose():
    arm = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    if not arm:
        return
    a = arm[0]
    for side, sgn in (("L", 1), ("R", -1)):
        for bone, ang in (("upperarm01." + side, 52), ("upperarm02." + side, 8), ("lowerleg01." + side, 0)):
            b = a.pose.bones.get(bone)
            if b is None:
                continue
            b.rotation_mode = "XYZ"
            axis = "Y" if bone.startswith("upperarm") else "X"
            b.rotation_euler = (math.radians(ang * sgn) if axis == "X" else 0,
                                0 if axis == "X" else math.radians(-ang * sgn), 0)
    bpy.context.view_layer.update()


def build(spec):
    print("==", spec["id"])
    obj = new_human()
    zero_macros(obj)
    target(obj, "macrodetails/%s.target.gz" % spec["macro"], 1.0)
    ut = "macrodetails/universal-%s-%s-%s.target.gz" % (spec["sex"], "young" if "old" not in spec["macro"] else "old", spec["build"])
    target(obj, ut, 1.0)
    for rel, w in spec.get("targets", []):
        target(obj, rel, w)
    height_scale(obj, spec["height"])
    skin(obj, spec["hum"])
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.mpfb.add_standard_rig()
    pose_apose()
    add_eyes(obj)
    if spec.get("hair"):
        eye_z = 1.553 * (spec["height"] / 1.66)
        shell(obj, lambda c, n: c.z > eye_z + 0.022 and (c.y > -0.030 or abs(c.x) > 0.060),
              thickness=0.009, name="hair", mat=hair_material("hair_%s" % spec["id"], spec["hair"]))
    if spec.get("beard"):
        chin_z = 1.47 * (spec["height"] / 1.66)
        mouth_z = 1.50 * (spec["height"] / 1.66)
        shell(obj, lambda c, n: chin_z - 0.012 < c.z < mouth_z - 0.022 and c.y < -0.045 and abs(c.x) < 0.052,
              thickness=0.010, name="beard", mat=hair_material("beard_%s" % spec["id"], spec["beard"]))
    if os.environ.get("BAKE") == "1":
        bake_skin(obj, spec)
    bpy.ops.wm.save_as_mainfile(filepath="/data/home/mp/%s.blend" % spec["id"])
    export(os.path.join(OUT, spec["id"] + ".glb"))


CHARS = json.load(open(sys.argv[sys.argv.index("--") + 1])) if "--" in sys.argv else []

if __name__ == "__main__":
    only = os.environ.get("ONLY")
    for c in CHARS:
        if only and c["id"] != only:
            continue
        build(c)
