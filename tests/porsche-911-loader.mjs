// Résout le même « three » que l'importmap du jeu, sans npm ni copie tierce.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return { url: new URL('../vendor/three.module.min.js', import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
}
