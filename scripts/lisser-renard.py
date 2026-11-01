"""Blender : arrondit le maillage Fox en conservant le rig et les clips.

blender -b --python scripts/lisser-renard.py -- source.glb sortie.glb
"""
import bpy
import bmesh
import sys
from pathlib import Path

entree,sortie=sys.argv[sys.argv.index('--')+1:]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(Path(entree).resolve()))
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH':continue
    bpy.context.view_layer.objects.active=obj
    # glTF duplique les sommets aux coutures d'UV et aux arêtes dures. Sans
    # soudure, chaque triangle se subdivise seul et ouvre des trous.
    maillage=bmesh.new();maillage.from_mesh(obj.data)
    bmesh.ops.remove_doubles(maillage,verts=list(maillage.verts),dist=.0001)
    maillage.to_mesh(obj.data);maillage.free()
    mod=obj.modifiers.new('Surface continue','SUBSURF');mod.levels=2;mod.render_levels=2
    while list(obj.modifiers).index(mod)>0:bpy.ops.object.modifier_move_up(modifier=mod.name)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for face in obj.data.polygons:face.use_smooth=True
bpy.ops.export_scene.gltf(filepath=str(Path(sortie).resolve()),export_format='GLB',export_animations=True)
