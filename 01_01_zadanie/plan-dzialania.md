# Plan działania - zadanie `people`

## 1. Przygotowanie projektu
- Ustalić strukturę w `01_01_zadanie/`:
  - `scripts/01-parse-people.js`
  - `scripts/02-tag-jobs.js`
  - `scripts/03-send-answer.js`
  - `src/api.js`, `src/config.js`, `src/schemas/tags.js` (jeśli brak)
  - `output/people-with-jobs.json`, `output/people-with-tags.json`
- Dodać lub uzupełnić `package.json` i skrypty npm: `parse`, `tag`, `send`, `all`.
- Użyć `.env` (OpenRouter API key).

## 2. Skrypt 1: parsowanie `people.txt` -> `people-with-jobs.json`
- Wczytać `./people.txt` jako tekst.
- Rozdzielić rekordy po separatorze `;|` (z uwzględnieniem nowej linii).
- Dla każdego rekordu sparsować pola:
  - `name`, `surname`, `gender`, `birthDate`, `deathDate?`, `birthPlace`, `birthCountry`, `job`.
- Znormalizować dane:
  - `born` wyciągnąć jako rok z `birthDate`.
  - `city` przepisać z `birthPlace`.
- Zapisać wynik do `output/people-with-jobs.json`.

## 3. Skrypt 2: tagowanie zawodów przez LLM (`z-ai/glm-4.7`)
- Oprzeć integrację na wzorcach z `01_01_grounding/src` (API client, schematy, walidacja odpowiedzi).
- Zdefiniować dozwolone tagi (enum):
  - `IT`, `transport`, `edukacja`, `medycyna`, `praca z ludźmi`, `praca z pojazdami`, `praca fizyczna`.
- Przygotować prompt i schema wymuszające:
  - tylko tagi z listy,
  - możliwość wielu tagów,
  - brak innych kategorii.
- Przetworzyć `people-with-jobs.json` do formatu docelowego:
  - `name`, `surname`, `gender`, `born`, `city`, `tags`.
- Zapisać do `output/people-with-tags.json`.

## 4. Skrypt 3: wysyłka do `https://hub.ag3nts.org/verify`
- Wczytać `output/people-with-tags.json`.
- Zbudować payload:
  - `apikey`,
  - `task`: `people`,
  - `answer`: tablica rekordów.
  - wysyłać wszystkie osoby z tagiem: transport
- Wysłać `POST` i wypisać pełną odpowiedź serwera:
  - status HTTP,
  - odpowiedź serwera,
  - podstawowe logi diagnostyczne.

## 5. Walidacja i obsługa błędów
- Dodać walidację danych przed wysyłką:
  - `born` jako liczba (rok),
  - `tags` tylko z enum,
  - obecność wymaganych pól.
- Obsłużyć błędy:
  - puste rekordy,
  - niepoprawne linie wejściowe,
  - timeouty i błędy API.

## 6. Uruchamianie end-to-end
1. `npm run parse`
2. `npm run tag`
3. `npm run send`

Opcjonalnie: `npm run all` dla pełnego pipeline.

## 7. Odbiór końcowy
- Oczekiwane artefakty:
  - `output/people-with-jobs.json`
  - `output/people-with-tags.json`
- Potwierdzenie poprawnego przyjęcia payloadu przez endpoint verify.
