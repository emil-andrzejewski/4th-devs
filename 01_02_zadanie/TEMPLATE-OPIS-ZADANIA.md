# 01_02_zadanie - template opisu folderu

Ten plik jest krotkim runbookiem do pracy z folderem `01_02_zadanie`.

## 1) Cel folderu

Pipeline sklada sie z 3 glownych krokow:
1. Parsowanie danych osob z `01_02_zadanie/input/transport.people.json` do JSON.
2. Pobranie listy elektrowni z ich lokalizacjami
3. sprawdzenie lokalizacji osób względem elektrowni (kto był najbliżej)
4. Sprawdzenie poziomu dostępu wskazanej osoby
5. Wysylka wyniku do endpointu verify.

Dokładny opis zadania znajduje się w pliku `task.md`


## 2) Glowna struktura plikow

```text
01_01_zadanie/
|- task.md                     # tresc zadania do zaimplementowania
|- package.json                # skrypty npm
|- scripts/                    # skrypty pipeline
|- src/
|  |- api.js                   # klient Responses API + retry/timeout
|  |- config.js                # sciezki, modele, endpoint verify, batch size
|  |- schemas/                 # schematy danych dla llm 
|- output                      # dane wyjsciowe zapisywane jako json po każdym etapie działania programu
|- input                       # dane wejsciowe (np. transport.people.json)
```

## 3) Jak uruchamiac (npm)

// do uzupełnienia

## 4) Jak uruchamiac bez npm (node)

// do uzupełnienia

## 5) Przeplyw danych (krok po kroku)

// do uzupełnienia

## 6) Gdzie jest output

Wszystkie artefakty sa w katalogu `01_02_zadanie/output/`:
// do uzupełnienia

Sciezki sa zdefiniowane centralnie w `01_02_zadanie/src/config.js` (obiekt `paths`).

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
cd C:\Users\Emil\repos\aidevs\4th-devs\01_02_zadanie
npm install
npm run all
```

## 9) Checklista aktualizacji template pod nowe zadanie

- [ ] Czy `scripts/` i `package.json` maja aktualne nazwy krokow pipeline?
- [ ] Czy input i output sciezki w `src/config.js` zgadzaja sie z opisem?
- [ ] Czy modele w `src/schemas/` sa aktualne?
- [ ] Czy endpoint verify i klucze env sa poprawne?
- [ ] Czy opis uruchamiania zawiera takze skrypty bez aliasu npm?

