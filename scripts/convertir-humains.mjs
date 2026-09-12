// Conversion reproductible des personnages Microsoft Rocketbox (MIT).
// Les FBX/TGA sources restent dans work ; seules les GLB optimisées sont livrées.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { TGALoader } from "three/examples/jsm/loaders/TGALoader.js";
import {
  mergeVertices,
  mergeGroups,
} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
globalThis.window = { URL };
globalThis.FileReader = class {
  readAsArrayBuffer(b) {
    b.arrayBuffer().then((x) => {
      this.result = x;
      this.onloadend?.();
    });
  }
  readAsDataURL(b) {
    b.arrayBuffer().then((x) => {
      this.result =
        "data:" + b.type + ";base64," + Buffer.from(x).toString("base64");
      this.onloadend?.();
    });
  }
};
const root = path.resolve(process.argv[2] || "../../rocketbox/Assets/Avatars");
const out = path.resolve(process.argv[3] || "../vendor/humains");
fs.mkdirSync(out, { recursive: true });
const entries = [
  ["Adults/Male_Adult_12", "homme-denim"],
  ["Professions/Business_Male_02", "homme-costume"],
  ["Professions/Business_Female_02", "femme-tailleur"],
  ["Adults/Male_Adult_01", "homme-chemise"],
  ["Adults/Male_Adult_05", "homme-veste"],
  ["Adults/Female_Adult_01", "femme-chemise"],
  ["Adults/Female_Adult_06", "femme-manteau"],
  ["Children/Male_Child_01", "garcon"],
  ["Children/Female_Child_01", "fille"],
];
const manager = new THREE.LoadingManager();
manager.addHandler(/\.tga$/i, {
  setPath(p) {
    this.path = p;
    return this;
  },
  load(url) {
    const t = new THREE.Texture();
    t.userData.source = url.split(/[\\/]/).pop();
    return t;
  },
});
for (const [dir, id] of entries) {
  const f = path.join(root, dir, "Export", path.basename(dir) + ".fbx");
  const data = fs.readFileSync(f);
  const scene = new FBXLoader(manager).parse(
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    "",
  );
  scene.animations = [];
  const lights = [];
  scene.traverse((o) => {
    if (o.isLight || o.isCamera) lights.push(o);
  });
  lights.forEach((o) => o.removeFromParent());
  scene.updateMatrixWorld(true);
  let meshes = [];
  scene.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  // Le modèle n'est jamais changé en taille dans le jeu : géométrie et textures
  // peuvent ainsi être partagées sans qu'un enfant rétrécisse tous les adultes.
  const box = new THREE.Box3().setFromObject(scene);
  const h = box.max.y - box.min.y;
  const scale = (id === "garcon" || id === "fille" ? 1.48 : 1.76) / h;
  const normalized = new THREE.Group();
  normalized.name = id;
  normalized.rotation.y = Math.PI;
  normalized.add(scene);
  scene.scale.multiplyScalar(scale);
  scene.position.y -= box.min.y * scale;
  normalized.updateMatrixWorld(true);
  for (const mesh of meshes) {
    mesh.frustumCulled = false;
    mesh.geometry = mergeGroups(mergeVertices(mesh.geometry));
    const old = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mesh.material = old.map((m) => {
      const n = new THREE.MeshStandardMaterial({
        name: m.name,
        roughness: 0.83,
        metalness: 0,
        side: /opacity|glasses/.test(m.name)
          ? THREE.DoubleSide
          : THREE.FrontSide,
      });
      n.userData.sources = {
        color: m.map?.userData.source,
        normal: m.normalMap?.userData.source,
      };
      if (/opacity|glasses/.test(m.name)) {
        n.alphaTest = 0.38;
        n.roughness = 0.92;
      }
      return n;
    });
  }
  const gltf = await new GLTFExporter().parseAsync(normalized, {
    binary: false,
    onlyVisible: false,
  });
  let chunks = [Buffer.from(gltf.buffers[0].uri.split(",")[1], "base64")];
  let length = chunks[0].length;
  const push = (b) => {
    const pad = (4 - (length % 4)) % 4;
    if (pad) {
      chunks.push(Buffer.alloc(pad));
      length += pad;
    }
    const off = length;
    chunks.push(b);
    length += b.length;
    return off;
  };
  gltf.images = [];
  gltf.textures = [];
  gltf.samplers = [
    { magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 },
  ];
  for (const mat of gltf.materials) {
    const src = mat.extras?.sources || {};
    delete mat.extras;
    for (const type of ["color", "normal"]) {
      if (!src[type]) continue;
      const p = path.join(root, dir, "Textures", src[type]);
      if (!fs.existsSync(p)) continue;
      const input = fs.readFileSync(p);
      const img = new TGALoader().parse(
        input.buffer.slice(
          input.byteOffset,
          input.byteOffset + input.byteLength,
        ),
      );
      const dim = type === "normal" || !/head/.test(mat.name) ? 512 : 1024;
      let transform = sharp(Buffer.from(img.data), {
        raw: { width: img.width, height: img.height, channels: 4 },
      })
        .flip()
        .resize(dim, dim, { fit: "inside" });
      const alpha = /opacity|glasses/.test(mat.name);
      let b, mime;
      if (alpha && type === "color") {
        b = await transform.png().toBuffer();
        mime = "image/png";
      } else {
        b = await transform
          .removeAlpha()
          .jpeg({ quality: type === "color" ? 88 : 90 })
          .toBuffer();
        mime = "image/jpeg";
      }
      const view = gltf.bufferViews.length;
      gltf.bufferViews.push({
        buffer: 0,
        byteOffset: push(b),
        byteLength: b.length,
      });
      const image = gltf.images.length;
      gltf.images.push({ bufferView: view, mimeType: mime });
      const texture = gltf.textures.length;
      gltf.textures.push({ sampler: 0, source: image });
      if (type === "color")
        mat.pbrMetallicRoughness.baseColorTexture = { index: texture };
      else mat.normalTexture = { index: texture, scale: 0.65 };
    }
  }
  gltf.buffers = [{ byteLength: length }];
  let json = Buffer.from(JSON.stringify(gltf));
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
  let bin = Buffer.concat(chunks);
  bin = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + json.length + bin.length, 8);
  const jh = Buffer.alloc(8);
  jh.writeUInt32LE(json.length);
  jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(bin.length);
  bh.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(
    path.join(out, id + ".glb"),
    Buffer.concat([header, jh, json, bh, bin]),
  );
  console.log(
    id,
    Math.round(fs.statSync(path.join(out, id + ".glb")).size / 1024) + " KB",
    meshes.map(
      (m) =>
        (m.geometry.index?.count || m.geometry.attributes.position.count) / 3,
    ),
  );
}
fs.copyFileSync(
  path.resolve(root, "../../LICENSE.md"),
  path.join(out, "LICENSE.md"),
);
