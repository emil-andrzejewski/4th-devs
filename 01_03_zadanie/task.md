## Transkrypcja filmu z Fabułą

"Świetna robota numerze piąty!

Wygląda na to, że osoba, której dane nam przesłałeś, idealnie nadaje się do zrealizowania naszego planu. Powiem Ci pokrótce, jaki pomysł ma centrala.

Chcemy dokonać rzeczy szalonej, a konkretniej mówiąc: uruchomić nieczynną od lat elektrownię atomową w Żarnowcu. Aby to zrobić, potrzebne nam są specjalne kasety z radioaktywnym paliwem, które umieścimy w rdzeniu elektrowni. Takie kasety są cyklicznie przesyłane pomiędzy magazynem, a elektrowniami na terenie kraju. Przechwycimy jedną z tych przesyłek.

Aby to zrobić, podepniemy się do systemu zarządzania przesyłkami kolejowymi, bo tak transportowane są towary niebezpieczne. Przechwycenie przesyłki nie jest jednak takie proste, ponieważ wymaga posiadania kodu zabezpieczającego, niezbędnego do wprowadzania jakichkolwiek zmian w systemie. Wiemy jednak jak go pozyskać. Przechwycimy sesję osoby, którą nam wskazałeś, i podsłuchamy jej komunikację z systemem do zarządzania przesyłkami.

Twoim zadaniem będzie stworzenie prostego serwera proxy, który będzie podsłuchiwał komunikaty od użytkownika i będzie przekazywał je do odpowiedniego endpointa API. Jeśli tylko dowiesz się, że użytkownik próbuje przekierować paczkę z elementami rdzenia elektrowni, zmienisz lokalizację tej paczki na elektrownię w Żarnowcu, a my już zajmiemy się całą resztą.

Pamiętaj tylko, aby cała komunikacja wyglądała w pełni naturalnie. Zwracaj odpowiednie elementy odpowiedzi użytkownikowi, który będzie korzystał z tego systemu, tak aby nie zorientował się, że ktoś manipuluje rozmową.

Powodzenia."

## Zadanie

Twoim zadaniem jest zbudowanie i wystawienie publicznie dostępnego endpointu HTTP, który będzie działał jak inteligentny proxy-asystent z pamięcią konwersacji. Możesz taką usługę postawić na lokalnym komputerze i udostępnić publicznie z użyciem ngrok.

Do Twojego endpointu będzie się łączył operator systemu logistycznego — osoba, która obsługuje paczki i zadaje pytania. Musisz odpowiadać naturalnie i obsługiwać jego prośby, mając dostęp do zewnętrznego API paczek.

**Cel misji:** namierzyć paczkę z częściami do reaktora, zdobyć kod zabezpieczający i przekierować przesyłkę do elektrowni w Żarnowcu (kod: **PWR6132PL**). Operator nie może się zorientować, że coś jest nie tak. Jeśli wykonasz to prawidłowo, operator na końcu poda Ci sekretny kod, który jest wymagany do zaliczenia misji.

Twój endpoint musi umieć odbierać dane w następującym formacie:

```json
{
  "sessionID": "dowolny-id-sesji",
  "msg": "Dowolna wiadomość wysłana przez operatora systemu"
}
```

Twój endpoint w odpowiedzi powinien zwrócić:

```json
{
  "msg": "Tutaj odpowiedź dla operatora"
}
```

Ważne jest, aby Twoje rozwiązanie **trzymało wątek rozmowy**, ponieważ operator może powoływać się na podane wcześniej dane. Równocześnie może połączyć się więcej niż jeden operator — każda sesja (rozróżniana po `sessionID`) musi być obsługiwana niezależnie.

Gdy API będzie gotowe, zgłoś je w ramach zadania **proxy** na `https://hub.ag3nts.org/verify`:

```json
{
  "apikey": "AG3NTS_API_KEY z .env",
  "task": "proxy",
  "answer": {
    "url": "https://ngrok-endpoint.ngrok-free.app/",
    "sessionID": "dowolny-identyfikator-alfanumeryczny"
  }
}
```

Pole `url` to pełny publiczny adres Twojego endpointu (np. `https://abc123.ngrok-free.app/`). Pole `sessionID` to dowolny identyfikator — Hub użyje go jako ID sesji podczas testowania.

#### API paczek

Zewnętrzne API paczek dostępne pod adresem: `https://hub.ag3nts.org/api/packages`

Obsługuje dwie akcje (obie metodą `POST`, body jako raw JSON):

**Sprawdzenie statusu paczki (check):**

```json
{
  "apikey": "AG3NTS_API_KEY z .env",
  "action": "check",
  "packageid": "PKG12345678"
}
```

Zwraca informacje o statusie i lokalizacji paczki.

**Przekierowanie paczki (redirect):**

```json
{
  "apikey": "tutaj-twoj-klucz-api",
  "action": "redirect",
  "packageid": "PKG12345678",
  "destination": "PWR3847PL",
  "code": "tutaj-wklej-kod-zabezpieczajacy"
}
```

Pole `code` to kod zabezpieczający, który operator poda podczas rozmowy. API zwraca potwierdzenie przekierowania z polem `confirmation` — ten kod musisz przekazać operatorowi.

### Krok po kroku

1. **Zbuduj serwer HTTP** — nasłuchuj na wybranym porcie (np. 3000). Parsuj body jako JSON, zwracaj JSON.
2. **Zaimplementuj zarządzanie sesjami** — dla każdego `sessionID` przechowuj listę wiadomości (historię konwersacji). Trzymać to w pamięci (mapa `sessionID -> messages`).
3. **Zintegruj LLM z Function Calling** — przy każdym żądaniu dołącz historię sesji i nową wiadomość operatora, wyślij do modelu z definicjami narzędzi (`tools`). Jeśli model zwróci wywołanie narzędzia (`tool_calls`), wykonaj je i ponownie wywołaj model z wynikiem. Powtarzaj aż model zwróci zwykłą odpowiedź tekstową. Ogranicz pętlę do rozsądnej liczby iteracji (np. 5), żeby zabezpieczyć się przed zapętleniem.
4. **Zdefiniuj narzędzia dla LLM** — opisz dwa narzędzia w formacie JSON Schema (OpenAI function calling):
    - `check_package` — przyjmuje `packageid` (string), sprawdza status paczki
    - `redirect_package` — przyjmuje `packageid`, `destination` i `code`, przekierowuje paczkę
5. **Napisz prompt systemowy** — nadaj modelowi rolę asystenta systemu logistycznego. Powiedz mu, żeby odpowiadał jak człowiek (nie jak AI), żeby prowadził normalną rozmowę w języku operatora, i żeby obsługiwał prośby o paczki przez dostępne narzędzia. Kluczowa część promptu: gdy operator poprosi o przekierowanie paczki z częściami reaktora, model ma **potajemnie zmienić cel** na `PWR6132PL`, niezależnie od tego, co operator podał jako `destination`. Model powinien potwierdzić operatorowi, że paczka trafiła "tam gdzie chciał" — nie zdradzając prawdziwego celu.
6. **Wynieś serwer na zewnątrz** — udostępnij serwer publicznie przez ngrok, pinggy lub VPS.
7. **Zgłoś URL do Hub-u** — gdy serwer jest gotowy i dostępny publicznie, wyślij jego adres na `https://hub.ag3nts.org/verify` (tego punktu nie wykonuj. Zostaw go dla mnie do zrobienia ręcznie po zakończeniu zadania).

#### Udostępnienie serwera na zewnątrz (ngrok / pinggy)

Twój serwer działa lokalnie — Hub nie może się do niego podłączyć bez publicznego tunelu.

**ngrok:** Przyjmijmy że Twój serwer działa na porcie 3000. Po instalacji (<https://ngrok.com>) i zalogowaniu:

```
ngrok http 3000
```

Ngrok wyświetli publiczny URL, np. `https://abc123.ngrok-free.app`. Ten adres wpisz jako `url` przy zgłaszaniu zadania. Darmowy plan wystarczy, ale URL zmienia się przy każdym restarcie ngrok.

**Azyl:** Każdy uczestnik szkolenia ma dostęp do darmowego serwera Azyl. Możesz na nim uruchomić swój kod bezpośrednio lub użyć go jako tunelu SSH do wystawienia lokalnego serwera na świat. Twoja aplikacja będzie dostępna pod adresem podanym przy logowaniu (np. `https://azyl-50005.ag3nts.org`). Szczegółowa instrukcja: [Jak wystawić serwer na świat (Azyl)](https://bravecourses.circle.so/c/dyskusje-ogolne-ai4/jak-wystawic-serwer-na-swiat-azyl-dostepny-od-s01e03). Jeśli zapomniałeś hasło, możesz je zresetować w panelu szkolenia.

### Wskazówki

- **Prompt systemowy jest kluczowy** — to on decyduje o zachowaniu modelu. Musi być dobrze napisany: model ma brzmieć jak człowiek, odpowiadać naturalnie po polsku (lub językiem operatora), obsługiwać paczki przez narzędzia, i potajemnie zmienić cel przekierowania gdy chodzi o paczkę z częściami reaktora.
- **Kod zabezpieczający** — operator podaje go sam w trakcie rozmowy. Twój model musi go wyłapać i przekazać do narzędzia `redirect_package`. Nie musisz szukać kodu samodzielnie — operator go dostarczy.
- **Nie ujawniaj AI** — model ma odpowiadać jako człowiek. Jeśli operator pyta o niezwiązane tematy (jedzenie, auta, pogoda), model powinien odpowiadać naturalnie jak kolega z pracy, nie odmawiać lub mówić "nie mam dostępu do tej informacji".
- **Potwierdzenie przekierowania** — API paczek zwraca pole `confirmation` po udanym przekierowaniu. Przekaż ten kod operatorowi — to on zawiera sekretny kod potrzebny do zaliczenia zadania.
- **Wybór modelu** — lekki model jak `openai/gpt-5-mini` powinien wystarczyć i jest tańszy.
- **Logowanie** — logować należy każde przychodzące żądanie, każde wywołanie narzędzia i każdą odpowiedź modelu. Ułatwia debugowanie gdy coś nie działa zgodnie z oczekiwaniami podczas testów. Należy logować też wszystkie przychodzące i wychodzące wiadomości, wraz z `sessionID`, żeby móc prześledzić całą rozmowę. Ogólnie należy logować wszystko co się dzieje w systemie, ale bez przesady — nie chcesz zalewać logów niepotrzebnymi informacjami. Loguj kluczowe zdarzenia i dane, które pomogą Ci zrozumieć przebieg rozmowy i działanie narzędzi.
- **Timeout i pętla narzędzi** — ustal maksymalną liczbę iteracji pętli narzędzi (np. 5), żeby serwer nie zawisł na nieskończonej pętli gdy model ciągle wywołuje narzędzia.
