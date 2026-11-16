# Střihnuto v1.0 – finální obsahová verze

Český statický prezentační web spolku Střihnuto, z. s. Schválená vizuální identita, originální logo a ikony z dodaného STRIHNUTO-web.zip. Bez produkčních balíčkových závislostí, externích fontů, analytiky, reklamy a databáze klientů. Verze v1.0 zachovává Worker pro kontaktní formulář a Cloudflare Turnstile.

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

Dvacet čtyři testů kontroluje doslovné znění a pořadí schválených textů, odstranění starých sloganů, navigaci, lokální podklady, rozhraní formuláře, budoucí vykreslování příběhů a veřejný výstup buildu. Schválená předloha se změnami v0.3 je v `tests/fixtures/approved-copy.json`; neměňte ji jen proto, aby test zakryl odchylku od zadání.

Build vytváří `dist/` pouze s `index.html`, `styles.css`, `contact.js` a `assets/`. Soukromé pracovní podklady, testy ani zdrojová data příběhů se do výstupu nekopírují. `contact.js` a Cloudflare Turnstile běží v prohlížeči; renderer příběhů se používá jen při sestavení. Worker se sestavuje samostatně pomocí Wrangleru a není statickým souborem v dist.

## Kontaktní formulář v0.5 — skutečný stav

Implementace je připravená a otestovaná se simulovanými službami. **Produkční doručení nebylo ověřeno; nic nebylo nasazeno.** `npm run dev` podává pouze statický web, takže lokálně skutečné odesílání nefunguje. Pro Worker použijte po přípravě vlastní konfigurace `wrangler dev --config <vaše-konfigurace>`; lokální náhrady bindingů nejsou důkazem doručení.

Pole zůstávají stejná: jméno, telefon, obec, typ poptávky a popis jsou povinné, e-mail zákazníka nepovinný. Tlačítko se zapne po ověření Turnstile. JavaScript odešle JSON na stejný origin `/api/contact`; bez JavaScriptu zůstává tlačítko vypnuté a `method="dialog"` brání přenosu údajů do URL. Při chybě údaje zůstávají ve formuláři, při úspěšném předání službě se vymažou. Během odesílání je tlačítko blokované, automatické opakování se neprovádí.

Worker (`worker/index.mjs`, `worker/contact.mjs`) kontroluje origin, JSON do 12 000 B i bez Content-Length, délky polí, telefon, nepovinný e-mail a typ poptávky. Ověřuje token na serveru včetně `success`, `hostname` a `action=contact`; tokeny jsou jednorázové podle pravidel Turnstile. Tajný klíč se nikam neposílá kromě Siteverify. Timeout či chyba ověření odeslání zastaví.

Ochrana proti spamu: Turnstile, neveřejné honeypot pole a Workers Rate Limiting binding (v šabloně 3 požadavky za 60 sekund na hash IP). Limit se kontroluje před ověřením a odesláním. Cloudflare rate limiting je distribuovaný a není globálně přesnou kvótou ani absolutní ochranou proti distribuovanému spamu. Při nedostupném limitu či chybějících bindinzích Worker odmítne odeslání.

E-mail jde výhradně na serverem pevně nastavené `imperium@isb7.cz`. Obsahuje typ péče i všechna pole; při chybějícím e-mailu uvádí „Neuveden“. Případný zákaznický e-mail je pouze Reply-To, nikdy From nebo příjemce. Text zprávy je MIME UTF-8/base64; hlavičky neobsahují neověřený volný text. `CONTACT_EMAIL.send()` musí úspěšně skončit před HTTP 200. To znamená **přijetí doručovací službou, nikoliv důkaz doručení do schránky**. Při selhání je HTTP 502 a srozumitelná chyba. Při přerušení spojení nelze přijetí spolehlivě potvrdit: před opakováním zkontrolujte schránku, aby nevznikla duplicitní poptávka.

Neukládáme klientské údaje do databáze, KV, localStorage ani logů aplikace. IP se používá pro Siteverify a jako SHA-256 klíč krátkodobého platformního limitu; obsah poptávky zůstává pouze ve zpracovávaném požadavku a cílovém e-mailu. Retence schránky a případné platformní request logy závisejí na nastavení provozovatele. Schválené informace o ochraně osobních údajů jsou na `/ochrana-osobnich-udaju`. Veřejným kontaktem je `lucie@strihnuto.cz`; schránka dle zadání zatím není aktivní a musí se technicky zprovoznit. Technický příjemce formuláře zůstává `imperium@isb7.cz` a není veřejně zobrazený.

## Co nastavit v Cloudflare (ručně, bez změn provedených v tomto PR)

V kořeni je skutečný **`wrangler.jsonc`**, který použije stávající deploy command `npx wrangler deploy`. Worker zůstává **`strihnuto-web`**, origin **`https://strihnuto-web.github-6b5.workers.dev`**, produkční větev **`main`**, build **`npm run build`**, root **`/`**. Automatické nasazování z GitHubu zůstává stávající; žádné nové workflow se nepřidává. Vložení konfigurace do PR samo nic nenasazuje, ale po případném ručním merge může existující automatické nasazování spustit deploy.

Konfigurace obsahuje `worker/index.mjs`, assets z `dist` pod bindingem `ASSETS`, `/api/*` přes Worker, `CONTACT_EMAIL` omezený na ověřeného příjemce a `CONTACT_RATE_LIMITER` (3 / 60 s, namespace 1001). `workers_dev: true` zachovává nynější typ veřejné adresy; nejsou definované nové routes ani DNS. `keep_vars: true` chrání proměnné nastavené v dashboardu, zejména budoucí `MAIL_FROM`; `SITE_ORIGIN` je spravovaný v repozitáři. Tajný klíč v konfiguraci není.

`wrangler.example.jsonc` zůstává pouze obecným příkladem. Nepoužívejte jej místo produkčního souboru. Samotné nahrání dist pro serverovou část nestačí.

1. **Turnstile:** v dashboardu otevřete widget se Site Key `0x4AAAAAAGCCjx_5Khzyd-a-`. Nastavte typ **Managed** a povolte skutečný hostname webu. Managed se volí v dashboardu, není to domyšlený parametr JS. Přidejte Secret Key tohoto widgetu do existujícího Workera jako šifrovaný secret **`TURNSTILE_SECRET_KEY`** (Workers & Pages → Worker → Settings → Variables and Secrets → Add → Secret). Nikdy jej nedávejte do GitHubu ani do chatu.
2. **Příjemce:** v Email → Email Routing → Destination addresses přidejte `imperium@isb7.cz` a potvrďte ověřovací e-mail v této schránce. Stav musí být ověřený. Nelze posílat libovolným neověřeným příjemcům.
3. **Odesílatel:** vyberte vlastní adresu na doméně se zprovozněným Cloudflare Email Routing a nastavte ji jako **`MAIL_FROM`**. Nepoužívejte e-mail zákazníka. Pokud Email Routing zatím nemáte a jeho zapnutí požaduje MX/TXT/DNS změny, zastavte se: to je samostatný krok vlastníka domény a tento PR žádné změny DNS nepovoluje ani neprovádí. Ověřte také dostupnost send_email bindingu a aktuální limity pro váš účet; bez potřebné domény nelze slíbit funkční bezplatné doručování. Žádná placená ani externí služba není automaticky zavedená.
4. **Bindingy:** `CONTACT_EMAIL`, `CONTACT_RATE_LIMITER` a `SITE_ORIGIN` jsou připravené v produkčním `wrangler.jsonc`; jejich skutečné vytvoření/použití ověří až následné nasazení na účet. Namespace `1001` je stabilně zvolen pro tento formulář; pokud jej již používá jiný váš limiter, zkontrolujte možné sdílení čítačů před nasazením. Kvóta není databází klientů.
5. **Automatický build:** zachovejte ověřené nastavení Worker Builds: repozitář `isb7cz/strihnuto-web`, větev `main`, build `npm run build`, deploy `npx wrangler deploy`, root `/`. Secret nastavte v runtime existujícího Workera, nikoli jen jako build proměnnou. `MAIL_FROM` je runtime proměnná. Nepřidávejte novou doménu ani neměňte DNS.
6. Po samostatně schváleném nastavení a nasazení postupujte podle následujícího testu. V tomto PR se nic nenasazuje.

Oficiální podklady: [Send Email from Workers](https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/), [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/). Podmínky a limity ověřte před aktivací v aktuálním dashboardu; tento projekt nepředpokládá neověřenou existující konfiguraci.

## Jak ověřit skutečné doručení

Až budou nastavené bindingy a secret a bude zvlášť povolené nasazení:

1. Na skutečné povolené doméně odešlete ručně poptávku s jednoznačným testovacím označením, nejprve bez zákaznického e-mailu. Použijte pouze vlastní testovací kontaktní údaje. Turnstile musí proběhnout v Managed režimu.
2. Ověřte HTTP 200, hlášku o předání službě a následně **skutečný e-mail v imperium@isb7.cz**, včetně spamu. Zkontrolujte češtinu, telefon, obec, zprávu a označení běžné péče. Jen HTTP 200 není důkaz doručení.
3. Po vypršení minutového limitu zopakujte pro zvýhodněnou péči a vlastní nepovinný e-mail; ověřte Reply-To a typ péče v předmětu i těle.
4. V odděleném testovacím Workeru ověřte chybný/expirující token, opakování tokenu, překročení limitu a chybějící e-mailový binding. Musí následovat chyba, nikdy falešný úspěch; neničte kvůli testu produkční nastavení.
5. Pokud zpráva není ve schránce, ověřte příjemce, MAIL_FROM a stav Email Routing. Neopakujte bez kontroly slepě zprávy a nesdílejte logy s obsahem klientských údajů. Po testu testovací e-maily podle potřeby odstraňte.

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

Prezentační část: **framework None (HTML/CSS)**, **build command `npm run build`**, **output directory `dist`**. Od v0.5 ale samotný statický hosting pro formulář nestačí: serverový vstup je `worker/index.mjs` s bindingy popsanými výše. Přechod na Pages by vyžadoval samostatné rozhodnutí a serverovou integraci; není součástí tohoto PR.

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

## Změny a ověření v0.5

Zapojený klient formuláře, Turnstile Siteverify a Worker s validací, honeypotem, rate limiterem a příjemcem imperium@isb7.cz. Přibyla šablona i produkční wrangler.jsonc a testy; žádný tajný klíč, databáze ani produkční balíčková závislost. Konfigurace zatím nebyla nasazena. Schválené texty mimo stav formuláře, ostatní sekce, fotografie a CSS jsou zachované.

- `npm test`: 19 úspěšných testů; `npm run build`: úspěch.
- Wrangler 4.162.0: `deploy --dry-run` s lokální validační konfigurací úspěšně sestavil Worker a rozpoznal Email, Rate Limit a Assets bindingy. Nebyl proveden deployment ani účetní ověření skutečných bindingů.
- Testy doručování a Siteverify používají simulace. Skutečné doručení zatím **neověřeno**.

- Chromium / Playwright se simulovaným Turnstile a HTTP službou: 375, 768 a 1440 px; ověřený nepovinný e-mail, blokace souběžného odesílání, zachování polí při chybě, vymazání až po úspěchu a absence přetečení. Toto není živý test Managed challenge ani e-mailu.

### Produkční konfigurace v PR #5

Přidaný kořenový `wrangler.jsonc` podle uživatelem potvrzeného existujícího Workera a produkční URL. `MAIL_FROM` není vyplněný ani vymyšlený; manuálně je potřeba zvolit doménu vlastněnou provozovatelem s aktivním Cloudflare Email Routing a adresu na této doméně, kterou nastavíte jako runtime `MAIL_FROM`. Doména cílového příjemce `isb7.cz` sama o sobě neurčuje ani neaktivuje doménu odesílatele. Není potvrzeno, že `strihnuto.cz` nebo jiná doména již má Email Routing; žádná adresa typu noreply není přednastavená. Aktivace domény, případné MX/TXT a ověření odesílatele vyžadují samostatné ruční rozhodnutí. Bez toho, bez ověřeného příjemce nebo bez správného secretu nelze tvrdit, že e-maily chodí.

Ověření konfigurace bez nasazení (po buildu):

```sh
npx wrangler deploy --dry-run --config wrangler.jsonc --outdir /tmp/strihnuto-worker-build
```

Dry-run ověří sestavení a tvar konfigurace, nikoli existenci secretu, aktivaci Email Routing, oprávnění účtu nebo skutečné doručení. Aktivní hosting, GitHub integrace a DNS se touto kontrolou nemění.

Ověření produkčního doplnění: `npm test` — 20 úspěšných testů; `npm run build` — úspěch; Wrangler 4.162.0 `deploy --dry-run --config wrangler.jsonc` — úspěch, rozpoznané produkční bindingy a origin. Bez deploymentu; nepřítomnost MAIL_FROM a secretu je záměrná a do jejich ručního nastavení server bezpečně odmítne odesílání.

## Střihnuto v1.0 – finální obsahová verze

Veřejný obsah je podle zadání uzavřený. Doplněný klikací kontakt `lucie@strihnuto.cz` v kontaktu, patičce a zásadách ochrany údajů. Adresa zatím není aktivní. `MAIL_FROM` se v této verzi nenastavuje a serverový příjemce zůstává beze změny.

Nová statická stránka `ochrana-osobnich-udaju/index.html` se kopíruje do stejné složky v dist. Assets binding ji v původní konfiguraci obsluhuje na `/ochrana-osobnich-udaju` (normalizuje na koncové lomítko) i `/ochrana-osobnich-udaju/`. Obě adresy ověřeny v lokálním Workers runtime; nebyla měněna konfigurace ani přidáván router. Stránka používá původní logo a CSS, má návrat na hlavní stránku a nenačítá Turnstile ani jiné skripty.

Schválený text zásad je vložen doslovně včetně data 16. listopadu 2026, jeho předloha je v `tests/fixtures/privacy-copy.json`. U formuláře je přesný informační text s odkazem a upozornění u zprávy, bez souhlasového checkboxu. Veřejné TODO texty odstraněny, ostatní schválené texty, fotografie, identifikační údaje a skryté příběhy zachované.

### Ověření v1.0

- `npm test`: 24 testů prošlo; `npm run build`: úspěch.
- Wrangler 4.162.0 `deploy --dry-run`: úspěch; bez nasazení.
- Lokální Wrangler Workers runtime + Chromium: obě varianty URL, navigace z formuláře a patičky i návrat domů, načtení loga a žádné vodorovné přetečení při 375, 768 a 1440 px. Bez skutečného odesílání formuláře.
- Závěrečná kontrola veřejného HTML: žádné TODO, testovací profily nebo technický příjemce. Veřejné e-mailové odkazy směřují pouze na lucie@strihnuto.cz. Bez změn schválených ostatních textů.

### Zbývající technické kroky před ostrým spuštěním

- Aktivovat `lucie@strihnuto.cz` a ověřit příjem i odesílání; teprve následně samostatně nastavit jako `MAIL_FROM` na způsobilé aktivní Email Routing doméně.
- Potvrdit ověření `imperium@isb7.cz`, správný runtime Turnstile secret, Managed widget, hostname a produkční bindingy.
- Samostatně provést schválené nastavení domény/DNS, zabezpečení a nasazení. Tato změna je neprovádí.
- Ověřit skutečné doručení obou typů poptávek (včetně bez zákaznického e-mailu), chybové stavy a limity, obě URL ochrany údajů a mobilní zobrazení na skutečné produkční doméně. Přijetí odesílací službou není důkaz doručení do schránky.
