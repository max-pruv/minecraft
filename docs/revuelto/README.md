# Lamborghini Revuelto — work in progress

This package contains only the Lamborghini shown in the latest previews.
The GLB is 3.37 MB and embeds all seven original textures.

## Open

Import `Lamborghini_Revuelto_WIP.glb` into a compatible 3D application, or unzip
this package, run `python3 -m http.server 8000` in its folder, and open
http://localhost:8000 in a WebGL-capable browser. No external assets are fetched.
Use `previews/` for the actual model's front, rear and cabin renders.

## Status

A working adaptation of BRO's CC-BY-4.0 model, not a finished high-fidelity car.
The original textures are restored; wheel and steering pivots are independent;
brake calipers stay fixed while wheels roll. The repository GLTFLoader loads
all seven textures and 91,244 triangles. Wheel motion was checked in Node.
The PNGs are offline Mesa/EGL renders, not screenshots from the game.

Still unresolved: panel seams, cabin detail and proportions. With wheelbase
set to 2.779 m, overall length remains 4.739 m against the manufacturer's
4.947 m. Doors are not animated. Not approved for production or deployed.

## Attribution

See `ATTRIBUTION.txt` for the author, source URL, CC-BY-4.0 license and changes.
The bundled Three.js viewer code is covered by `THREE-LICENSE.txt`.
