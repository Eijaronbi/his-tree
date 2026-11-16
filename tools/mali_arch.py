import bpy, bmesh, math, random, sys, os
import numpy as np
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1]
os.makedirs(OUT, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def img(path, noncolor=False):
    im = bpy.data.images.load(path, check_existing=False)
    if noncolor:
        im.colorspace_settings.name = 'Non-Color'
    return im


def pbr_material(name, alb, nrm, rgh, nstrength=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    ta = nt.nodes.new('ShaderNodeTexImage')
    ta.image = alb
    ta.interpolation = 'Linear'
    nt.links.new(ta.outputs['Color'], bsdf.inputs['Base Color'])
    tn = nt.nodes.new('ShaderNodeTexImage')
    tn.image = nrm
    tn.interpolation = 'Linear'
    nmap = nt.nodes.new('ShaderNodeNormalMap')
    nmap.inputs['Strength'].default_value = nstrength
    nt.links.new(tn.outputs['Color'], nmap.inputs['Color'])
    nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    tr = nt.nodes.new('ShaderNodeTexImage')
    tr.image = rgh
    tr.interpolation = 'Linear'
    nt.links.new(tr.outputs['Color'], bsdf.inputs['Roughness'])
    bsdf.inputs['Metallic'].default_value = 0.0
    return mat


def uv_project(obj, tile=2.0):
    bpy.context.view_layer.objects.active = obj
    if not obj.data.uv_layers:
        obj.data.uv_layers.new(name='UVMap')
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=tile, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')


def box(name, sx, sy, sz, loc, mat=None, rot_z=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.rotation_euler[2] = rot_z
    if mat:
        obj.data.materials.append(mat)
    return obj


def tapered_wall(name, w, d, h, taper, loc, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (w, d, h)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.context.view_layer.objects.active = obj
    top = [v for v in obj.data.vertices if v.co.z > 0]
    for v in top:
        v.co.x *= taper
        v.co.y *= taper
    obj.data.materials.append(mat)
    return obj


def cylinder(name, radius, length, loc, rot, mat, verts=8):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=length, vertices=verts, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def make_house(seed, adobe, wood, dark, out_name):
    rng = random.Random(seed)
    w = rng.uniform(5.5, 9.0)
    d = rng.uniform(5.5, 8.5)
    h = rng.uniform(3.6, 6.2)
    two_storey = rng.random() < 0.45
    if two_storey:
        h *= 1.45
    courtyard = rng.random() < 0.3

    parts = []
    wall = tapered_wall('wall', w, d, h, 0.94, (0, 0, h / 2), adobe)
    parts.append(wall)

    parapet_h = rng.uniform(0.45, 0.8)
    cap = tapered_wall('parapet', w * 0.97, d * 0.97, parapet_h, 0.94, (0, 0, h + parapet_h / 2), adobe)
    parts.append(cap)

    if rng.random() < 0.7:
        merlons = max(3, int(w / 1.3))
        for i in range(merlons):
            x = -w * 0.42 + (w * 0.84 / (merlons - 1)) * i
            m = box('merlon', rng.uniform(0.5, 0.85), parapet_h * 1.5, 0.32, (x, d * 0.47, h + parapet_h * 0.8), adobe)
            parts.append(m)

    for side in (1, -1):
        rows = max(2, int(h / 1.7))
        per_row = max(2, int(w / 2.4))
        for r in range(rows):
            for c in range(per_row):
                x = -w * 0.40 + (w * 0.80 / max(1, per_row - 1)) * c
                y = side * (d * 0.47 + 0.32)
                t = cylinder('toron', 0.09, 0.95, (x, y, 0.95 + r * (h / rows)), (math.pi / 2, 0, 0), wood, 6)
                parts.append(t)

    door_w = rng.uniform(1.2, 1.7)
    door_h = rng.uniform(2.1, 2.6)
    door = box('door_recess', door_w, 0.3, door_h, (0, d * 0.48, door_h / 2), dark)
    parts.append(door)
    lintel = box('lintel', door_w + 0.5, 0.42, 0.3, (0, d * 0.47, door_h + 0.15), wood)
    parts.append(lintel)
    threshold = box('threshold', door_w + 0.6, 0.7, 0.12, (0, d * 0.5, 0.06), adobe)
    parts.append(threshold)

    win_count = rng.randint(2, 5)
    for i in range(win_count):
        x = rng.uniform(-w * 0.38, w * 0.38)
        z = rng.uniform(1.9, max(2.1, h - 1.0))
        if abs(x) < door_w and z < door_h + 0.6:
            continue
        win = box('window', rng.uniform(0.55, 0.95), 0.26, rng.uniform(0.6, 0.9), (x, d * 0.48, z), dark)
        parts.append(win)
        ledge = box('ledge', rng.uniform(0.8, 1.2), 0.22, 0.12, (x, d * 0.51, z - 0.45), adobe)
        parts.append(ledge)

    if courtyard:
        inner = box('courtyard_wall', w * 0.55, d * 0.55, h * 0.45, (0, 0, h * 0.22), adobe)
        parts.append(inner)

    if rng.random() < 0.55:
        beam_count = rng.randint(3, 6)
        for i in range(beam_count):
            x = rng.uniform(-w * 0.35, w * 0.35)
            b = cylinder('roof_beam', 0.11, rng.uniform(1.2, 2.2), (x, rng.uniform(-d * 0.3, d * 0.3), h + parapet_h + 0.4), (0, rng.uniform(0.8, 1.3), rng.uniform(-0.4, 0.4)), wood, 6)
            parts.append(b)

    if rng.random() < 0.5:
        step = box('stair', 1.2, 0.45, 0.18, (w * 0.3, d * 0.5 + 0.5, 0.09), adobe)
        parts.append(step)
        step2 = box('stair2', 1.2, 0.45, 0.36, (w * 0.3, d * 0.5 + 0.95, 0.18), adobe)
        parts.append(step2)

    for obj in parts:
        obj.select_set(True)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = wall
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = out_name
    uv_project(joined, 2.0)
    path = os.path.join(OUT, out_name + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_materials='EXPORT')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return path


for variant in range(3):
    reset()
    texdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'textures')
    tag = 'v%d' % variant
    adobe = pbr_material('adobe_mat%d' % variant,
                         img(os.path.join(texdir, 'adobe_%s_albedo.png' % tag)),
                         img(os.path.join(texdir, 'adobe_%s_normal.png' % tag), True),
                         img(os.path.join(texdir, 'adobe_%s_rough.png' % tag), True), 1.0)
    wood = pbr_material('wood_mat%d' % variant,
                        img(os.path.join(texdir, 'wood_albedo.png')),
                        img(os.path.join(texdir, 'wood_normal.png'), True),
                        img(os.path.join(texdir, 'wood_rough.png'), True), 1.0)
    dark = bpy.data.materials.new('dark_mat%d' % variant)
    dark.use_nodes = True
    dark.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.045, 0.028, 0.016, 1)
    dark.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1.0
    path = make_house(100 + variant * 7, adobe, wood, dark, 'mali_house_v%d' % variant)
    print('WROTE', path, os.path.getsize(path))
