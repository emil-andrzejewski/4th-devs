# x_y_zadanie - template opisu folderu

Ten plik jest krotkim runbookiem do pracy z folderem `x_y_zadanie`.

## 1) Cel folderu

Pipeline sklada sie z 3 glownych krokow:
1. Normalizacja listy podejrzanych z `input/transport.people.json`.
2. Pobranie lokalizacji elektrowni i lokalizacji kazdej osoby, a nastepnie wybor osoby najblizej elektrowni.
3. Pobranie `accessLevel` dla kandydata i wysylka odpowiedzi do `/verify`.

Dokladny opis zadania znajduje sie w `task.md`.

## 2) Glowna struktura plikow

```text
x_y_zadanie/
|- task.md
|- TEMPLATE-OPIS-ZADANIA.md
|- README.md
|- package.json
|- app.js
|- input/
|- scripts/
|- src/
|  |- app.js
|  |- config.js
|  |- api.js
|  |- io.js
|- output/
```

## 3) Jak uruchamiac (npm)

Uruchamiaj z katalogu `x_y_zadanie`:

```powershell
npm run step1
npm run step2
npm run step3
npm run all
```

Mapowanie skryptow z `package.json`:
- `step1` -> `scripts/01-prepare-suspects.js`
- `step2` -> `scripts/02-find-candidate.js`
- `step3` -> `scripts/03-send-answer.js`
- `all` -> `app.js` (pelny pipeline)

## 4) Jak uruchamiac bez npm (node)

```powershell
node .\scripts\01-prepare-suspects.js
node .\scripts\02-find-candidate.js
node .\scripts\03-send-answer.js
node .\app.js
```

## 5) Przeplyw danych (krok po kroku)

1. Wejscie: `input/transport.people.json`
2. `01-prepare-suspects.js` zapisuje `output/suspects.json`
3. `02-find-candidate.js`:
   - pobiera `findhim_locations.json`
   - odpytuje `/api/location` dla kazdego podejrzanego
   - liczy odleglosci Haversine
   - zapisuje skan i kandydata
4. `03-send-answer.js`:
   - pobiera `accessLevel` z `/api/accesslevel`
   - wysyla wynik do `/verify`
   - zapisuje payload i odpowiedz verify

## 6) Gdzie jest output

Wszystkie artefakty sa w `x_y_zadanie/output/`:
- `suspects.json` - znormalizowana lista osob
- `power-plants.json` - lista elektrowni + surowa odpowiedz
- `locations-scan.json` - szczegoly skanu dla kazdej osoby
- `candidate-location.json` - najlepsze dopasowanie osoba-elektrownia
- `verify-payload.json` - dane przygotowane do wysylki
- `verify-response.json` - odpowiedz z endpointu verify

Sciezki sa zdefiniowane centralnie w `x_y_zadanie/src/config.js` (`paths`).

## 7) Konfiguracja i wymagania

### Wymagania runtime
- Node.js 24+.

### Najwazniejsze zmienne env
- `AG3NTS_API_KEY` (wymagane)

## 8) Szybki start

```powershell
cd C:\Users\Emil\repos\aidevs\4th-devs\x_y_zadanie
npm run all
```

## 9) Checklista aktualizacji template pod nowe zadanie

- [ ] Czy `scripts/` i `package.json` maja aktualne nazwy krokow pipeline?
- [ ] Czy input/output w `src/config.js` zgadzaja sie z opisem?
- [ ] Czy endpointy HUB i format payloadu verify sa poprawne?
- [ ] Czy runbook opisuje artefakty z `output/`?

