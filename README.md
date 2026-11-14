# STŘIHNUTO.cz

Český statický web spolku STŘIHNUTO, z. s. Bez backendu, trackerů, externích fontů a produkčních závislostí. Originální logo a ikony pocházejí z dodaného STRIHNUTO-web.zip.

## Spuštění

Vyžaduje Node.js 22+ pro testy a build a Python 3 pro lokální server. Není potřeba npm install.

```sh
npm run dev
```

Server běží na portu 8080. Používá standardní Python HTTP server, pouze pro lokální vývoj.

## Testy a build

```sh
npm test
npm run build
```

Testy ověřují strukturu, lokální odkazy a podklady, metadata a absenci falešných kontaktů či vzdálených závislostí. Build vytvoří čistý adresář dist/ s veřejnými soubory. Prohlížečové ověření se provádí samostatně; není součástí npm test.

## Ověření první verze

- `npm test`: 3 úspěšné testy.
- `npm run build`: úspěšně sestavený statický web.
- Chromium / Playwright: rozměry 375×812, 390×844, 768×1024 a 1440×1000; bez vodorovného přetečení, obrázky načtené, navigace a přeskočení na obsah klávesnicí fungují. Žádné externí požadavky ani chyby JavaScriptu. Jde o emulaci velikostí v Chromiu, nikoliv test na fyzickém iPhonu nebo v Safari.

## Nasazení na Cloudflare Pages

Připojte repozitář, zvolte framework None, build příkaz `npm run build` a výstupní složku `dist`. Kořen projektu je kořen repozitáře. Nejsou potřeba proměnné ani tajné údaje. Alternativně nahrajte obsah dist ručně. Nasazení ani DNS nebyly v rámci implementace změněny.

## Doplnit před zveřejněním

- Skutečný e-mail: nahraďte TODO v sekci Kontakt skutečným odkazem mailto.
- Rozhodnutí o telefonním kontaktu.
- Právní dokumenty a jejich skutečné odkazy v patičce, až budou existovat.

Ceny, reference a pravidla zvýhodnění nejsou vymyšlené. Web nemá formulář, cookies, analytiku ani reklamy. Informace o zpracování údajů při následné e-mailové komunikaci je potřeba připravit podle skutečného provozu. Kanonickou URL a sitemap doplňte po určení finální domény; před nasazením ověřte kontakty a obsah.
