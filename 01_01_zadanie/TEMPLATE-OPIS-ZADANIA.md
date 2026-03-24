# 01_01_zadanie - template opisu folderu

Ten plik jest krotkim runbookiem do pracy z folderem `01_01_zadanie`.
Mozesz skopiowac ten szablon pod nowe zadanie i podmienic nazwy plikow/skryptow.

## 1) Cel folderu

Pipeline sklada sie z 3 glownych krokow:
1. Parsowanie danych osob z `people.txt` do JSON.
2. Tagowanie zawodow przez LLM.
3. Wysylka wyniku do endpointu verify.

Dodatkowo jest skrypt pomocniczy do filtrowania osob z tagiem `transport`.

## 2) Glowna struktura plikow

```text
01_01_zadanie/
|- people.txt                  # dane wejsciowe
|- people.csv                  # alternatywne dane wejsciowe
|- people.xlsx                 # alternatywne dane wejsciowe
|- task.md                     # tresc zadania
|- plan-dzialania.md           # plan implementacji
|- package.json                # skrypty npm
|- api.js                      # lokalny punkt wejscia API (legacy/helper)
|- config.js                   # lokalna konfiguracja (legacy/helper)
|- scripts/
|  |- 01-parse-people.js       # people.txt -> output/people-with-jobs.json
|  |- 02-tag-jobs.js           # output/people-with-jobs.json -> output/people-with-tags.json
|  |- 03-send-answer.js        # wysylka danych do verify
|  |- 04-filter-transport.js   # output/people-with-tags.json -> output/transport.people.json
|- src/
|  |- api.js                   # klient Responses API + retry/timeout
|  |- config.js                # sciezki, modele, endpoint verify, batch size
|  |- schemas/
|     |- tags.js               # dozwolone tagi + walidacja
|- output/
   |- people-with-jobs.json
   |- people-with-tags.json
   |- transport.people.json
```

## 3) Jak uruchamiac (npm)

Uruchamiaj z katalogu `01_01_zadanie`:

```powershell
npm run parse
npm run tag
npm run send
npm run all
```

Mapowanie skryptow z `package.json`:
- `parse` -> `scripts/01-parse-people.js`
- `tag` -> `scripts/02-tag-jobs.js`
- `send` -> `scripts/03-send-answer.js`
- `all` -> parse + tag + send

## 4) Jak uruchamiac bez npm (node)

```powershell
node .\scripts\01-parse-people.js
node .\scripts\02-tag-jobs.js
node .\scripts\02-tag-jobs.js --batch=12
node .\scripts\03-send-answer.js
node .\scripts\04-filter-transport.js
```

Uwagi:
- `--batch=N` dziala dla `02-tag-jobs.js` (domyslnie 8, max 25).
- `04-filter-transport.js` nie ma aliasu w `package.json`, odpalany bezposrednio przez `node`.

## 5) Przeplyw danych (krok po kroku)

1. Wejscie: `people.txt`
2. `01-parse-people.js` zapisuje `output/people-with-jobs.json`
3. `02-tag-jobs.js` czyta `people-with-jobs.json`, odpytuje model `z-ai/glm-4.7`, zapisuje `output/people-with-tags.json`
4. `03-send-answer.js` czyta `people-with-tags.json`, filtruje rekordy z tagiem `transport`, wysyla payload do `https://hub.ag3nts.org/verify`
5. (Opcjonalnie) `04-filter-transport.js` tworzy `output/transport.people.json`

## 6) Gdzie jest output

Wszystkie artefakty sa w katalogu `01_01_zadanie/output/`:
- `people-with-jobs.json` - dane po parsowaniu
- `people-with-tags.json` - dane po tagowaniu przez LLM
- `transport.people.json` - dane przefiltrowane do tagu `transport`

Sciezki sa zdefiniowane centralnie w `01_01_zadanie/src/config.js` (obiekt `paths`).

## 7) Konfiguracja i wymagania

### Wymagania runtime
- Node.js 24+ (walidowane w glownym `config.js` repo).
- Dostep do API modelu (OpenAI lub OpenRouter) przez zmienne srodowiskowe.

### Najwazniejsze zmienne env
Konfiguracja kluczy jest ladowana przez glowny plik `config.js` w katalogu repo:
- `OPENAI_API_KEY` lub `OPENROUTER_API_KEY` (co najmniej jeden)
- opcjonalnie `AI_PROVIDER=openai|openrouter`
- opcjonalnie `AG3NTS_API_KEY` dla verify (w kodzie jest fallback, ale lepiej ustawic w env)

## 8) Szybki start

```powershell
cd C:\Users\Emil\repos\aidevs\4th-devs\01_01_zadanie
npm install
npm run all
```

## 9) Checklista aktualizacji template pod nowe zadanie

- [ ] Czy `scripts/` i `package.json` maja aktualne nazwy krokow pipeline?
- [ ] Czy input i output sciezki w `src/config.js` zgadzaja sie z opisem?
- [ ] Czy model i enum tagow w `src/schemas/` sa aktualne?
- [ ] Czy endpoint verify i klucze env sa poprawne?
- [ ] Czy opis uruchamiania zawiera takze skrypty bez aliasu npm?

