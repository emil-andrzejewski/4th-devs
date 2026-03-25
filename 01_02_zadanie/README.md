# 01_02_zadanie

Deterministyczny pipeline dla zadania `findhim`.

## Co robi pipeline

1. Wczytuje i normalizuje podejrzanych z `input/transport.people.json`.
2. Pobiera listę elektrowni z `findhim_locations.json`.
3. Dla kazdego podejrzanego pobiera lokalizacje z `/api/location`.
4. Liczy odleglosci Haversine i wybiera globalnie najblizsze dopasowanie.
5. Pobiera `accessLevel` dla kandydata i wysyla odpowiedz do `/verify`.

## Wymagania

- Node.js 24+
- Ustawione `AG3NTS_API_KEY` w `.env` repo lub w zmiennych srodowiskowych.

## Uruchamianie

```powershell
cd C:\Users\Emil\repos\aidevs\4th-devs\01_02_zadanie
npm run step1
npm run step2
npm run step3
```

Lub calosc jednym poleceniem:

```powershell
npm run all
```

## Output

Artefakty zapisywane sa w `output/`:

- `suspects.json`
- `power-plants.json`
- `locations-scan.json`
- `candidate-location.json`
- `verify-payload.json`
- `verify-response.json`

