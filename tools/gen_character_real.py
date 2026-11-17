import bpy, bmesh, math, os, sys, json, zipfile, subprocess
from mathutils import Vector
from mathutils.kdtree import KDTree

from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

T = "/data/home/.config/blender/4.3/extensions/user_default/mpfb/data/targets"
ZIP = "/data/home/mp/sys_assets.zip"
ASSETS = "/data/home/mp/assets"
OUT = "/data/home/his-tree/assets/models/characters"
PREVIEW = "/data/home/luxin/char_preview"
MH_UNITS = 17.0
os.makedirs(OUT, exist_ok=True)
os.makedirs(PREVIEW, exist_ok=True)


def ensure_asset(path):
    local = os.path.join(ASSETS, path)
    if os.path.exists(local):
        return local
    with zipfile.ZipFile(ZIP) as z:
        if path not in z.namelist():
            print("  MISSING IN ZIP", path)
            return None
        os.makedirs(os.path.dirname(local), exist_ok=True)
        with z.open(path) as src, open(local, "wb") as dst:
            dst.write(src.read())
    return local


def obj_extents(path):
    xs, ys, zs = [], [], []
    with open(path, "r", errors="ignore") as f:
        for line in f:
            if line.startswith("v "):
                p = line.split()
                xs.append(float(p[1])); ys.append(float(p[2])); zs.append(float(p[3]))
    return (min(xs), max(xs)), (min(ys), max(ys)), (min(zs), max(zs))


def clear():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.meshes):
        if m.users == 0:
            bpy.data.meshes.remove(m)


def new_human():
    clear()
    HumanService.create_human()
    return [o for o in bpy.data.objects if o.type == "MESH"][0]


def zero_macros(obj):
    for k in obj.data.shape_keys.key_blocks:
        if k.name.startswith("$md"):
            k.value = 0.0


def target(obj, rel, w=1.0):
    path = os.path.join(T, rel)
    if not os.path.exists(path):
        print("  miss target", rel)
        return False
    TargetService.load_target(obj, path, weight=w)
    return True


def evaluated_bounds(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    zs = [v.co.z for v in me.vertices]
    xs = [v.co.x for v in me.vertices]
    ys = [v.co.y for v in me.vertices]
    res = (min(zs), max(zs), min(xs), max(xs), min(ys), max(ys))
    ev.to_mesh_clear()
    return res


def height_scale(obj, want):
    lo, hi, _, _, _, _ = evaluated_bounds(obj)
    f = want / (hi - lo)
    obj.scale = (f, f, f)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    print("  height -> %.3f (x%.3f)" % (want, f))


def optimize_texture(path):
    if not path or not os.path.exists(path):
        return path
    if os.path.getsize(path) < 400000:
        return path
    web = os.path.join(ASSETS, "web")
    os.makedirs(web, exist_ok=True)
    out = os.path.join(web, os.path.basename(path).rsplit(".", 1)[0] + ".jpg")
    if not os.path.exists(out):
        subprocess.run(["convert", path, "-resize", "2048x2048", "-quality", "86", out], check=True)
    print("  optimized", os.path.basename(path), "->", out, os.path.getsize(out))
    return out


def make_material(name, diffuse=None, normal=None, roughness=0.55, subsurface=0.0):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    if diffuse:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(optimize_texture(diffuse))
        tex.image.colorspace_settings.name = "sRGB"
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    if normal:
        ntex = nt.nodes.new("ShaderNodeTexImage")
        ntex.image = bpy.data.images.load(optimize_texture(normal))
        ntex.image.colorspace_settings.name = "Non-Color"
        nmap = nt.nodes.new("ShaderNodeNormalMap")
        nmap.inputs["Strength"].default_value = 0.7
        nt.links.new(ntex.outputs["Color"], nmap.inputs["Color"])
        nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Specular IOR Level"].default_value = 0.4
    if subsurface:
        bsdf.inputs["Subsurface Weight"].default_value = subsurface
        bsdf.inputs["Subsurface Radius"].default_value = (0.36, 0.14, 0.08)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


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
    bsdf.inputs["Roughness"].default_value = 0.22
    bsdf.inputs["Specular IOR Level"].default_value = 0.6
    nt.links.new(coord.outputs["UV"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def add_eyes(obj, r=0.0122, top=1.8):
    mat = eye_material()
    k = top / 1.66
    for side in ("L", "R"):
        p = Vector((0.029 if side == "L" else -0.029, -0.118, 1.553 * k))
        p = p + Vector((0.0, 0.0035, -0.0015))
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=24, ring_count=16, location=p)
        e = bpy.context.object
        e.name = "eyeball_" + side[-1]
        bpy.ops.object.shade_smooth()
        e.data.materials.append(mat)


def recalc_normals(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def pose_arms(obj, shoulder_x=0.175, shoulder_z=1.42, angle=52.0, smooth=0.11, inner=0.125):
    me = obj.data
    for v in me.vertices:
        w = min(1.0, max(0.0, (abs(v.co.x) - inner) / smooth))
        if w <= 0.0:
            continue
        side = 1.0 if v.co.x > 0 else -1.0
        px, pz = side * shoulder_x, shoulder_z
        dx = v.co.x - px
        dz = v.co.z - pz
        th = math.radians(angle) * side
        rx = px + dx * math.cos(th) + dz * math.sin(th)
        rz = pz - dx * math.sin(th) + dz * math.cos(th)
        ox, oz = v.co.x, v.co.z
        v.co.x = ox + (rx - ox) * w
        v.co.z = oz + (rz - oz) * w
    me.update()


def import_obj(path, name):
    before = set(bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=path, forward_axis="NEGATIVE_Z", up_axis="Y")
    new = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    if not new:
        print("  import produced nothing", path)
        return None
    o = new[0]
    o.name = name
    return o


def mesh_bbox(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    xs = [v.co.x for v in me.vertices]
    ys = [v.co.y for v in me.vertices]
    zs = [v.co.z for v in me.vertices]
    ev.to_mesh_clear()
    if not xs:
        return None
    return (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs))


def hz_top(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    zs = [v.co.z for v in me.vertices]
    ev.to_mesh_clear()
    return max(zs) if zs else 1.8


def skull_center(obj, zmin, zmax):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    zs = [v.co.z for v in me.vertices]
    top = max(zs)
    cut = zmax - (zmax - zmin) * 0.07
    ys = [v.co.y for v in me.vertices if v.co.z > cut]
    xs = [v.co.x for v in me.vertices if v.co.z > cut]
    ev.to_mesh_clear()
    if not ys:
        return 0.0, 0.0, top
    return (min(xs) + max(xs)) * 0.5, (min(ys) + max(ys)) * 0.5, top


def band_extents(obj, z0, z1):
    xs, ys = [], []
    for v in obj.data.vertices:
        if z0 <= v.co.z <= z1:
            xs.append(v.co.x)
            ys.append(v.co.y)
    if not xs:
        return 0.0, 0.0
    return max(abs(min(xs)), abs(max(xs))), (max(ys) - min(ys))


def torso_radius(obj, z0, z1, xmax=0.17):
    r = 0.0
    for v in obj.data.vertices:
        if z0 <= v.co.z <= z1 and abs(v.co.x) <= xmax:
            r = max(r, math.hypot(v.co.x, v.co.y))
    return r


def fit_over_body(body, cloth, bands=((1.10, 1.40), (0.70, 0.95), (1.42, 1.58))):
    extra = 1.0
    for z0, z1 in bands:
        br = torso_radius(body, z0, z1)
        cr = torso_radius(cloth, z0, z1)
        print("   band %.2f-%.2f body r%.3f cloth r%.3f" % (z0, z1, br, cr))
        if cr > 1e-4 and br > 0:
            extra = max(extra, br / cr)
    extra *= 1.02
    xs = [v.co.x for v in cloth.data.vertices]
    ys = [v.co.y for v in cloth.data.vertices]
    cx = (min(xs) + max(xs)) * 0.5
    cy = (min(ys) + max(ys)) * 0.5
    fx = extra * 1.05
    fy = extra * 1.16
    for v in cloth.data.vertices:
        v.co.x = cx + (v.co.x - cx) * fx
        v.co.y = cy + (v.co.y - cy) * fy
    cloth.data.update()
    print("  fitted clothes over body: x%.3f y%.3f" % (fx, fy))


def joint_positions(obj):
    groups = {}
    for g in obj.vertex_groups:
        if g.name.startswith("joint-"):
            groups[g.index] = g.name
    acc = {}
    for v in obj.data.vertices:
        for ge in v.groups:
            name = groups.get(ge.group)
            if name is None:
                continue
            a = acc.get(name)
            if a is None:
                a = [Vector((0.0, 0.0, 0.0)), 0]
                acc[name] = a
            a[0] += v.co
            a[1] += 1
    return {k: (v[0] / v[1]) for k, v in acc.items()}


def cloth_kdtree(cloth_objs):
    pts = []
    norms = []
    for o in cloth_objs:
        mw = o.matrix_world
        nm = mw.to_3x3().inverted().transposed()
        for v in o.data.vertices:
            pts.append(mw @ v.co)
            n = nm @ v.normal
            norms.append(n.normalized() if n.length > 1e-6 else Vector((0, 0, 1)))
    tree = KDTree(len(pts))
    for i, p in enumerate(pts):
        tree.insert(p, i)
    tree.balance()
    return tree, norms


def shrink_body_under_clothes(body, cloth_objs, joints, eps=0.07, offset=0.014, max_move=0.08):
    if not cloth_objs:
        return
    tree, norms = cloth_kdtree(cloth_objs)
    xs = [v.co.x for v in body.data.vertices]
    zs = [v.co.z for v in body.data.vertices]
    xmax = max(abs(min(xs)), abs(max(xs)))
    ztop = max(zs)
    zbot = min(zs)
    head_z = zbot + (ztop - zbot) * 0.80
    foot_z = zbot + (ztop - zbot) * 0.10
    hand_x = xmax - 0.14
    moved = 0
    worst = 0.0
    for v in body.data.vertices:
        p = v.co.copy()
        if p.z > head_z or p.z < foot_z or abs(p.x) > hand_x:
            continue
        co, idx, dist = tree.find(p)
        if dist > eps:
            continue
        n = norms[idx]
        if (p - co).dot(n) < -0.004:
            continue
        if dist + offset > max_move:
            continue
        v.co = co - n * offset
        moved += 1
        worst = max(worst, dist)
    body.data.update()
    print("  shrink under clothes: moved %d verts, max penetration %.3f (head_z %.3f hand_x %.3f)" % (
        moved, worst, head_z, hand_x), flush=True)


def place_asset(obj, human_bbox, mode, mh_extents, human=None):
    bb = mesh_bbox(obj)
    if bb is None:
        return
    hx0, hx1, hy0, hy1, hz0, hz1 = human_bbox
    ax0, ax1, ay0, ay1, az0, az1 = bb
    mh_x, mh_y, mh_z = mh_extents
    mh_y_ext = mh_y[1] - mh_y[0]
    mh_z_ext = mh_z[1] - mh_z[0]
    if abs((az1 - az0) - mh_y_ext) > abs((az1 - az0) - mh_z_ext):
        print("  rotating to make MH-Y vertical")
        obj.rotation_euler = (math.radians(90), 0, 0)
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        bb = mesh_bbox(obj)
        ax0, ax1, ay0, ay1, az0, az1 = bb

    s = (hz1 - hz0) / MH_UNITS
    obj.scale = (s, s, s)
    obj.location.x = (hx0 + hx1) * 0.5 - (ax0 + ax1) * 0.5 * s
    obj.location.y = (hy0 + hy1) * 0.5 - (ay0 + ay1) * 0.5 * s
    if mode == "head":
        top = hz1
        head_h = (hz1 - hz0) * 0.155
        sx, sy, stop = skull_center(human, hz0, hz1)
        obj.location.x = sx - (ax0 + ax1) * 0.5 * s
        obj.location.y = sy - (ay0 + ay1) * 0.5 * s
        obj.location.z = (top - head_h * 0.72) - az0 * s
    else:
        sx = s * 1.09
        sy = s * 1.06
        sz = s * 1.01
        obj.scale = (sx, sy, sz)
        obj.location.x = (hx0 + hx1) * 0.5 - (ax0 + ax1) * 0.5 * sx
        obj.location.y = (hy0 + hy1) * 0.5 - (ay0 + ay1) * 0.5 * sy
        obj.location.z = (hz0 + (hz1 - hz0) * 0.02) - az0 * sz
        s = sx
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)
    fb = mesh_bbox(obj)
    print("  placed %s scale %.4f world x[%.2f %.2f] y[%.2f %.2f] z[%.2f %.2f]" % (
        obj.name, s, fb[0], fb[1], fb[2], fb[3], fb[4], fb[5]))


def apply_mh_asset(kind, name, diffuse, normal, human_bbox, mode, human):
    obj_path = ensure_asset("%s/%s/%s.obj" % (kind, name, name))
    if obj_path is None:
        return None
    ext = obj_extents(obj_path)
    o = import_obj(obj_path, "%s_%s" % (kind, name))
    if o is None:
        return None
    tex = ensure_asset(diffuse) if diffuse else None
    nrm = ensure_asset(normal) if normal else None
    mat = make_material("%s_mat_%s" % (kind, name), tex, nrm,
                         roughness=0.5 if kind == "clothes" else 0.62)
    o.data.materials.clear()
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = True
    recalc_normals(o)
    place_asset(o, human_bbox, mode, ext, human)
    if mode == "body" and human is not None:
        fit_over_body(human, o)

    return o


def export(path):
    objs = [o for o in bpy.data.objects if o.type in ("MESH", "ARMATURE")]
    for o in bpy.data.objects:
        o.select_set(o in objs)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True, export_apply=True,
        export_yup=True, export_animations=False, export_skins=True,
        export_normals=True, export_texcoords=True,
    )
    print("  wrote", path, round(os.path.getsize(path) / 1e6, 2), "MB")


def pose_apose():
    arm = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    if not arm:
        return
    a = arm[0]
    for side, sgn in (("L", 1), ("R", -1)):
        for bone, ang in (("upperarm01." + side, 52), ("upperarm02." + side, 8)):
            b = a.pose.bones.get(bone)
            if b is None:
                continue
            b.rotation_mode = "XYZ"
            b.rotation_euler = (0, math.radians(-ang * sgn), 0)
    bpy.context.view_layer.update()


def preview(spec, height):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 48
    sc.cycles.use_denoising = False
    sc.render.resolution_x = 560
    sc.render.resolution_y = 720
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Base Contrast"
    world = bpy.data.worlds.new("W")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.012, 0.015, 0.02, 1)
    sc.world = world
    cam_d = bpy.data.cameras.new("C")
    cam_d.lens = 85
    cam = bpy.data.objects.new("Camera", cam_d)
    sc.collection.objects.link(cam)
    sc.camera = cam
    target = Vector((0.0, 0.0, height * 0.86))
    cam.location = Vector((0.35, -1.25, height * 0.90))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    key = bpy.data.lights.new("K", "AREA")
    key.energy = 420
    key.size = 1.2
    ko = bpy.data.objects.new("K", key)
    sc.collection.objects.link(ko)
    ko.location = (-1.1, -1.3, height * 1.05)
    ko.rotation_euler = (target - ko.location).to_track_quat("-Z", "Y").to_euler()
    rim = bpy.data.lights.new("R", "AREA")
    rim.energy = 260
    rim.size = 0.8
    rim.color = (0.55, 0.72, 1.0)
    ro = bpy.data.objects.new("R", rim)
    sc.collection.objects.link(ro)
    ro.location = (1.3, 0.9, height * 1.02)
    ro.rotation_euler = (target - ro.location).to_track_quat("-Z", "Y").to_euler()
    path = os.path.join(PREVIEW, spec["id"] + ".png")
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("  preview", path, flush=True)
    cam.location = Vector((-0.95, -1.05, height * 0.90))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    path2 = os.path.join(PREVIEW, spec["id"] + "_34.png")
    sc.render.filepath = path2
    bpy.ops.render.render(write_still=True)
    print("  preview", path2, flush=True)


def preview_fast(spec, height):
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "TEXTURE"
    sc.display.shading.show_shadows = True
    sc.display.shading.show_cavity = True
    sc.display.render_aa = "8"
    sc.render.resolution_x = 480
    sc.render.resolution_y = 640
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "Standard"
    cam_d = bpy.data.cameras.new("CF")
    cam_d.lens = 55
    cam = bpy.data.objects.new("CameraF", cam_d)
    sc.collection.objects.link(cam)
    sc.camera = cam
    target = Vector((0.0, 0.0, height * 0.52))
    cam.location = Vector((0.0, -2.6, height * 0.56))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    path = os.path.join(PREVIEW, spec["id"] + "_front.png")
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("  preview", path, flush=True)


def build(spec):
    print("==", spec["id"], flush=True)
    obj = new_human()
    zero_macros(obj)
    target(obj, "macrodetails/%s.target.gz" % spec["macro"], 1.0)
    ut = "macrodetails/universal-%s-%s-%s.target.gz" % (
        spec["sex"], "old" if "old" in spec["macro"] else "young", spec["build"])
    target(obj, ut, 1.0)
    for rel, w in spec.get("targets", []):
        target(obj, rel, w)
    height_scale(obj, spec["height"])

    hb = evaluated_bounds(obj)
    human_bbox = (hb[2], hb[3], hb[4], hb[5], hb[0], hb[1])
    print("  human bbox", [round(v, 3) for v in human_bbox], flush=True)

    skin_tex = ensure_asset(spec["skin"])
    skin_mat = make_material("skin_%s" % spec["id"], skin_tex, None, 0.52, 0.08)
    obj.data.materials.clear()
    obj.data.materials.append(skin_mat)

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.view_layer.objects.active
    print("  baked body verts", len(obj.data.vertices), "uvs", [u.name for u in obj.data.uv_layers])
    print("  bbox before pose", [round(v, 3) for v in mesh_bbox(obj)], flush=True)
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    cx = (min(xs) + max(xs)) * 0.5
    cy = (min(ys) + max(ys)) * 0.5
    thin = 0.97
    for v in obj.data.vertices:
        v.co.x = cx + (v.co.x - cx) * thin
        v.co.y = cy + (v.co.y - cy) * thin
    obj.data.update()
    print("  bbox final", [round(v, 3) for v in mesh_bbox(obj)], flush=True)
    add_eyes(obj, top=hz_top(obj))

    if spec.get("hair"):
        apply_mh_asset("hair", spec["hair"], spec["hair_tex"], None, human_bbox, "head", obj)
    if spec.get("clothes"):
        apply_mh_asset("clothes", spec["clothes"], spec["clothes_tex"], spec.get("clothes_normal"),
                       human_bbox, "body", obj)
        clothes = [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("clothes_")]
        joints = joint_positions(obj)
        print("  joints", {k: [round(c, 3) for c in p] for k, p in sorted(joints.items())}, flush=True)
        if os.environ.get("SHRINK", "1") == "1":
            shrink_body_under_clothes(obj, clothes, joints)

    bb = mesh_bbox(obj)
    print("  body bbox after pose", [round(v, 3) for v in bb], flush=True)
    for o in bpy.data.objects:
        if o.type == "MESH":
            print("  scene mesh", o.name, len(o.data.vertices), "visible", o.visible_get(),
                  "hide_render", o.hide_render, "scale", tuple(round(v, 3) for v in o.scale), flush=True)
    export(os.path.join(OUT, spec["id"] + ".glb"))
    if os.environ.get("PREVIEW") == "1":
        preview(spec, spec["height"])
    elif os.environ.get("PREVIEW") == "fast":
        preview_fast(spec, spec["height"])
    print("DONE", spec["id"], flush=True)


CHARS = json.load(open(sys.argv[sys.argv.index("--") + 1])) if "--" in sys.argv else []

if __name__ == "__main__":
    only = os.environ.get("ONLY")
    for c in CHARS:
        if only and c["id"] != only:
            continue
        build(c)
