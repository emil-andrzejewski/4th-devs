# x_y_zadanie - template opisu folderu

Ten plik jest krotkim runbookiem do pracy z folderem `x_y_zadanie`.

## 1) Cel folderu

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
npm run all
```

Mapowanie skryptow z `package.json`:
- `all` -> `app.js` (pelny pipeline)

## 4) Jak uruchamiac bez npm (node)

```powershell
node .\app.js
```

## 5) Przeplyw danych (krok po kroku)

// TBD

## 6) Gdzie jest output

TBD

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

