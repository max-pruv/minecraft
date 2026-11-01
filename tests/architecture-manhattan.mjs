// Contrats du tissu urbain issu du modèle fourni. Exécution sans navigateur :
// node --test tests/architecture-manhattan.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BATIMENTS, BORNES, SOL, sommet, emprise, surface, circuitsManhattan } from '../src/manhattan-plan.js';
import { PROFILS_OSM } from '../src/manhattan-osm-data.js';
import { hauteurJouable } from '../src/manhattan-architecture.js';

const immeubles = BATIMENTS.filter(b => b.osm);

test('la source fournie est traçable et l’atlas embarqué reste sous 200 Ko', () => {
  const rapport = JSON.parse(readFileSync(new URL('../docs/manhattan-osm-extraction.json', import.meta.url)));
  assert.equal(rapport.sha256Bin, '3e9e751552a2e44d5f596e4075abab56e3391c03f902cfac9dcefa4e7822de85');
  assert.equal(rapport.profils, PROFILS_OSM.length);
  assert.ok(PROFILS_OSM.length > 800);
  assert.ok(readFileSync(new URL('../src/manhattan-osm-data.js', import.meta.url)).length < 200_000);
  for (const p of PROFILS_OSM) {
    assert.match(p[7], /^[0-9a-z]{144}$/);
    assert.ok(p[4] >= 6 && p[5] >= 6 && p[6] >= 6);
  }
});

test('les quartiers utilisent leurs profils, avec deux pôles de tours et un Village plus bas', () => {
  const mediane = quartier => {
    const hs = immeubles.filter(b => b.osm.quartier === quartier).map(b => b.osm.hauteur).sort((a, b) => a - b);
    assert.ok(hs.length > 15, quartier);
    return hs[Math.floor(hs.length / 2)];
  };
  assert.ok(mediane('midtown') > mediane('village') * 1.4);
  assert.ok(mediane('financial') > mediane('harlem') * 2);
  const composants = new Set(PROFILS_OSM.map(p => p[1]));
  for (const b of immeubles) assert.ok(composants.has(b.osm.composante));
});

test('la ville dépasse les deux styles et les parcelles de neuf mètres du générateur précédent', () => {
  assert.ok(immeubles.length > 1200);
  assert.ok(new Set(immeubles.map(b => b.architecture)).size >= 8);
  assert.ok(immeubles.filter(b => b.x1 - b.x0 >= 20).length > 30);
  assert.ok(immeubles.filter(b => b.h <= 12).length > 100);
  assert.ok(immeubles.filter(b => b.h >= 60).length > 10);
  assert.ok(immeubles.filter(b => new Set(b.colonnes).size > 2).length > 300);
});

test('les tours tiennent sous le plafond, les étages restent habitables et les hauteurs sont monotones', () => {
  let avant = 0;
  for (let metres = 1; metres <= 600; metres++) {
    const h = hauteurJouable(metres);
    assert.ok(h >= avant);
    assert.equal(h % 3, 0);
    avant = h;
  }
  for (const b of immeubles) {
    assert.ok(SOL + 1 + b.h + 5 < 160);
    for (const h of b.colonnes) assert.ok(h === 0 || h >= 3 && h % 3 === 0);
  }
});

test('chaque colonne du lointain correspond au toit de collision, sans remplir les cours', () => {
  let vides = 0;
  for (const b of immeubles) {
    for (let z = b.z0; z < b.z1; z++) for (let x = b.x0; x < b.x1; x++) {
      const volumes = b.volumes.filter(v => x >= v.x && x < v.x + v.w && z >= v.z && z < v.z + v.d);
      const h = sommet(b, x, z);
      assert.equal(volumes.length, h ? 1 : 0, `chevauchement ${b.id} ${x},${z}`);
      assert.equal(volumes[0]?.h || 0, h);
      assert.equal(emprise(b, x, z), h > 0);
      if (!h) vides++;
    }
  }
  assert.ok(vides > 1000, 'les véritables vides du modèle doivent subsister');
});

test('aucun nouveau mur ne coupe une rue, une place ou l’eau', () => {
  for (const b of immeubles)
    for (let z = b.z0; z < b.z1; z++) for (let x = b.x0; x < b.x1; x++) {
      if (!sommet(b, x, z)) continue;
      assert.ok(!['road', 'water', 'plaza'].includes(surface(x + .5, z + .5)), `${b.id} ${x},${z}`);
    }
  const circuits = circuitsManhattan();
  const ile = circuits.filter(c => c.pts.every(p => p.x >= BORNES.x0 && p.x < BORNES.x1 && p.z >= BORNES.z0 && p.z < BORNES.z1));
  assert.equal(ile.length, 79, 'les 79 circuits historiques restent praticables');
  assert.equal(circuits.length - ile.length, 48, 'les circuits des banlieues de la PR 587 subsistent');
});

test('les deux modules de données suivent le jeu hors ligne', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const nom of ['manhattan-osm-data.js', 'manhattan-architecture.js']) assert.ok(sw.includes(`'./src/${nom}'`));
});
