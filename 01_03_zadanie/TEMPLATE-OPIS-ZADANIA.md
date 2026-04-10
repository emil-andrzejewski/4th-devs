# 01_03_zadanie - runbook folderu

Ten plik jest krotkim runbookiem do pracy z folderem `01_03_zadanie`.

## 1) Cel folderu

Implementacja zadania `proxy`:
- publiczny endpoint HTTP `POST /`
- asystent z pamiecia sesji (`sessionID`)
- function calling do narzedzi paczek
- narzedzia paczek przeniesione do osobnego MCP servera po HTTP
- dyskretne przekierowanie paczki reaktora do `PWR6132PL` (realizowane po stronie MCP).

Dokladny opis zadania znajduje sie w `task.md`.

## 2) Glowna struktura plikow

```text
01_03_zadanie/
|- task.md
|- TEMPLATE-OPIS-ZADANIA.md
|- README.md
|- package.json
|- app.js
|- mcp-server.js
|- src/
|  |- app.js             # proxy HTTP POST /
|  |- config.js          # env, OpenRouter, endpointy, limity
|  |- api.js             # HTTP client dla proxy (Responses API)
|  |- io.js              # parse request/response JSON
|  |- llm.js             # Responses API + extract tool/text
|  |- packages.js        # adapter: proxy -> MCP tool call
|  |- agent.js           # petla tool-calling + sesje RAM
|  |- mcp/
|  |  |- server.js       # MCP HTTP transport
|  |  |- tools.js        # check_package/redirect_package
|  |  |- config.js       # env i endpoint hub
|  |  |- net.js          # HTTP client MCP -> hub
|  |  |- logger.js       # logi [packages-mcp]
|  |  |- client.js       # klient MCP po stronie proxy
```

## 3) Jak uruchamiac (npm)

Uruchamiaj z katalogu `01_03_zadanie`:

Tryb domyslny (jeden proces nadrzedny uruchamia MCP + proxy):

```powershell
npm run all
```

Tryb rozdzielony (opcjonalnie):

```powershell
npm run mcp:server
npm run start
```

Mapowanie skryptow z `package.json`:
- `mcp:server` -> `mcp-server.js`
- `start` -> `app.js`
- `dev` -> `app.js` w trybie watch
- `all` -> `run-all.js` (bootstrapping obu procesow)

## 4) Jak uruchamiac bez npm (node)

```powershell
node .\mcp-server.js
node .\app.js
```

## 5) Przeplyw danych (krok po kroku)

1. Operator wysyla `POST /` z `{ sessionID, msg }` do proxy.
2. Proxy waliduje payload i pobiera stan sesji z mapy RAM.
3. Przy starcie proxy pobiera `tools/list` z MCP i mapuje schema do formatu narzedzi modelu.
4. Agent wysyla historie + nowa wiadomosc do modelu (OpenRouter Responses API).
5. Jesli model zwroci `function_call`:
   - proxy wywoluje MCP tool (`check_package` albo `redirect_package`)
   - MCP wykonuje realne wywolanie do `https://hub.ag3nts.org/api/packages`
   - MCP decyduje o ukrytym przekierowaniu dla paczki reaktora
   - proxy odsyla wynik jako `function_call_output` do kolejnej rundy modelu.
6. Petla konczy sie po odpowiedzi tekstowej modelu lub po limicie rund.
7. Proxy zwraca `{ "msg": "<odpowiedz>" }`.

## 6) Gdzie jest output

Brak artefaktow plikowych. Output jest runtime:
- odpowiedzi HTTP endpointu proxy
- logi proxy (`[proxy]`)
- logi MCP sidecar (`[packages-mcp]`) z informacjami o check/redirect i decyzjach reroute.

## 7) Konfiguracja i wymagania

### Wymagania runtime
- Node.js 24+.

### Najwazniejsze zmienne env (root `.env`)
- `AG3NTS_API_KEY` (wymagane)
- `OPENROUTER_API_KEY` (wymagane)
- `AI_PROVIDER=openrouter` (wymagane dla proxy)
- opcjonalnie:
  - proxy: `PORT`, `HOST`, `PROXY_MODEL`, `MAX_TOOL_ROUNDS`, `PACKAGES_MCP_URL`
  - MCP: `PACKAGES_MCP_HOST`, `PACKAGES_MCP_PORT`, `PACKAGES_MCP_PATH`.

## 8) Szybki start

```powershell
cd C:\Users\Emil\repos\aidevs\4th-devs\01_03_zadanie
npm install
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

- [x] Czy `package.json` ma aktualne skrypty uruchamiania (`mcp:server`, `all`)?
- [x] Czy `src/config.js` i `src/mcp/config.js` maja komplet endpointow i env?
- [x] Czy kontrakt endpointu (`POST /`, `{sessionID,msg}` -> `{msg}`) jest opisany?
- [x] Czy runbook opisuje flow proxy -> MCP -> hub?
- [x] Czy runbook opisuje logowanie kluczowych zdarzen po stronie MCP?

