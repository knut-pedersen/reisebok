import { BackLink } from '../components/bits';
import { useBack } from '../lib/nav';
import { usePageTitle } from '../lib/page';
import { useStore } from '../store/store';

const h2 = { fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 22, margin: '0 0 8px' } as const;
const ul = { margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 } as const;

export default function AboutPage() {
  const isMobile = useStore(s => s.isMobile);
  const back = useBack('/innstillinger');
  usePageTitle('Om appen');
  return (
    <>
      {!isMobile && <BackLink onClick={back} />}
      <div className="stack" style={{ maxWidth: 720, gap: 22, fontSize: 15 }}>
        <div><div className="kicker">Designbrief 25. oktober 2026</div><h1 className="page-title" style={{ marginTop: 4 }}>Om appen</h1></div>
        <section>
          <h2 style={h2}>Designvalg</h2>
          <ul style={ul}>
            <li><strong>Minnet er byggesteinen.</strong> Et minne registreres én gang. «Historien», «Dager», «Steder», «Bilder» og bokvisningen er bare forskjellige visninger av det samme minnet. Redigerer dere teksten eller fremhever et bilde, endres alle visningene.</li>
            <li><strong>Historien settes sammen av minner</strong> med deres egen innledning og mellomtekster. «Ordne historien» endrer rekkefølgen og hva som er med, men ikke datoene. Dagsoversikten er alltid kronologisk.</li>
            <li><strong>Kart og tidslinje henger sammen.</strong> Velger dere et minne, fremheves markøren. Trykker dere på en markør, åpnes minnet i tidslinjen. Har et sted flere minner, velger dere mellom dem etter dato og tittel. På desktop vises kart og tidslinje side om side. På mobil beholdes valget når dere bytter mellom Kart og Tidslinje, og «Tilbake» går til samme sted på siden.</li>
            <li><strong>Delvis kjent dato</strong> vises som «Juli 2025 – dag ikke angitt», uten at det lages en eksakt dato.</li>
            <li><strong>Skrivestatus og lagringsstatus er adskilt.</strong> «Under arbeid» eller «Ferdig» er deres eget valg. Lagret lokalt, venter, laster opp, synkronisert eller feil handler om hvor innholdet finnes. Ingenting publiseres.</li>
            <li><strong>Bildevalg:</strong> forsidebilde, «Fremhev i reiseboken» og «Ta med i bokvisningen» er tre separate valg. Standard er at bildet er med i boken, men ikke fremhevet. Ingen kopier lages.</li>
            <li><strong>Album, ikke feed:</strong> kremhvit bunn, serif (Newsreader) i historien, sans (IBM Plex Sans) i knapper og menyer, og håndskrift bare i korte personlige notater. Markørene skilles med form og bokstav, ikke bare farge.</li>
            <li><strong>Funksjonell referanse:</strong> sammenhengen mellom reiser, stedfestede innlegg og fotobok er hentet fra FindPenguins. Koblingen mellom kart og minne og de adskilte statusene er deres egne designkrav, ikke en beskrivelse av FindPenguins.</li>
          </ul>
        </section>
        <section>
          <h2 style={h2}>Hva som kan testes</h2>
          <ol style={{ ...ul, gap: 4 }}>
            <li>Kart → Cannes → velg juli 2025 eller juli 2026 → Åpne reiseboken.</li>
            <li>Les «Historien», åpne en dag, et minne og et bilde i full visning. Under «Steder» velger dere et minne i tidslinjen og ser markøren, eller trykker på Le Suquet og velger mellom flere minner. Bytt til «Historien»: samme minne er markert.</li>
            <li>Åpne «Bistro ved havnen» og se Knuts og Annas separate vurderinger fra to besøk.</li>
            <li>Legg til → Ny reise → Legg til minne med sted og dato → «Se i historien», «Se dagen» og «Se på kartet» viser det samme minnet.</li>
            <li>Legg til → Bilder: demobilder eller egne bilder, forslag, «Bruk dato fra bildet» med bekreftelse, manglende dato og sted, duplikat, fremheving og bok-utvalg, deretter fremdrift med feil og «Prøv igjen».</li>
            <li>Synkpanelet → «Simuler uten nett» → lagre et minne som «Under arbeid» → nett tilbake → feil → «Prøv igjen» → Synkronisert. Minnet står fortsatt som «Under arbeid». «Siste kveld i Le Suquet» er ferdig, men venter fortsatt på opplasting.</li>
            <li>Drømmer → nytt reisemål → «Gjør til kommende reise» → «Begynn å dokumentere».</li>
            <li>Reisesiden → «Bilder»: fremhev og ta ut bilder → «Se som reisebok» → «Bildeutvalg» og «Kommentarer» endrer boken med en gang.</li>
            <li>Bokvisningen → «Last ned som PDF» (forhåndsvisning) → «Komplett arkiv (ZIP)». Det samme finnes under Innstillinger → Eksport.</li>
          </ol>
          <p className="small muted" style={{ margin: '8px 0 0' }}>Tomtilstander: søk uten treff, filter uten reiser, dag uten innhold, minne uten tekst («Dagstur til Antibes»), ny reise uten historie og reisen som ikke er skrevet ferdig («Cannes igjen»).</p>
        </section>
        <section>
          <h2 style={h2}>Hva som er ekte, og hva som er simulert</h2>
          <ul style={ul}>
            <li><strong>Ekte:</strong> alt dere skriver og legger til, lagres på denne telefonen (IndexedDB), også uten nett. Egne bilder lagres som originalfiler på telefonen. «Lagret» vises først når lagringen er bekreftet, og full lagringsplass gir en tydelig feilmelding.</li>
            <li><strong>Ekte:</strong> dato og posisjon leses fra egne bildefiler (EXIF) når informasjonen finnes. Posisjonen gir bare et forslag til sted – dere bekrefter selv.</li>
            <li><strong>Kart:</strong> kartfliser fra CARTO (bygger på OpenStreetMap), med Natural Earth som enkel reserve. Leverandøren kan byttes i oppsettet.</li>
            <li><strong>Simulert:</strong> innlogging, brukerbytte, skylagring og synkronisering mellom telefoner.</li>
            <li><strong>Simulert:</strong> opplasting, feil og nytt forsøk, offline-nedlasting, PDF-forhåndsvisning, PDF-eksport og ZIP.</li>
            <li><strong>Simulert:</strong> kollisjon mellom samtidige endringer (kan utløses fra synkpanelet).</li>
            <li>Demoinnholdet er illustrerende. Bildene er nøytrale illustrasjonsfoto og ikke private bilder. Ingen lagringsstatus her betyr at noe faktisk er sikkerhetskopiert.</li>
          </ul>
        </section>
        <section>
          <h2 style={h2}>Må valideres på deres Android-telefoner</h2>
          <ul style={{ ...ul, gap: 4 }}>
            <li><strong>Mange store bilder:</strong> minnebruk ved valg av 50+ HEIC/JPEG, generering av visningskopier på enheten, lagringskvote for PWA (IndexedDB/OPFS) og hva som skjer når plassen tar slutt.</li>
            <li><strong>Avbrutt nett:</strong> gjenopptakbar opplasting i biter, idempotente ID-er mot duplikater, kø som overlever at appen lukkes. Background Sync er upålitelig på Android – designet lover ikke bakgrunnsfullføring.</li>
            <li><strong>Omstart av appen:</strong> at utkast og kø gjenopprettes, og at «Lagret» aldri vises før skrivingen er bekreftet.</li>
            <li><strong>Samtidige endringer:</strong> versjonering per felt (felles tekst vs. personlige felt), konfliktvisning som her, og at den andre telefonen får endringen.</li>
            <li><strong>Bildevelger og EXIF:</strong> at Androids bildevelger gir tilgang til fotograferingstidspunkt og posisjon (strippes ofte), og tidssone-håndtering.</li>
            <li><strong>Kart offline:</strong> flis-caching er bevisst utelatt i første versjon; listevisning må være fullgod.</li>
            <li><strong>Ett minne, mange visninger:</strong> datamodell der historie, bok og galleri bare refererer til minner og bilder (ingen kopier), og at bildeflagg synkroniseres per bilde.</li>
            <li><strong>Skrivestatus vs. synk:</strong> at to telefoner kan fortsette på samme «Under arbeid»-minne uten å overskrive hverandre (versjonering per felt).</li>
            <li><strong>PDF-generering</strong> med mange bilder på telefon eller server – minne, tid og fonter.</li>
            <li><strong>Installasjon på hjemskjerm,</strong> tommelrekkevidde og store trykkflater på deres faktiske skjermstørrelser.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
