# Albumwerk – Screen-Register

Stitch-Projekt: `13186504385365145016`
Design-System: `assets/063894c0d3e444bead2f320db661b2eb`

Drei Projekte, je Desktop und Mobil. Jeder Screen trägt oben eine 24px hohe
Beschriftungsleiste mit `GRUPPE · GERÄT · SEITE`; daran ist auf der Leinwand
sofort erkennbar, wohin er gehört. Mehrere IDs zu einer Seite sind Varianten
zur Auswahl. Alle Mobil-Screens sind 390px-Spalten, die Screenshot-Leinwand von
Stitch ist immer 1280 breit.

Stitch führt zwei ID-Räume: Leinwand-IDs (`screenInstances` in `get_project`)
und Quell-IDs (`list_screens`). Für neu erzeugte Screens sind beide gleich.

## Website — `/data/albumwerk-website` (Astro)

### Desktop
| Seite | Quelle | Screen-IDs (mit Leiste) |
|---|---|---|
| Startseite | `src/pages/index.astro` | `08cdaa98de8d4a7f9e4e2d8d4cd96351` |
| Funktionen | `src/pages/funktionen.astro` | `1c95ad6fe0e04a039c39bba1d0254861` |
| Selbst hosten | `src/pages/selbst-hosten.astro` | `ae4b79e810084b888c3b9b0588834fe5` |
| Rechtstext-Vorlage | `datenschutz/agb/avv/impressum.astro` | `955789f023c34a5e80d3030c4bc75d88` |
| Seite nicht gefunden | `src/pages/404.astro` (deckt auch `albumwerk/src/pages/NoMatchPage.tsx`) | `12ddde8f046e438d88262683e8ecabb3` |

### Mobil
| Seite | Screen-IDs (mit Leiste) |
|---|---|
| Startseite | `8b018d19da3e4efeb44fd99537fb003c` |
| Funktionen | `898159b230e84cf6ab172e837ee68714`, `8552cf311f094fe295a4a57b8221773c` |

## Albumwerk-App — `/data/albumwerk` (React + Vite + PocketBase)

### Desktop

| Seite | Quelle | Screen-IDs (mit Leiste) |
|---|---|---|
| Aktionsseite | `src/pages/auth/ActionPage.tsx` | `3ced4c7f98104aa1af65d3a0b15de3f8` |
| Album Hinzufügen | `src/pages/user/AddShootingPage.tsx` | `7590eb6b76ac45e5a2be5a96098d3b4f` |
| Album Verwalten | `src/pages/admin/AdminAlbumPage.tsx` | `f1d851fdfa7f4d92b52560bfeb5d38f7` |
| Anmelden | `src/pages/auth/LoginPage.tsx` | `e758ad23783a4baca90b358f73e4e816` |
| Bestelldetails | `src/pages/user/OrderDetailsPage.tsx` | `487f52b27e08478996f6965c5592569b` |
| Bestellungen | `src/pages/user/OrdersPage.tsx` | `e3922376f5e7457499b8e3d04517fedf` |
| Bilder & Wasserzeichen | `src/pages/admin/BilderPage.tsx` | `35574f40881040febba3adb2e9352f1e` |
| Bilder Kaufen | `src/pages/user/PricingPage.tsx` | `f31a41d93b064f6aba1c393f66de94d1` |
| Branding | `src/pages/admin/BrandingPage.tsx` | `d586c875f2ec433ab82df2167cf3faa6` |
| Downloads | `src/pages/user/DownloadsPage.tsx` | `e7ab6f3fd98847f69e9d14967182a159` |
| E-Mail Bestätigen | `src/pages/auth/VerifyEmailPage.tsx` | `0f512a0a63794b308931181d5c0f0530` |
| Eigene Domain | `src/pages/admin/DomainPage.tsx` | `32322ee071994f8495f92e2c4e108e9f` |
| Einbetten | `src/pages/admin/EmbedPage.tsx` | `d9aab0ecd21a4294b1b7d9bde5eed4ac` |
| Einrichtung | `src/pages/admin/EinrichtungPage.tsx` | `650688d28fbe48ebbc31e57b9e98d027` |
| Hilfe-Artikel | `src/pages/help/HelpArticlePage.tsx` | `9b15790eb0d3485492b5795a46f09d93` |
| Hilfe-Verwaltung | `src/pages/admin/HelpAdminPage.tsx` | `9683fd4772b24971ae12776fbbd0da1a` |
| Hilfe-Übersicht | `src/pages/help/HelpPage.tsx` | `3be6d05271c94368a86b5825d3ef5135` |
| Kontakt & Geschäft | `src/pages/admin/KontaktPage.tsx` | `f5754df106bf4fed9036a2835f61f357` |
| Meine Alben | `src/pages/user/AlbumPage.tsx` | `ee30a55760d1497dbb917a80c5e3ce1c` |
| Nutzerverwaltung | `src/pages/admin/AdminUsersPage.tsx` | `c20229de0b454b7095a2860e26d7833d` |
| Passwort Vergessen | `src/pages/auth/ForgotPasswordPage.tsx` | `ff6f78b6974142f297f0c1535af49124` |
| Passwort Zurücksetzen | `src/pages/auth/ResetPasswordPage.tsx` | `d0edc7819f164520a509c78bad25ed4a` |
| Preise | `src/pages/admin/AdminPricingPage.tsx` | `6aa04992adc64081b525045dec736c6d` |
| Profil | `src/pages/user/ProfilePage.tsx` | `53b3a194cad34a97a58293fce705cf75` |
| Rechtstext | `src/pages/public/LegalPage.tsx` | `6368bfa689834b4bab713f3e36f7e5b3` |
| Rechtstexte verwalten | `src/pages/admin/AdminLegalPage.tsx` | `a4b1a286df0e44e98d6981ab1e2b810d` |
| Registrieren | `src/pages/auth/SignUpPage.tsx` | `4f29382d303345978434bc8d885634ca` + `c4a728687e444d37bda2fb8130e00a9b` |
| Support | `src/pages/user/SupportPage.tsx` | `2813500d237f42ebac0b2dc079f3f35e` |
| Support-Verwaltung | `src/pages/admin/AdminSupportPage.tsx` | `a2ee79c7d66f4326bfb3c13fc062144b` |
| Termin Buchen | `src/pages/public/BookingPage.tsx` | `8a711b5cefde4a6f832fdd4861f8e661` |
| Termin Verwalten | `src/pages/public/ManageAppointmentPage.tsx` | `e6345755bd694be99e9b9204903cc43d` |
| Terminarten | `src/pages/admin/AppointmentTypesPage.tsx` | `4a7986a1b49e4db5a0b6058a0a708c05` |
| Termine | `src/pages/admin/AppointmentsPage.tsx` | `c59f5575c9a2431c8fd40719c2cf85f4` |
| Verfügbarkeit | `src/pages/admin/AvailabilityPage.tsx` | `754ed816d9014af28dbd2d790d2e40a9` |
| Öffentliches Album | `src/pages/public/PublicAlbumPage.tsx` | `6d146b60b674412991921991803da8ab` |

### Mobil

| Seite | Screen-IDs (mit Leiste) |
|---|---|
| Aktionsseite | `e9cd66ee00054072a91963ea380ad164` |
| Album Hinzufügen | `d09823dcc308422c9f5f3a72e768ff41` |
| Album Verwalten | `278fb29998334a709710e1b55d56fd5c` |
| Anmelden | `d7b3034b8a6f4fcb882cca4c3f924ab4` |
| Bestelldetails | `55857ba1aa9f4f60a38b24ad0b693a4f` |
| Bestellungen | `b9becd2111994ba3a8c9fe58d1ab47e9` + `ecc79811223e438bb629a6951bf47215` |
| Bilder & Wasserzeichen | `ace48b0ecd4a48a19386e7d96be2be36` |
| Bilder Kaufen | `2586325b1b344372bd106c6f72c05003` |
| Branding | `2aff7110729545c99c6b2cf46ebe2440` |
| Downloads | `94dd4960753941c889504e2317a4f6c2` |
| E-Mail Bestätigen | `9ca5562b36724bb6805b008b08296239` |
| Eigene Domain | `27796d8865c347f596cc84e0ab378a47` |
| Einbetten | `ab6f234ff8a34c1d80023ee04b3bf6f3` |
| Einrichtung | `800d7a8b0ed34331825f9f3b7c1331a2` |
| Hilfe-Artikel | `5506d5551f6d421aaf49661b8e84d9a1` + `f082b120c92e4ed681dce8fa9e44639f` |
| Hilfe-Verwaltung | `f227a1f516b14c31be38f57b9b0d60dc` |
| Hilfe-Übersicht | `b019ca0b133d490e8297ae59f7e165ab` |
| Kontakt & Geschäft | `d1bb9f2dc3714687b7557197f95ece47` |
| Meine Alben | `f4c6bdcc27a147c29aca8a080e232edb` |
| Nutzerverwaltung | `d3c5b02cc3bc46a4b0e7dba6926fec09` |
| Passwort Vergessen | `41561bcf0bec44b09343c188d5f150bc` |
| Passwort Zurücksetzen | `eff453f48ae840b79323e6b2bda0234a` |
| Preise | `378329ec5f1640b993708741853dfd81` |
| Profil | `02186040652e47e3b26271809b6ed2b7` |
| Rechtstext | `dd9c76d26efe4926a04fa5d3373e145a` |
| Rechtstexte verwalten | `361b4036de5a402c8ece93e2fe2e8a6f` |
| Registrieren | `f0a5536f8f9c42e0bfd357118f8b27a8` |
| Support | `6e522e163ed141c6ba0b386f22a26204` |
| Support-Verwaltung | `e8cc325498e0483ca6a557c811a95fcd` |
| Termin Buchen | `d104c57455574ca09d8af7bbbe92f5ec` |
| Termin Verwalten | `7e5c71bde2784df3a51a7993a39ebbda` |
| Termine | `73c471ecc132456dab16d4234535cc5e` + `123cb6487ce7410ca92d9a92ae180b56` + `92baf5c9faac4b2e937f288576b3b955` |
| Verfügbarkeit | `05aa31181c2a44eab4bc7d4d7a60d2b4` |
| Öffentliches Album | `2682541daa764522a56b0c322e3ee8ae` |

## SAAS — `/data/albumwerk-saas/control/pb_public`

### Desktop
| Seite | Quelle | Screen-IDs (mit Leiste) |
|---|---|---|
| Zugang | `anmelden.html` | `722e537659cb47c7946fbd8cac914560`, `85ecac1c71504002b4b4861706744238` |
| Instanz anlegen | `weiter.html` | `07f9ac8608e94b6f8634a8f40c552373`, `9fd182f4cf184e9c9e1a991e1c6581b7` |
| Wird eingerichtet | `warten.html` | `8b4b90ca3e204f1ca4595dcad9ab683f`, `9f1884302e7e49048c62f8d2205e70a0` |
| Danke | `danke.html` | `a3a912cef9ce4964b9e0cb4f1f3c0b29` |
| Kündigen | `kuendigen.html` | `b3c9715659bd48299c7a6e36eb23613e`, `e6b343e5679b4c508697b59dd4359e1e` |
| Geschlossen | `geschlossen.html` | `dd501efa0b5c4e4b91625832fc61e4d7` |
| Betrieb | `ops.html` | `1bdecd12c08c46acb83de8b543af3325`, `4adbae2066f94f61840f00f978b43b18` |

### Mobil
| Seite | Screen-IDs (mit Leiste) |
|---|---|
| Wird eingerichtet | `23d24310875f4ac19d899dddfb1f9e28`, `1f6b85436c9c4fdc9b50578da2ddd649` |

## Kein Seitenentwurf
| Gegenstand | Screen-ID |
|---|---|
| DESIGN.md (Quell-Upload) | `15270280802837358120` |
| Illustration Dunkelkammer (SVG) | `7f8f3aae703f4b60857dedad63b93854` |

## Alter Bestand ohne Leiste (ersetzt, kann gelöscht werden)

Website Desktop: `6b44d129dd814d69b9261b8c5fbc4c58`, `d6306b20b69d48c79bd7fc08bc050bf5`,
`41c8d661669942dc9195e81a35487f9f`, `43a6fceb5c044a84bbcdf1fb06221d1d`,
`00f409d39c3c44419fd9b9e3ed0f2f19`, `7374072a6ed1439aa19040f29e2107c1`,
`aa75a93b73de459e8e93b789da7cbd77`, `3c7f536563cd43b0adc09d2518619ced`,
`bd5f3f659d04477d86b3efe858dae752`, `48c0cc5a71e84c13998e02220147c4a7`.
Website Mobil: `f8c95e2e668047d8907840ba49f40363`, `c35d5df0b1004b29800908efb8c1e8bd`.

App Desktop: `0a8b08b025f6459e9624a811ffbfb956`, `9bc292a6abaf427dbe96423a61656a07`,
`13405c5d81e2499dad9c19abc25aac6a`, `1cc43aa617124eceab483753f17c0332`,
`1c9632dfc19a49beb4b468e687ca810a`, `220d20ac3ea445d9bd7341f24b66d26d`,
`fe74690bb1694ac9b95d6e70c3f06e9f`, `b8550bb6f02e4e2d8c29cb548b9f952f`,
`4343715ca9144bb181b7f3f65b603d66`, `c453e5e6d8b84446973286b4c66b02d4`,
`5eda4ad1a8c94cb0b9d82c9f00c9bf55`, `30ec5d3359c04f549fa8f69da35cca47`,
`7c6e8cd865884838bc1853a19a266fdd`, `b607ada68cea40ee94f65987adcc4553`,
`58fc774ff2df4928980263b0048a8d1d`, `f6bee549b7f2492b818e8e3c1e728e87`,
`827bb842c29d472b9ed157d65e518898`, `9df3ebc5ac3b4f5d934eed6c7ef1d32d`,
`803e737f85d845a5affc0515bc2b9f9b`, `0baf46c2addf4604a32852c464e30755`,
`6ee7861353744e8d96768d555a0768ec`.
App Mobil: `67e068b7e0324ade957604f7f69d0684`, `d8ed6eccac104ef889368b6f7163fe9b`,
`bb0b31688e4d46deaf46ad1310996c88`, `e964ff0acc86474782d78354a5441b33`,
`704da969082546d19e803feac2df374d`, `7f7b366636b445faa01d99f58d79f345`,
`57f7f3d7c01a4edc82d9284b10dc9b0d`.

SAAS Desktop: `882cb20b682c43f885466575fcf2aa89`, `4709ec7ba7df4ef78c52683219e8b9e7`,
`a240a2d280294d259b3efa72b25f26ef`, `be95a5b723ec43b1ad1cfbbfa24dbace`.
SAAS Mobil: `5473220b365840d2b5081d52cc96c829`.

Geister ohne Screenshot: `8345a597e34845a893ec0683f3bab317`,
`01f4aef3a6454f34bd370806c1018aca`, `316a4b5e93444c8dbac2b5a0751b7262`.
Fremdes Design-System auf der Leinwand: `assets/5765793061672718186`.

## Offen (Stand 2026-09-17)

Fehlende Entwürfe:

| Gruppe | Seite | Quelle |
|---|---|---|
| Albumwerk-App | Zahlungen | `src/pages/admin/AdminPaymentsPage.tsx` |
| Albumwerk-App | Öffentliche Downloads | `src/pages/public/PublicDownloadsPage.tsx` |
| Albumwerk-App | Terminarten (nur Mobil) | `src/pages/admin/AppointmentTypesPage.tsx` |
| Website | Selbst hosten, Rechtstext, Seite nicht gefunden (nur Mobil) | `src/pages/` |
| SAAS | Zugang, Instanz anlegen, Danke, Kündigen, Geschlossen, Betrieb (nur Mobil) | `control/pb_public/` |

Prompts für neue Läufe stehen in `STITCH-PROMPTS.md`.
