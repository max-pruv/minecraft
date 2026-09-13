// Une personne garde sa place quand on détourne les yeux. Seule la distance
// atténue sa présence, sans faire pâlir les autres utilisateurs d'un matériau
// partagé. La transparence ne dure que pendant le fondu ; les corps pleinement
// présents reprennent leur écriture de profondeur normale.
export const DISTANCE_PRESENCE = { pleine: 80, fin: 112, recyclage: 136 };

export function actualiserPresence(npc, distance, dt, autorise = true) {
  const mesh = npc.mesh;
  // Un corps mis à niveau sur place (personnages.js, v245) porte des maillages
  // neufs aux matériaux PARTAGÉS : les copies privées d'avant ne pilotent plus
  // rien, et fondre les partagés ferait pâlir tout le monde. On recopie, en
  // gardant la présence acquise — la personne ne réapparaît pas.
  const version = mesh.userData.miseANiveau || 0;
  if (npc.presence && npc.presence.version !== version) {
    npc.presence = { valeur: npc.presence.valeur, materiaux: null, version };
  }
  if (!npc.presence || !npc.presence.materiaux) {
    const acquise = npc.presence ? npc.presence.valeur : null;
    const copies = new Map();
    mesh.traverse((o) => {
      if (!o.isMesh) return;
      const copier = (m) => {
        if (!copies.has(m)) {
          const c = m.clone();
          // Les textures et la géométrie restent partagées ; le matériau est
          // propre à ce personnage et sera libéré avec lui.
          c.userData = { ...m.userData, partagee: false };
          copies.set(m, {
            material: c,
            opacity: m.opacity,
            transparent: m.transparent,
            depthWrite: m.depthWrite,
          });
        }
        return copies.get(m).material;
      };
      o.material = Array.isArray(o.material)
        ? o.material.map(copier)
        : copier(o.material);
    });
    // Les éventuels matériaux privés du vestiaire viennent d’être remplacés.
    // Leurs textures restent utilisées par les copies.
    for (const original of copies.keys())
      if (!original.userData.partagee) original.dispose();
    npc.presence = {
      valeur: acquise ?? (npc.apparitionDouce ? 0 : 1),
      materiaux: [...copies.values()],
      version,
    };
  }
  const p = npc.presence;
  const t = Math.max(
    0,
    Math.min(
      1,
      (distance - DISTANCE_PRESENCE.pleine) /
        (DISTANCE_PRESENCE.fin - DISTANCE_PRESENCE.pleine),
    ),
  );
  const cible = autorise ? 1 - t * t * (3 - 2 * t) : 0;
  // La durée est aussi bornée : un voyage rapide ne transforme pas la bande
  // spatiale de fondu en interrupteur d'une seule image.
  const pas = Math.min(0.1, Math.max(0, dt)) / 0.8;
  p.valeur += Math.max(-pas, Math.min(pas, cible - p.valeur));
  if (p.valeur < 0.001) p.valeur = 0;
  const fondu = p.valeur < 0.999;
  for (const m of p.materiaux) {
    m.material.opacity = m.opacity * p.valeur;
    const transparent = m.transparent || fondu;
    if (m.material.transparent !== transparent) {
      m.material.transparent = transparent;
      m.material.needsUpdate = true;
    }
    m.material.depthWrite = m.depthWrite && !fondu;
  }
  mesh.visible = p.valeur > 0;
  return mesh.visible;
}
