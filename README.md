# Střihnuto.cz

Český statický prezentační web spolku Střihnuto, z. s. Schválená vizuální identita, originální logo a ikony z dodaného STRIHNUTO-web.zip. Bez produkčních závislostí, externích fontů, analytiky, reklamy, databáze a backendu. Verze v0.4.

## Spuštění

Node.js 22+ pro testy a build, Python 3 pro lokální server. `npm install` není potřeba.

```sh
npm run dev
```

Příkaz nejprve sestaví web a poté podává pouze veřejný obsah `dist/` na portu 8080. Po změně zdrojů spusťte `npm run build` a obnovte prohlížeč. Server je určen pouze pro lokální vývoj.

## Testy a build

```sh
npm test
npm run build
```

Devět testů kontroluje doslovné znění a pořadí schválených textů, odstranění starých sloganů, navigaci, lokální podklady, rozhraní formuláře, budoucí vykreslování příběhů a veřejný výstup buildu. Schválená předloha se změnami v0.3 je v `tests/fixtures/approved-copy.json`; neměňte ji jen proto, aby test zakryl odchylku od zadání.

Build vytváří `dist/` pouze s `index.html`, `styles.css` a `assets/`. Soukromé pracovní podklady, testy ani zdrojová data příběhů se do výstupu nekopírují. Žádný JavaScript neběží v prohlížeči; renderer příběhů se používá jen při sestavení.

## Kontaktní formulář — skutečný stav

Formulář je připravené rozhraní, **odesílání není zapojené**. V původní verzi žádné odesílání neexistovalo. Povinná pole: jméno, telefon, obec, typ poptávky a popis požadavku. E-mail je nepovinný, vlastní e-mail tedy není podmínkou budoucího použití.

Návštěvník vidí upozornění na nefunkční odesílání a vypnuté odesílací tlačítko. Formulář používá `method="dialog"` mimo dialog: nedělá síťový požadavek ani při implicitním odeslání klávesou Enter, bez JavaScriptu či při programovém `requestSubmit()`. Údaje neukládáme, nepřenášíme do URL ani neodesíláme. Nezobrazuje se potvrzení doručení. Není to rezervační systém.

Budoucí zprovoznění vyžaduje samostatné rozhodnutí o doručování, ochraně proti spamu a zpracování osobních údajů. Teprve pak změňte způsob odeslání, zapojte endpoint, povolte tlačítko a otestujte skutečné doručení i chyby. V této verzi se nezavádí externí poskytovatel ani placená služba.

Skutečný kontaktní e-mail není dodán; v kontaktu i patičce je označen TODO bez falešného odkazu. Informace o ochraně osobních údajů je také potřeba doplnit podle skutečného provozu; zatím nemá neexistující odkaz.

## Příběhy klientů — připravené, nezveřejněné

Soubor `data/client-stories.json` má `enabled: false` a prázdné pole `stories`. Obsahuje přesný schválený nadpis a oba úvodní odstavce. `scripts/client-stories.mjs` připravuje sekci i navigační odkaz pouze při buildu. Ve vypnutém stavu není ve veřejném HTML ani navigaci nic z této sekce, žádné prázdné karty či skryté profily. Data samotná se do `dist/` nikdy nekopírují.

Budoucí zapnutí:

1. Získejte skutečné anonymizované příběhy a souhlasy klientů se zveřejněním.
2. Do `stories` přidejte záznamy s následujícími poli. Zapisujte jen schválené údaje určené ke zveřejnění, bez jmen či citlivých pracovních poznámek.
3. Nastavte `enabled` na `true` a spusťte `npm test` a `npm run build`. Sekce se objeví mezi Lucií a oblastí působení, automaticky přibude i položka navigace.
4. Zkontrolujte hotový obsah v `dist/`. Vypnutí se provádí vrácením `enabled` na `false` a novým buildem.

| Pole záznamu | Typ a význam |
| --- | --- |
| `clientLabel` | Neprázdný text: anonymizované označení klienta |
| `approximateAge` | Neprázdný text: přibližný věk |
| `area` | Neprázdný text: přibližná oblast |
| `situation` | Neprázdný text: skutečná životní situace |
| `service` | Neprázdný text: skutečně poskytnutá služba |
| `review` | Neprázdný text: autentické hodnocení klienta |
| `consentConfirmed` | `true` až po potvrzení souhlasu; příznak nenahrazuje evidenci souhlasu |

Zapnutí bez příběhu, bez některého pole nebo bez potvrzení souhlasu způsobí chybu buildu. Texty se při vykreslení escapují, nevkládejte HTML. Nejsou připravené žádné fiktivní klientské příklady. Testovací sentinel `<TEST>` slouží jen k ověření escapování a není součástí veřejného výstupu.

## Fotografie Lucie (v0.4)

V sekci `#lucie` je skutečná fotografie Lucie Tesařové z dodaného `lucka.png.zip`. Bez retuší, AI úprav nebo změn barev a pozadí. Originál má 1199 × 1312 px; export má mírný symetrický boční ořez na poměr 4:5, bez ořezu hlavy. Převod pomocí Pillow: Lanczos, WebP quality 86, method 6. Pillow není závislostí projektu ani buildu.

- `assets/lucie-tesarova-420.webp`: 420 × 525 px, 27 154 B (26,5 KiB).
- `assets/lucie-tesarova-840.webp`: 840 × 1050 px, 87 612 B (85,6 KiB).

Responzivní `srcset` a `sizes`, explicitní rozměry, lazy loading a asynchronní dekódování. Použita již připravená třída `.lucie-photo`; CSS se nemění. Originál není kopírován do veřejného výstupu.

## Hosting

Podle zadání již web běží na Cloudflare Workers. Tato aktualizace nemění hosting, konfiguraci Cloudflare ani DNS a neprovádí deployment. Zachovejte současné nastavení hostingu.

Projekt je zároveň běžný statický web: **framework None (HTML/CSS)**, **build command `npm run build`**, **output directory `dist`**. Tyto hodnoty lze použít také pro Cloudflare Pages, pokud by v budoucnu bylo samostatně rozhodnuto o jeho použití.

## Změny v0.2

- Schválené texty úvodu, důvodu vzniku, příjemců péče, fungování spolku, služeb, zvýhodnění, Lucie, oblasti a kontaktu vložené doslovně; staré marketingové formulace odstraněny i z metadat.
- Doplněna skupina pečujících osob, více než 25 let praxe a plný popis individuálního posouzení i kapacit.
- Původní logo, paleta a typografie zachovány. Drobné úpravy rozložení pro delší texty, tři skupiny klientů a formulář.
- Připravené neveřejné příběhy a budoucí skutečná fotografie Lucie.
- Patička s názvem, IČO, okresem a nenápadným textovým podpisem `made by ISB7` bez odkazu.
- Formulář bez předstírání odesílání; kontakt a právní dokumenty zůstávají k doplnění.

## Ověření v0.2

- `npm test`: sedm úspěšných testů; `npm run build`: úspěch.
- Chromium / Playwright: 375×812, 390×844, 768×1024 a 1440×1000; obrázky, navigace, přeskočení na obsah klávesnicí a žádné vodorovné přetečení či externí požadavky.
- Ověřeno vyplnění povinných polí bez e-mailu, vypnuté odeslání, Enter a `requestSubmit()` bez přenosu údajů, absence příběhů a nedostupnost dat příběhů z veřejného serveru.
- Kontrola vypočtených kontrastů textů v Chromiu bez zjištěných selhání. Nejde o úplný audit přístupnosti ani test na fyzickém iPhonu či v Safari.

## Změny v0.3

- Úvodní nadpis a oba odstavce nahrazené přesným nově schváleným zněním.
- Sekce „Jak fungujeme?“ má tři nové schválené odstavce o neziskovém poslání a financování.
- Celé jméno Lucie Tesařová doplněné ve dvou určených odstavcích.
- Název sjednocený na Střihnuto, oficiální textové označení Střihnuto, z. s., včetně metadat, popisků a patičky. Originální logo, soubory a technické názvy jsou beze změny.
- Pouze identifikační adresa v patičce změněna na Blahoslavova 430, Moravské Budějovice; působnost nadále celý okres Třebíč.
- Ostatní schválené texty, vzhled, formulář a vypnuté příběhy zachovány. Bez nových závislostí, zásahů do hostingu či DNS.
- Aktualizovaná testovací předloha a kontroly názvu, adresy, odstavců a vypnutých příběhů. `npm test` a `npm run build` jsou povinné kontroly této verze.

### Ověření v0.3

- `npm test`: všech devět testů prošlo; `npm run build`: úspěch.
- Porovnáním s výchozím main ověřena přesná shoda formuláře, CSS, grafických podkladů, build skriptů a vypnutých dat příběhů.

## Změny v0.4

Grafický symbol v sekci Lucie nahrazen originální fotografií ve dvou optimalizovaných velikostech WebP. Schválené texty, ostatní sekce, CSS, formulář a vypnuté příběhy zůstaly beze změny. Bez nových závislostí nebo zásahů do hostingu a DNS.

### Ověření v0.4

`npm test`: 9 úspěšných testů. `npm run build`: úspěch. Chromium / Playwright: 375 px a 768 px při DPR 2, 1440 px při DPR 1; načtení fotografie, výběr srcset, zachovaný poměr stran a žádné vodorovné přetečení. Ořez vizuálně ověřen na mobilu i počítači, hlava a obličej zůstávají celé. Jde o emulaci v Chromiu, nikoliv fyzická zařízení.
