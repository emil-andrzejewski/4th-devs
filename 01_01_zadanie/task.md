Hej, pomóż mi napisać kilka skryptów w node js, które:
1. wczyta dane osób z pliku ./people.txt do pliku people-with-jobs.json. Przykład w każdej linii jednej osoby
```
Albert;Skiba;M;21.03.1991;20.12.1934;Grudziądz;Polska;Opracowuje zasady i metody przeprowadzania badań, które pozwalają lepiej zrozumieć otaczający nas świat. Jego praca ma na celu odkrywanie nowych praw i zależności. Wyniki jego badań mogą mieć ogromne znaczenie praktyczne.;|
```
Dane name,surname,gender,birthDate,birthPlace,birthCountry,job są rozdzielone średnikami. Na końcu linii występuje ;|, co rozdziela nas od kolejnej osoby (w sumie jest też znak nowej linii)
2. Na podstawie kodu w C:\Users\Emil\repos\aidevs\4th-devs\01_01_grounding\src przygotuj mi skrypt, który zrobi zapytania do openrouter i wyśle jobs ludzi do llma (z-ai/glm-4.7) i otaguje pracę ludzi wg możliwych tagów: [IT, transport, edukacja, medycyna, praca z ludźmi, praca z pojazdami, praca fizyczna] (przygotuj scheme z tymi tagami). Możliwe jest kilka tagów na osobę. Przetwórz people-with-jobs.json na people-with-tags.json z danymi w formie
```
[
    {
    "name": "Jan",
    "surname": "Kowalski",
    "gender": "M",
    "born": 1987,
    "city": "Warszawa",
    "tags": ["IT", "transport"]
    },
    {
    "name": "Anna",
    "surname": "Nowak",
    "gender": "F",
    "born": 1993,
    "city": "Grudziądz",
    "tags": ["IT", "medycyna", "edukacja"]
    }
]
```
3. skrypt, który wyśle dane z people-with-tags.json na adres https://hub.ag3nts.org/verify z payloadem
```
{
    "apikey": "2a23564e-df92-4d92-8d27-a198b2d60c9f",
    "task": "people",
    "answer": [
        {
        "name": "Jan",
        "surname": "Kowalski",
        "gender": "M",
        "born": 1987,
        "city": "Warszawa",
        "tags": ["tag1", "tag2"]
        },
        {
        "name": "Anna",
        "surname": "Nowak",
        "gender": "F",
        "born": 1993,
        "city": "Grudziądz",
        "tags": ["tagA", "tagB", "tagC"]
        }
    ]
}
```


Uwagi. Możesz sobie zainstalować co potrzebujesz. Możesz stworzyć package.json. Co potrzebujesz to zrób. 