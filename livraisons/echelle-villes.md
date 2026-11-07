---
titre: Paris à la bonne taille
puces:
  - Les immeubles de Paris sont plus hauts
  - Les vitrines dépassent les passants
  - Les portes cochères font trois mètres
  - Tes constructions sur les toits ont suivi
---
## vNEXT — Paris à l'échelle d'un passant

**Pourquoi.** Max, trois captures d'iPhone à pied dans une rue de Paris : un
adulte arrive presque en haut du rez-de-chaussée, les stores sont juste
au-dessus des têtes, une vitrine fait la hauteur d'un passant. Mesuré AVANT
d'écrire une ligne (`docs/echelle-villes.md`) : les personnages (1,48 à
1,76 m), l'œil (1,63), les voitures et le mobilier étaient à l'échelle ; le
BÂTI ne l'était pas. Le bâtisseur écrit son premier rang au ras du trottoir,
donc enterré : le rez-de-chaussée « de trois blocs » n'en montrait que deux,
le vitrage s'arrêtait à 1,35 m, l'enseigne à 1,4 m, la porte cochère montrait
84 cm de bois, et la corniche d'un immeuble de six niveaux était à 17 m.

**Ce que ça change.** Dans Paris, un socle de pierre au ras du trottoir, un
rez-de-chaussée de quatre mètres (trois de vitrage, un bandeau d'enseigne),
une porte cochère de trois mètres, un entresol de trois mètres, la corniche
à vingt — la règle de 1859. Les passants passent sous les enseignes, les
chaises de terrasse arrivent à mi-vitrine. Ce qu'un enfant a bâti sur un toit
ou contre une façade de Paris monte de trois blocs avec l'immeuble, d'un seul
tenant, et une copie d'avant est prise sur le nuage ; une colonne où il avait
bâti avant les rues à la GTA garde sa ville figée telle quelle. Le relief ne
bouge pas d'un bloc. Une préversion Vercel de la PR ne migre rien et n'écrit
rien au nuage : on peut l'essayer avec un prénom de test sans toucher aux
profils des enfants. Les autres villes (Rome, Tokyo, Nice, Lille, Londres,
Washington, San Francisco) sont mesurées et déclarées dans `TASKS.md` : leur
rez-de-chaussée montre un ou deux mètres, elles suivront la même table.

**Ce qui le prouve.** Treize témoins neufs ou repointés. `plafond.js` : la
colonne du monde lit la table d'échelle (socle, vitrage, enseigne, corniche),
la marche 8 → 9 monte une cabane de toit de trois blocs et laisse intacts une
façade, la rue, un bloc d'après la date, un bloc hors de Paris, une marque de
Manhattan, une archive, une colonne cédée et une colonne figée, deux fois de
suite (idempotente), positions et garages compris, par la chaîne entière ; la
fiche d'un garage suit ses murs ; sur une adresse de préversion la marche est
l'identité et la copie ne part pas. `sauvegarde.js` : la copie d'avant
(`~avant-echelle-paris`) existe sur le nuage et la cabane reçue du nuage monte.
`parishd.js` : la colonne type et la couche HD lues contre `REEL` (enseigne
3,14–3,56, store 3,14, porte 2,84, corniche 20). `carte.js` : le registre
des bandes. L'empreinte des 490 morceaux est identique des deux côtés,
bâtisseur désarmé (`ed369fdb…`) ; celle du journal fabriqué de quarante
mille (v403), dont trois sites sont dans Paris, se relève (0332dd4c…) et rend
la constante d'avant au bit près, bâtisseur désarmé. Coût mesuré : façades HD de Paris +9 %
(45,8 Mo pour 49 morceaux), sous le budget. Les témoins neufs sont rouges sur
`origin/main` (la table n'existe pas) et verts ici. Captures avant/après dans
`docs/echelle-villes/` — dont un passant de 1,76 m contre la vitrine, avant (vitrage 2 m, porte 1 m) et après (vitrage 3 m, porte 3 m), mesuré dans le monde rendu.

