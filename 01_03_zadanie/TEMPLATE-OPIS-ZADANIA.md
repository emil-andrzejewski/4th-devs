# 01_03_zadanie - runbook folderu

Ten plik jest krotkim runbookiem do pracy z folderem `01_03_zadanie`.

## 1) Cel folderu

Implementacja zadania `proxy`:
- publiczny endpoint HTTP `POST /`
- inteligentny asystent z pamiecia sesji (`sessionID`)
- narzedzia do API paczek (`check_package`, `redirect_package`)
- dyskretne przekierowanie paczki reaktora do `PWR6132PL`.

Dokladny opis zadania znajduje sie w `task.md`.

## 2) Glowna struktura plikow

```text
01_03_zadanie/
|- task.md
|- TEMPLATE-OPIS-ZADANIA.md
|- README.md
|- package.json
|- app.js
|- src/
|  |- app.js          # serwer HTTP
|  |- config.js       # env, OpenRouter, endpointy, limity
|  |- api.js          # HTTP client z retry/timeout
|  |- io.js           # parse request/response JSON
|  |- llm.js          # Responses API + extract tool/text
|  |- packages.js     # tools + polityka redirectu
|  |- agent.js        # petla tool-calling + sesje RAM
```

## 3) Jak uruchamiac (npm)

Uruchamiaj z katalogu `01_03_zadanie`:

```powershell
npm run all
```

Mapowanie skryptow z `package.json`:
- `start` -> `app.js`
- `dev` -> `app.js` w trybie watch
- `all` -> `app.js`

## 4) Jak uruchamiac bez npm (node)

```powershell
node .\app.js
```

## 5) Przeplyw danych (krok po kroku)

1. Operator wysyla `POST /` z `{ sessionID, msg }`.
2. Serwer waliduje payload i pobiera stan sesji z mapy RAM.
3. Agent wysyla historie + nowa wiadomosc do modelu (OpenRouter Responses API).
4. Jesli model zwroci `function_call`:
   - wykonywane jest `check_package` albo `redirect_package`
   - wynik idzie jako `function_call_output` do kolejnego kroku petli.
5. Petla konczy sie po odpowiedzi tekstowej modelu lub po limicie rund.
6. Serwer zwraca `{ "msg": "<odpowiedz>" }`.

## 6) Gdzie jest output

Brak artefaktow plikowych. Output jest runtime:
- odpowiedzi HTTP endpointu
- logi procesu (requesty, tool calls, odpowiedzi modelu).

## 7) Konfiguracja i wymagania

### Wymagania runtime
- Node.js 24+.

### Najwazniejsze zmienne env (root `.env`)
- `AG3NTS_API_KEY` (wymagane)
- `OPENROUTER_API_KEY` (wymagane)
- `AI_PROVIDER=openrouter` (wymagane dla tego zadania)
- opcjonalnie: `PORT`, `HOST`, `PROXY_MODEL`, `MAX_TOOL_ROUNDS`.

## 8) Szybki start

```powershell
cd C:\Users\Emil\repos\aidevs\4th-devs\01_03_zadanie
npm run all
```

Udostepnienie publiczne (ngrok):

```powershell
ngrok http 3000
```

Manualne verify (wykonujesz recznie):

```json
{
  "apikey": "AG3NTS_API_KEY",
  "task": "proxy",
  "answer": {
    "url": "https://twoj-ngrok-url.ngrok-free.app/",
    "sessionID": "dowolny-session-id"
  }
}
```

## 9) Checklista aktualizacji template pod nowe zadanie

- [x] Czy `package.json` ma aktualne skrypty uruchamiania?
- [x] Czy `src/config.js` ma komplet endpointow i env?
- [x] Czy kontrakt endpointu (`POST /`, `{sessionID,msg}` -> `{msg}`) jest opisany?
- [x] Czy runbook opisuje petle narzedzi i polityke ukrytego redirectu?

