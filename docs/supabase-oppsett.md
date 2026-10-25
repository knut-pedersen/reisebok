# Oppsett av det felles arkivet (Supabase)

Dette gjøres én gang. Det tar 15–20 minutter. Etterpå logger dere inn med e-post, og innholdet synkroniseres mellom telefonene.

## 1. Opprett prosjektet

1. Gå til https://supabase.com og lag en konto (gratis).
2. **New project**
   - Name: `reisebok`
   - Database password: lag et sterkt passord og ta vare på det (brukes sjelden).
   - Region: **Central EU (Frankfurt)** eller **North EU (Stockholm)**.
3. Vent til prosjektet er klart (et par minutter).

## 2. Lag tabellene og reglene

1. Åpne **SQL Editor** → **New query**.
2. Lim inn hele innholdet i [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) og trykk **Run**.
   Det lager arkivet, den private bildemappen og reglene som gjør at bare dere to får tilgang.

## 3. Legg inn dere to

1. **Authentication** → **Users** → **Add user** → **Create new user**.
   - Skriv Knuts e-postadresse, et tilfeldig passord (brukes ikke) og kryss av for **Auto Confirm User**.
   - Gjør det samme for Anna.
2. Tilbake i **SQL Editor**, kjør dette med deres faktiske adresser:

   ```sql
   insert into public.members (user_id, person)
   select id, 'knut' from auth.users where email = 'knut@eksempel.no';
   insert into public.members (user_id, person)
   select id, 'anna' from auth.users where email = 'anna@eksempel.no';
   ```

   Sjekk med `select * from public.members;`. Den skal vise to rader.

## 4. Innlogging med kode på e-post

1. **Authentication** → **Sign In / Providers**: slå **av** «Allow new users to sign up». Da kan bare dere to logge inn.
2. **Authentication** → **URL Configuration**:
   - Site URL: `https://knut-pedersen.github.io/reisebok/`
   - Redirect URLs: legg til `https://knut-pedersen.github.io/reisebok/` og `http://localhost:5173/`
3. **Authentication** → **Emails** → **Magic Link**. Bytt ut innholdet med dette, slik at e-posten viser koden appen ber om:

   ```html
   <h2>Logg inn i Vår reisebok</h2>
   <p>Koden din er: <strong style="font-size:24px;letter-spacing:4px">{{ .Token }}</strong></p>
   <p>Eller trykk her for å logge inn: <a href="{{ .ConfirmationURL }}">Logg inn</a></p>
   ```

Supabase sin innebygde e-posttjeneste sender bare et fåtall e-poster i timen. Det holder for to personer.

## 5. Koble appen til prosjektet

1. I Supabase: **Project Settings** → **API**. Kopier **Project URL** og **anon public**-nøkkelen.
   Anon-nøkkelen er laget for å ligge i appen. Tilgangen styres av reglene fra steg 2.
2. I GitHub: https://github.com/knut-pedersen/reisebok/settings/variables/actions → **New repository variable**, to ganger:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_ANON_KEY` = anon public-nøkkelen
3. Publiser på nytt: **Actions** → «Publiser til GitHub Pages» → **Run workflow** (eller merge neste endring).

## 6. Første innlogging

1. Åpne appen, skriv e-postadressen din og trykk «Send kode». Skriv inn koden fra e-posten.
2. Den første som logger inn, laster opp det som ligger på telefonen (demoreisene og det du har lagt til) som starten på det felles arkivet.
3. Når den andre logger inn, henter telefonen det felles arkivet. Det du har lagt til på den telefonen før innlogging, blir også med.

## Sikkerhetskopi

Synkronisering er ikke en sikkerhetskopi: sletter en av dere noe, forsvinner det hos begge. Last ned en kopi jevnlig fra **Innstillinger → Eksport → Komplett arkiv (ZIP)**, og lagre den et annet sted, for eksempel på PC eller i Google Disk.

Gratisnivået i Supabase har ikke daglige sikkerhetskopier på serveren. Det har Pro-nivået (ca. 25 USD/mnd). Gratisprosjekter settes også på pause etter en ukes inaktivitet. Da er appen tilgjengelig på telefonen, men synken stopper til prosjektet vekkes i Supabase-dashbordet.
