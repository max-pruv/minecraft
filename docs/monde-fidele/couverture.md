# La matrice de couverture, ville par ville

Engendrée par `node tests/sonde-couverture.cjs` — tout se lit dans le code
(trame, anneaux, routes, ciel des monuments, climat). On la refait à chaque
livraison qui change une colonne ; on ne la corrige pas à la main.

**276 villes.** Rues à la règle du kit : 264 convertie, 8 exclue, 4 bloquée.
Sans aucun anneau de circulation : 7. Reliées par une route
interurbaine : 33. Monuments à la hauteur de leur ville (ciel
propre, hors Paris) : 25. Climat de la campagne autour :
tempéré 254, taiga 3, desert 10, steppe 7, toundra 2.

| Ville | Bâtie | Tissu | Rues au kit | Circulation | Routes | Ciel des monuments | Campagne autour |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Paris | à la main | — | convertie (v303, v306) | 8 circuits | A1 | oui (v335) | tempéré |
| New York | à la main | — | exclue (plan de Manhattan) | circuits du plan | — | — | tempéré |
| San Francisco | à la main | — | bloquée (passe à part, dette v307) | circuits mesurés | — | — | tempéré |
| Nice | à la main | — | bloquée (passe à part, dette v307) | circuits mesurés | — | — | tempéré |
| Lille | à la main | — | bloquée (passe à part, dette v307) | circuits mesurés | A1, E429 | — | tempéré |
| Washington | à la main | — | bloquée (passe à part, dette v307) | circuits mesurés | — | — | tempéré |
| Londres | à la main | — | convertie (v339) | circuits mesurés | — | — | tempéré |
| Rome | engendrée | perimetre | convertie (v307) | 5 anneau(x) | A1 Sud | oui (v342) | tempéré |
| Barcelone | engendrée | eixample | convertie (v307) | 4 anneau(x) | AP-2 | — | tempéré |
| Pise | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | oui (v342) | tempéré |
| Gizeh | engendrée | — | exclue (sans trame : un site, pas une ville) | 0 anneau(x) | — | — | tempéré, desert |
| Agra | engendrée | faubourg | convertie (v307) | 4 anneau(x) | Yamuna | oui (v342) | tempéré |
| Sydney | engendrée | organique | convertie (v307) | 7 anneau(x) | — | — | tempéré |
| Rio de Janeiro | engendrée | damier | convertie (v307) | 4 anneau(x) | BR-116 | — | tempéré |
| Seattle | engendrée | superilot | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Madrid | engendrée | arcades | convertie (v307) | 4 anneau(x) | A-4, AP-2 | oui (v342) | tempéré |
| Lisbonne | engendrée | perimetre | convertie (v307) | 2 anneau(x) | — | oui (v342) | tempéré |
| Amsterdam | engendrée | perimetre | convertie (v307) | 3 anneau(x) | E19 | oui (v342) | tempéré |
| Bruxelles | engendrée | faubourg | convertie (v307) | 2 anneau(x) | E429, E19 | — | tempéré |
| Berlin | engendrée | perimetre | convertie (v307) | 4 anneau(x) | A24 | oui (v342) | tempéré |
| Munich | engendrée | perimetre | convertie (v307) | 3 anneau(x) | — | — | tempéré |
| Vienne | engendrée | perimetre | convertie (v307) | 3 anneau(x) | M1 | oui (v342) | tempéré |
| Prague | engendrée | perimetre | convertie (v307) | 3 anneau(x) | — | oui (v342) | tempéré |
| Venise | engendrée | medina | exclue (médina : ruelles) | 0 anneau(x) | — | — | tempéré |
| Florence | engendrée | perimetre | convertie (v307) | 2 anneau(x) | Autosole | oui (v342) | tempéré |
| Athènes | engendrée | perimetre | convertie (v307) | 3 anneau(x) | — | oui (v342) | tempéré |
| Istanbul | engendrée | perimetre | convertie (v307) | 4 anneau(x) | — | oui (v342) | tempéré |
| Moscou | engendrée | perimetre | convertie (v307) | 4 anneau(x) | — | oui (v342) | tempéré |
| Saint-Pétersbourg | engendrée | perimetre | convertie (v307) | 3 anneau(x) | — | oui (v342) | taiga |
| Stockholm | engendrée | perimetre | convertie (v307) | 2 anneau(x) | — | oui (v342) | tempéré |
| Copenhague | engendrée | perimetre | convertie (v307) | 2 anneau(x) | — | oui (v342) | tempéré |
| Tokyo | engendrée | superilot | convertie (v307) | 4 anneau(x) | — | — | tempéré |
| Kyoto | engendrée | organique | convertie (v307) | 4 anneau(x) | E1 | — | tempéré |
| Séoul | engendrée | superilot | convertie (v307) | 3 anneau(x) | — | — | tempéré |
| Shanghai | engendrée | superilot | convertie (v307) | 3 anneau(x) | — | — | tempéré |
| Hong Kong | engendrée | superilot | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Singapour | engendrée | superilot | convertie (v307) | 2 anneau(x) | — | oui (v342) | tempéré |
| Bangkok | engendrée | superilot | convertie (v307) | 3 anneau(x) | — | oui (v342) | tempéré |
| Dubaï | engendrée | superilot | convertie (v307) | 2 anneau(x) | — | — | desert |
| Jérusalem | engendrée | medina | exclue (médina : ruelles) | 0 anneau(x) | — | oui (v342) | tempéré |
| Mumbai | engendrée | organique | convertie (v307) | 1 anneau(x) | — | oui (v342) | tempéré |
| Delhi | engendrée | faubourg | convertie (v307) | 4 anneau(x) | Yamuna | oui (v342) | tempéré |
| Los Angeles | engendrée | superilot | convertie (v307) | 4 anneau(x) | — | oui (v342) | tempéré |
| Chicago | engendrée | superilot | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Las Vegas | engendrée | superilot | convertie (v307) | 2 anneau(x) | — | — | desert |
| Miami | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Toronto | engendrée | superilot | convertie (v307) | 2 anneau(x) | — | oui (v342) | tempéré |
| Mexico | engendrée | damier | convertie (v307) | 4 anneau(x) | — | oui (v342) | tempéré |
| La Havane | engendrée | damier | convertie (v307) | 3 anneau(x) | — | — | tempéré |
| Buenos Aires | engendrée | damier | convertie (v307) | 4 anneau(x) | — | oui (v342) | tempéré |
| Machu Picchu | engendrée | — | exclue (sans trame : un site, pas une ville) | 0 anneau(x) | — | — | tempéré |
| Marrakech | engendrée | medina | exclue (médina : ruelles) | 0 anneau(x) | — | — | tempéré |
| Le Cap | engendrée | perimetre | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Lyon | engendrée | perimetre | convertie (v307) | 2 anneau(x) | A7 | — | tempéré |
| Marseille | engendrée | perimetre | convertie (v307) | 2 anneau(x) | A7 | — | tempéré |
| Bordeaux | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Toulouse | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Nantes | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Strasbourg | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Montpellier | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Rennes | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Manchester | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Liverpool | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Birmingham | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Leeds | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Newcastle | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Glasgow | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Édimbourg | engendrée | organique | convertie (v307) | 4 anneau(x) | — | — | tempéré |
| Dublin | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Belfast | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Cardiff | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Séville | engendrée | faubourg | convertie (v307) | 2 anneau(x) | A-4 | — | tempéré |
| Valence | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Bilbao | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Malaga | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Grenade | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Saragosse | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Porto | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Milan | engendrée | perimetre | convertie (v307) | 2 anneau(x) | A4, A1 Nord | — | tempéré |
| Turin | engendrée | arcades | convertie (v307) | 2 anneau(x) | A4 | — | tempéré |
| Gênes | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Bologne | engendrée | arcades | convertie (v307) | 1 anneau(x) | Autosole, A1 Nord | — | tempéré |
| Naples | engendrée | perimetre | convertie (v307) | 2 anneau(x) | A1 Sud | — | tempéré |
| Palerme | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Catane | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Bari | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Vérone | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| La Valette | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Hambourg | engendrée | faubourg | convertie (v307) | 2 anneau(x) | A24 | — | tempéré |
| Cologne | engendrée | faubourg | convertie (v307) | 2 anneau(x) | A3 | — | tempéré |
| Francfort | engendrée | faubourg | convertie (v307) | 2 anneau(x) | A3 | — | tempéré |
| Stuttgart | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Dresde | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Leipzig | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Zurich | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Genève | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Bâle | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Innsbruck | engendrée | arcades | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Salzbourg | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Varsovie | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Cracovie | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Gdansk | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Budapest | engendrée | perimetre | convertie (v307) | 2 anneau(x) | M1 | — | tempéré |
| Bucarest | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Sofia | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Belgrade | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Zagreb | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Dubrovnik | engendrée | organique | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Sarajevo | engendrée | organique | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Ljubljana | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Tirana | engendrée | organique | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Thessalonique | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Kyiv | engendrée | perimetre | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Odessa | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | steppe, tempéré |
| Minsk | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Riga | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Vilnius | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Tallinn | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Oslo | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Bergen | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Göteborg | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Helsinki | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Reykjavik | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | toundra |
| Aarhus | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Kazan | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Novossibirsk | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Iekaterinbourg | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | taiga |
| Vladivostok | engendrée | organique | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Tbilissi | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Erevan | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Bakou | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Ankara | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Izmir | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Beyrouth | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Riyad | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | desert |
| La Mecque | engendrée | organique | convertie (v307) | 4 anneau(x) | — | — | desert, tempéré |
| Doha | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | desert |
| Abou Dabi | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | desert |
| Mascate | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Koweït | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Bagdad | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Téhéran | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | steppe, desert |
| Ispahan | engendrée | organique | convertie (v307) | 4 anneau(x) | — | — | desert |
| Samarcande | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Tachkent | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Kaboul | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | steppe, tempéré |
| Islamabad | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Karachi | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Lahore | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Katmandou | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Dacca | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Colombo | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Bangalore | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Chennai | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Calcutta | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Hyderabad | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Jaipur | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Varanasi | engendrée | organique | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Canton | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Chengdu | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Xi'an | engendrée | organique | convertie (v307) | 4 anneau(x) | — | — | tempéré |
| Hangzhou | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Nankin | engendrée | organique | convertie (v307) | 4 anneau(x) | — | — | tempéré |
| Wuhan | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Harbin | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Lhassa | engendrée | organique | convertie (v307) | 2 anneau(x) | — | — | toundra |
| Oulan-Bator | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | steppe |
| Taipei | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Busan | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Nagoya | engendrée | superilot | convertie (v307) | 1 anneau(x) | E1 | — | tempéré |
| Sapporo | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Hiroshima | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Pyongyang | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Hanoï | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Hô Chi Minh-Ville | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Phnom Penh | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Vientiane | engendrée | organique | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Rangoun | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Kuala Lumpur | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Jakarta | engendrée | organique | convertie (v307) | 4 anneau(x) | — | — | tempéré |
| Denpasar | engendrée | organique | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Manille | engendrée | organique | convertie (v307) | 4 anneau(x) | — | — | tempéré |
| Cebu | engendrée | organique | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Melbourne | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Brisbane | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Perth | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Adélaïde | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Canberra | engendrée | organique | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Auckland | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Wellington | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Suva | engendrée | organique | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Papeete | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Nouméa | engendrée | organique | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Alexandrie | engendrée | organique | convertie (v307) | 4 anneau(x) | — | — | tempéré |
| Tunis | engendrée | organique | convertie (v307) | 4 anneau(x) | — | — | tempéré |
| Alger | engendrée | organique | convertie (v307) | 4 anneau(x) | — | — | tempéré |
| Casablanca | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Fès | engendrée | medina | exclue (médina : ruelles) | 0 anneau(x) | — | — | tempéré |
| Dakar | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Abidjan | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Accra | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Lagos | engendrée | perimetre | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Abuja | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Bamako | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré, steppe |
| Tombouctou | engendrée | medina | exclue (médina : ruelles) | 0 anneau(x) | — | — | desert |
| Kinshasa | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Lomé | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Douala | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Luanda | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Addis-Abeba | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Khartoum | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | desert |
| Nairobi | engendrée | faubourg | convertie (v307) | 2 anneau(x) | A109 | — | tempéré |
| Mombasa | engendrée | faubourg | convertie (v307) | 1 anneau(x) | A109 | — | tempéré |
| Kampala | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Kigali | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Dar es Salam | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Zanzibar | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Lusaka | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Harare | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Antananarivo | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Maputo | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Johannesburg | engendrée | faubourg | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Pretoria | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Durban | engendrée | faubourg | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Boston | engendrée | organique | convertie (v307) | 4 anneau(x) | — | — | tempéré |
| Atlanta | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Houston | engendrée | superilot | convertie (v307) | 1 anneau(x) | I-45 | — | tempéré |
| Dallas | engendrée | superilot | convertie (v307) | 1 anneau(x) | I-45 | — | tempéré |
| La Nouvelle-Orléans | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Denver | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | steppe |
| Phoenix | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | desert |
| San Diego | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Portland | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Salt Lake City | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | steppe |
| Minneapolis | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Détroit | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Nashville | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Orlando | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Anchorage | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | taiga |
| Honolulu | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Vancouver | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Montréal | engendrée | superilot | convertie (v307) | 1 anneau(x) | A20 | — | tempéré |
| Québec | engendrée | organique | convertie (v307) | 4 anneau(x) | A20 | — | tempéré |
| Ottawa | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Calgary | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Guadalajara | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Monterrey | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | steppe, tempéré |
| Cancún | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Guatemala | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| San José | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Panama | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Kingston | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Saint-Domingue | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| San Juan | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Bogota | engendrée | damier | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Medellín | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Carthagène | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Caracas | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Quito | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Guayaquil | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Lima | engendrée | damier | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Cuzco | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| La Paz | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Santiago | engendrée | damier | convertie (v307) | 2 anneau(x) | — | — | tempéré |
| Valparaíso | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Montevideo | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Córdoba | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Mendoza | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Ushuaïa | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| São Paulo | engendrée | superilot | convertie (v307) | 2 anneau(x) | BR-116 | — | tempéré |
| Brasília | engendrée | superilot | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Salvador | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Recife | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Fortaleza | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Manaus | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |
| Porto Alegre | engendrée | damier | convertie (v307) | 1 anneau(x) | — | — | tempéré |

