/**
 * Genre-spezifische Prompt-Templates für die KI-Generierung
 *
 * Jedes Genre enthält:
 * - Charaktereigenschaften und Archetypen
 * - Weltenbau-Elemente
 * - Erzählelemente und Spannungsdynamik
 * - Stil-Guidelines
 * - Typische Konflikte
 */

export type GenreConfig = {
    id: string;
    name: string;
    nameEn: string;
    characterTraits: string;
    worldBuilding: string;
    narrativeElements: string;
    styleGuidelines: string;
    typicalConflicts: string;
    dialogueStyle: string;
    pacingNotes: string;
};

export const GENRE_CONFIGS: Record<string, GenreConfig> = {
    fantasy: {
        id: "fantasy",
        name: "Fantasy",
        nameEn: "Fantasy",
        characterTraits: `CHARAKTEREIGENSCHAFTEN FÜR FANTASY:
- Helden brauchen eine klare Bestimmung oder einen Ruf, dem sie folgen
- Mentoren/Figuren mit Wissen spielen eine wichtige Rolle
- Antagonisten sollten eine nachvollziehbare Motivation haben (nicht nur "böse")
- Charaktere müssen in der Welt verwurzelt sein (Herkunft, Kultur, Traditionen)
- Magiefähigkeiten sollten Kosten oder Limitationen haben
- Nebencharaktere können mythische Wesen, Handwerker oder Hüter alten Wissens sein`,

        worldBuilding: `WELTENBAU FÜR FANTASY:
- Magiesystem: Definiere klare Regeln (weich vs. hart), Kosten und Limitationen
- Geographie: Beschreibe einzigartige Biome, gefährliche Gegenden, sichere Häfen
- Kulturen: Jede Volksgruppe braucht eigene Traditionen, Sprachen, Konflikte
- Geschichte: Mythen, Legenden und vergangene Ereignisse formen die Gegenwart
- Politik: Machtstrukturen, Allianzen, Konflikte zwischen Reichen/Völkern
- Kreaturen: Einheimische Fauna, magische Wesen, legendäre Bestien
- Religion/Glaube: Götter, Kulte, spirituelle Praktiken
- Technologie/Magie-Verhältnis: Wie beeinflusst Magie den Alltag?`,

        narrativeElements: `ERZÄHLELEMENTE FÜR FANTASY:
- Heldenreise: Der Protagonist verlässt die gewohnte Welt
- Quest-Struktur: Klare Ziele, Hindernisse, Errungenschaften
- Prophezeiungen und Schicksal: Aber mit Interpretationsspielraum
- Artefakte und Machtgegenstände: Mit Geschichte und Bedeutung
- Verbündete und Verräter: Überraschende Allianzen
- Das Böse hat Gesichter: Nicht nur abstrakte Dunkelheit
- Wachstum durch Opfer: Der Held muss etwas aufgeben, um zu gewinnen`,

        styleGuidelines: `STIL-GUIDELINES FÜR FANTASY:
- Beschreibungen: Reich und atmosphärisch, aber nicht überladen
- Dialoge: Charaktere können je nach Kultur unterschiedlich sprechen
- Action: Dynamisch, aber mit emotionaler Tiefe
- Magie: Zeigen, nicht erzählen - wie fühlt sich Magie an?
- Weltenbau: Organisch einstreuen, nicht als Info-Dump
- Pacing: Wechsel zwischen Ruhe und Action, Erkundung und Gefahr`,

        typicalConflicts: `TÜPISCHE KONFLIKTE FÜR FANTASY:
- Pflicht vs. persönliches Glück
- Alte Magie vs. neue Ordnung
- Verschiedene Völker/Rassen mit historischen Spannungen
- Korruption durch Macht
- Prophezeiung erfüllen vs. freier Wille
- Bewahrung der Natur vs. Fortschritt
- Verlorene Artefakte und ihr Einfluss auf die Machtbalance`,

        dialogueStyle: `DIALOGSTIL FÜR FANTASY:
- Formaler Sprachgebrauch bei Adligen und Magiern
- Umgangssprache bei Händlern, Soldaten, Bauern
- Mythische/kulturelle Redewendungen
- Namen und Titel sind wichtig (Ehrennamen, Verwandtschaftstitel)
- Flüche und Schwüre haben Gewicht`,

        pacingNotes: `PACING FÜR FANTASY:
- Langsamer Beginn mit Weltenbau und Charakterentwicklung
- Steigende Spannung durch Quest-Fortschritt
- Ruhephasen zwischen Abenteuern für Charaktertiefe
- Finale mit hohem Einsatz und Auflösung aller Handlungsstränge`,
    },

    "science-fiction": {
        id: "science-fiction",
        name: "Science-Fiction",
        nameEn: "Science Fiction",
        characterTraits: `CHARAKTEREIGENSCHAFTEN FÜR SCI-FI:
- Wissenschaftler, Ingenieure, Soldaten, Diplomaten
- Cyborgs, KI-Wesen, Genetisch-veränderte
- Charaktere mit ethischen Dilemmata bezüglich Technologie
- Kulturelle Identität in einer globalisierten/galaktischen Gesellschaft
- Anpassungsfähigkeit an neue Umgebungen
- Vertrauen vs. Misstrauen gegenüber Technologie`,

        worldBuilding: `WELTENBAU FÜR SCI-FI:
- Technologieniveau: Welche Technologien existieren und wie wirken sie sich aus?
- Gesellschaftsstruktur: Klassen, Kasten, digitale Kluft
- Planeten/Kolonien: Welche Umgebungen gibt es?
- Raumfahrt: Hyperraum, Kryoschlaf, Generationenschiffe
- KI und Automatisierung: Wie weit ist die KI-Entwicklung?
- Biologie: Gentechnik, Lebensverlängerung, Hybridwesen
- Wirtschaft: Ressourcenknappheit, Handelsrouten, Monopole
- Kommunikation: Interstellare Kommunikation, VR/AR-Welten`,

        narrativeElements: `ERZÄHLELEMENTE FÜR SCI-FI:
- Erstkontakt: Begegnung mit außerirdischen Intelligenzen
- Technologische Singularität: KI übertrifft menschliche Intelligenz
- Zeitparadoxien: Reisen durch die Zeit und ihre Konsequenzen
- Überlebenskampf: Kolonisierung, Ressourcenknappheit, Katastrophen
- Ethische Dilemmata: Klonen, Gedankenkontrolle, Unsterblichkeit
- Gesellschaftskritik: Dystopien, Überwachung, soziale Kontrolle
- Evolution: Menschliche Enhancement, Posthumanismus`,

        styleGuidelines: `STIL-GUIDELINES FÜR SCI-FI:
- Technische Details: Präzise, aber nicht überwältigend
- Weltbeschreibungen: Fremdartig, aber nachvollziehbar
- Dialoge: Fachbegriffe natürlich einstreuen
- Atmosphäre: Klinisch, fremd oder vertraut je nach Setting
- Tempo: Oft schneller, actionorientierter
- Philosophische Fragen: Durch Handlung zeigen, nicht predigen`,

        typicalConflicts: `TÜPISCHE KONFLIKTE FÜR SCI-FI:
- Mensch vs. Maschine
- Individuum vs. System
- Ethik des Fortschritts
- Ressourcenkonflikte zwischen Planeten/Kolonien
- KI-Rechte und -Bewusstsein
- Biologische vs. technologische Evolution
- Isolation und Einsamkeit im Weltraum`,

        dialogueStyle: `DIALOGSTIL FÜR SCI-FI:
- Technische Präzision bei Wissenschaftlern
- Militärische Sprache bei Soldaten
- Jargon und Slang in Untergrundkulturen
- Formeller Ton bei diplomatischen Verhandlungen
- KI-Dialoge: Logisch, präzise, manchmal unheimlich`,

        pacingNotes: `PACING FÜR SCI-FI:
- Oft schneller Einstieg mit konfliktreicher Situation
- Technische Erklärungen in Aktion einbetten
- Spannung durch Unbekanntes und Gefahr
- Philosophische Momente zwischen Actionsequenzen`,
    },

    thriller: {
        id: "thriller",
        name: "Thriller",
        nameEn: "Thriller",
        characterTraits: `CHARAKTEREIGENSCHAFTEN FÜR THRILLER:
- Protagonist: Oft ein Ermittler, Journalist oder betroffener Laie
- Antagonist: Intelligent, manipulativ, oft unsichtbar bis zum Ende
- Vertrauenspersonen: Können Verbündete oder Verräter sein
- Zeugen: Jeder hat ein Geheimnis, nicht jeder sagt die Wahrheit
- Opfer: Nicht immer unschuldig
- Charaktere mit psychologischer Tiefe und Geheimnissen`,

        worldBuilding: `WELTENBAU FÜR THRILLER:
- Schauplätze: Orte mit Atmosphäre (Dunkelheit, Enge, Isolation)
- Institutionen: Polizei, Geheimdienste, korrupte Organisationen
- Medien: Nachrichten, Social Media als Werkzeug der Wahrheitsfindung
- Geographie: Orte der Gefahr, Verstecke, Fluchtrouten
- Zeitdruck: Deadlines, Fristen, Countdowns
- Überwachung: Kameras, digitale Fußspuren, Datenschutz`,

        narrativeElements: `ERZÄHLELEMENTE FÜR THRILLER:
- Cliffhanger: Jedes Kapitel endet mit Spannung
- Falsche Fährten: Der Leser wird bewusst in die Irre geführt
- Ticking Clock: Zeitdruck erhöht die Spannung
- Unzuverlässiger Erzähler: Perspektiven können täuschen
- Mysterium: Was ist wirklich passiert?
- Enthüllung: Schicht für Schicht wird die Wahrheit offenbart
- Moralische Grauzone: Gut und Böse sind nicht klar trennbar`,

        styleGuidelines: `STIL-GUIDELINES FÜR THRILLER:
- Kurze, prägnante Sätze in spannenden Momenten
- Atmosphärische Beschreibungen: Düster, bedrohlich
- Innere Monologe: Angst, Paranoia, Zweifel
- Tempo: Oft schnell, mit Pausen zur Entspannung
- Perspektivwechsel: Verschiedene Blickwinkel auf das Geschehen
- Dialoge: Subtext ist wichtiger als das Gesagte`,

        typicalConflicts: `TÜPISCHE KONFLIKTE FÜR THRILLER:
- Wahrheit vs. Täuschung
- Gerechtigkeit vs. Rache
- Vertrauen vs. Paranoia
- Individuum vs. überlegener Gegner
- Moralische Opfer für das "größere Gut"
- Vergangenheit holt die Gegenwart ein
- Systemische Korruption`,

        dialogueStyle: `DIALOGSTIL FÜR THRILLER:
- Knapp und präzise
- Subtext: Was nicht gesagt wird, ist wichtiger
- Verhöre: Psychologische Spielchen
- Drohungen: Versteckt oder offen
- Bekenntnisse: emotional und aufrichtig oder kalkuliert`,

        pacingNotes: `PACING FÜR THRILLER:
- Schneller Einstieg mit dem Verbrechen/der Bedrohung
- Steigende Spannung durch Ermittlungen
- Falsche Höhepunkte vor dem eigentlichen Finale
- Atemberaubendes Finale mit überraschender Wendung`,
    },

    krimi: {
        id: "krimi",
        name: "Krimi",
        nameEn: "Mystery/Crime",
        characterTraits: `CHARAKTEREIGENSCHAFTEN FÜR KRIMI:
- Ermittler: Detektiv, Kommissar, Privatdetektiv (mit Macken und Persönlichkeit)
- Verdächtige: Jeder hat Motiv, Mittel und Gelegenheit
- Zeugen: Unglaubwürdig, parteiisch oder gefährdet
- Täter: Intelligent, kalkulierend oder impulsiv
- Opfer: Nicht immer unschuldig, Vergangenheit spielt Rolle
- Helfer: Forensiker, Techniker, informelle Verbündete`,

        worldBuilding: `WELTENBAU FÜR KRIMI:
- Schauplatz: Stadt, Dorf, abgelegene Gegend - mit eigener Atmosphäre
- Polizeiarbeit: Realistische Ermittlungsmethoden
- Justizsystem: Wie funktioniert Strafverfolgung?
- Gesellschaftliche Schichten: Kriminalität in verschiedenen Milieus
- Lokale Farbe: Traditionen, Dialekte, regionale Besonderheiten
- Kriminalitätstypen: Mord, Betrug, Organisierte Kriminalität, Cybercrime`,

        narrativeElements: `ERZÄHLELEMENTE FÜR KRIMI:
- Mord/Rätsel: Der zentrale Fall muss fesselnd sein
- Hinweise: Fair dem Leser präsentieren, aber nicht offensichtlich
- Alibis: Wer lügt und warum?
- Motive: Eifersucht, Gier, Rache, Schutz
- Ermittlungsprozess: Schritt für Schritt zur Wahrheit
- Wendungen: Überraschende Erkenntnisse, die alles ändern
- Gerechtigkeit: Wie wird sie erreicht?`,

        styleGuidelines: `STIL-GUIDELINES FÜR KRIMI:
- Detektivarbeit logisch und nachvollziehbar
- Atmosphärische Beschreibungen der Schauplätze
- Dialoge: Verhöre, Befragungen, informelle Gespräche
- Innere Monologe des Ermittlers: Gedankengänge, Zweifel
- Tempo: Gemächliche Ermittlung bis zum dramatischen Finale
- Fairness: Alle Hinweise für den Leser zugänglich`,

        typicalConflicts: `TÜPISCHE KONFLIKTE FÜR KRIMI:
- Gerechtigkeit vs. Gesetz
- Wahrheit vs. Schutz von Unschuldigen
- Berufsethos vs. persönliche Betroffenheit
- Korruption in Institutionen
- Verjährte Verbrechen und alte Schuld
- Gesellschaftliche Vorurteile in der Ermittlung`,

        dialogueStyle: `DIALOGSTIL FÜR KRIMI:
- Verhöre: Professionell, aber mit psychologischem Druck
- Zeugenaussagen: Unvollständig, voreingenommen
- Ermittlergespräche: Kollegial oder konfliktreich
- Täterdialoge: Kalkuliert oder emotional
- Umgangssprache: Milieu-typisch`,

        pacingNotes: `PACING FÜR KRIMI:
- Exposition: Verbrechen und erste Eindrücke
- Ermittlung: Zeugenbefragungen, Spurensuche
- Wendungen: Neue Erkenntnisse, falsche Fährten
- Finale: Konfrontation mit dem Täter
- Auflösung: Wie wurde der Fall gelöst?`,
    },

    romanze: {
        id: "romanze",
        name: "Romanze",
        nameEn: "Romance",
        characterTraits: `CHARAKTEREIGENSCHAFTEN FÜR ROMANZE:
- Protagonisten: Sympathisch, aber mit inneren Barrieren
- Love Interest: Attraktiv, aber nicht perfekt
- Vertraute: Beste Freundin, Schwester, Kumpel für Rat
- Rivale: Eifersucht, Missverständnisse
- Ex-Partner: Vergangenheit beeinflusst Gegenwart
- Familie: Erwartungen, Traditionen, Konflikte
- Charakterentwicklung: Beide müssen wachsen, um zusammenzukommen`,

        worldBuilding: `WELTENBAU FÜR ROMANZE:
- Schauplätze: Romantische Orte, aber auch Konflikträume
- Soziales Umfeld: Familie, Freundeskreis, Arbeitsplatz
- Jahreszeiten/Stimmung: Spiegeln die emotionale Reise wider
- Kulturelle Kontexte: Traditionen, Erwartungen, Verbote
- Berufswelt: Karriere vs. Beziehung
- Alltag: Kleine Momente, die Nähe schaffen`,

        narrativeElements: `ERZÄHLELEMENTE FÜR ROMANZE:
- Erste Begegnung: Unvergesslich, oft konfliktreich
- Hindernisse: Äußere und innere Barrieren
- Spannung: Verlangen, das nicht sofort erfüllt wird
- Intimität: Emotionale und körperliche Nähe wächst
- Konflikt: Was die Liebenden trennt
- Versöhnung: Wie sie zueinanderfinden
- Happily Ever After (oder Happy For Now): Befriedigendes Ende`,

        styleGuidelines: `STIL-GUIDELINES FÜR ROMANZE:
- Emotional: Innere Monologe, Gefühle zeigen
- Sensorisch: Berührungen, Düfte, Geschmäcker beschreiben
- Dialoge: Charmant, witzig, verletzlich
- Spannung: Langsamer Aufbau, Momente der Sehnsucht
- Tempo: Langsamer, mit Fokus auf Charakterentwicklung
- Humor: Leichtfüßigkeit in ernsten Momenten`,

        typicalConflicts: `TÜPISCHE KONFLIKTE FÜR ROMANZE:
- Verschiedene Welten: Arme vs. Reiche, verschiedene Kulturen
- Beruf vs. Beziehung
- Vergangenheit: Alte Beziehungen, Traumata
- Familienwiderstand
- Missverständnisse und Geheimnisse
- Innere Barrieren: Selbstzweifel, Angst vor Verletzung
- Rivalen und Eifersucht`,

        dialogueStyle: `DIALOGSTIL FÜR ROMANZE:
- Charmant und witzig
- Verletzlich in intimen Momenten
- Flirtend mit Subtext
- Emotional ehrlich bei Konflikten
- Leichtfüßig im Alltag
- Tiefgründig bei wichtigen Gesprächen`,

        pacingNotes: `PACING FÜR ROMANZE:
- Langsamer Beginn mit Charakterentwicklung
- Steigende Spannung durch Hindernisse
- Intime Momente als Höhepunkte
- Konflikt als Tiefpunkt
- Versöhnung und glückliches Ende`,
    },

    horror: {
        id: "horror",
        name: "Horror",
        nameEn: "Horror",
        characterTraits: `CHARAKTEREIGENSCHAFTEN FÜR HORROR:
- Protagonisten: Oft "gewöhnliche" Menschen in außergewöhnlichen Situationen
- Skeptiker: Glauben nicht an das Übernatürliche (bis es zu spät ist)
- Opfer: Nicht alle überleben
- Antagonist: Übernatürlich, unerklärlich, unheimlich
- Verbündete: Sterben oft als Warnung
- Charaktere müssen mit Angst, Paranoia und Verzweiflung umgehen`,

        worldBuilding: `WELTENBAU FÜR HORROR:
- Schauplätze: Alte Häuser, abgelegene Orte, vertraute Umgebung mit Twist
- Atmosphäre: Bedrohlich, unheimlich, klaustrophobisch
- Übernatürliches: Regeln, Ursachen, Schwächen
- Geschichte: Was ist hier passiert? Warum ist es verflucht?
- Alltagswelt: Vertrautes wird fremd und bedrohlich
- Isolation: Hilfe ist weit weg oder unmöglich`,

        narrativeElements: `ERZÄHLELEMENTE FÜR HORROR:
- Langsamer Aufbau: Unheimliche Andeutungen vor dem Schock
- Täuschung: Was ist real, was Einbildung?
- Isolation: Kein Ausweg, keine Hilfe
- Eskalation: Die Bedrohung wächst
- Opfer: Wer überlebt und warum?
- Konfrontation: Face-to-face mit der Angst
- Überleben: Was hat es gekostet?`,

        styleGuidelines: `STIL-GUIDELINES FÜR HORROR:
- Atmosphärisch: Beschreibungen erzeugen Unbehagen
- Andeutungen: Was man nicht sieht, ist am unheimlichsten
- Tempo: Langsam aufbauen, dann schnell eskalieren
- Sensorisch: Geräusche, Gerüche, Kälte, Dunkelheit
- Innere Monologe: Angst, Verzweiflung, Paranoia
- Weniger ist mehr: Nicht alles erklären`,

        typicalConflicts: `TÜPISCHE KONFLIKTE FÜR HORROR:
- Mensch vs. Übernatürliches
- Verstand vs. Wahnsinn
- Glaube vs. Skepsis
- Gemeinschaft vs. Isolation
- Vergangenheit holt die Gegenwart ein
- Verbotenes Wissen und seine Konsequenzen
- Überleben vs. Moral`,

        dialogueStyle: `DIALOGSTIL FÜR HORROR:
- Verängstigt und atemlos
- Verzweifelte Versuche, rational zu bleiben
- Warnungen, die ignoriert werden
- Bekenntnisse in Todesangst
- Unheimliche Ruhe des Antagonisten
- Schreie, Flüstern, Stille`,

        pacingNotes: `PACING FÜR HORROR:
- Langsamer Beginn mit unheimlicher Atmosphäre
- Steigende Spannung durch Vorahnungen
- Schockmomente als Wendepunkte
- Pausen zwischen den Angriffen
- Finale: Konfrontation und (mögliche) Erlösung`,
    },

    drama: {
        id: "drama",
        name: "Drama",
        nameEn: "Drama",
        characterTraits: `CHARAKTEREIGENSCHAFTEN FÜR DRAMA:
- Tiefgründige Charaktere mit inneren Konflikten
- Beziehungen im Zentrum: Familie, Freunde, Liebhaber
- Moralische Dilemmata ohne einfache Lösungen
- Charakterentwicklung durch Konflikte
- Schwächen und Stärken gleichermaßen sichtbar
- Authentische menschliche Reaktionen`,

        worldBuilding: `WELTENBAU FÜR DRAMA:
- Realistische Umgebung mit sozialen Kontexten
- Generationenkonflikte und Familienstrukturen
- Gesellschaftliche Erwartungen und Druck
- Arbeitswelt und ihre Herausforderungen
- Kulturelle/geografische Prägung der Charaktere
- Zeitgeist und historischer Kontext`,

        narrativeElements: `ERZÄHLELEMENTE FÜR DRAMA:
- Konflikt: Zwischen Menschen, zwischen Mensch und Gesellschaft
- Beziehungen: Liebe, Freundschaft, Familie - ihre Höhen und Tiefen
- Verlust: Tod, Trennung, verlorene Träume
- Versöhnung: Vergebung, Annahme, Neuanfang
- Wahrheit: Enthüllungen, die alles verändern
- Wachstum: Charaktere lernen und verändern sich`,

        styleGuidelines: `STIL-GUIDELINES FÜR DRAMA:
- Emotional: Echte Gefühle, nicht melodramatisch
- Dialoggetrieben: Gespräche tragen die Handlung
- Subtext: Was nicht gesagt wird, ist wichtig
- Tempo: Gemächlich, mit Fokus auf Charaktere
- Realismus: Nachvollziehbare Reaktionen und Entscheidungen
- Respekt: Auch schwierige Themen würdevoll behandeln`,

        typicalConflicts: `TÜPISCHE KONFLIKTE FÜR DRAMA:
- Familie: Erwartungen vs. eigene Wünsche
- Liebe: Verlangen vs. Verpflichtung
- Gesellschaft: Individuum vs. Norm
- Vergangenheit: Traumata und alte Wunden
- Identität: Wer bin ich wirklich?
- Verlust: Abschied und Neuanfang
- Wahrheit: Ehrlichkeit vs. Schutz`,

        dialogueStyle: `DIALOGSTIL FÜR DRAMA:
- Natürlich und authentisch
- Emotional in Konflikten
- Schweigsam, wenn Worte nicht reichen
- Konfrontativ, aber respektvulk
- Verletzlich in intimen Momenten
- Humorvoll inmitten des Ernstes`,

        pacingNotes: `PACING FÜR DRAMA:
- Langsamer Beginn mit Charakterentwicklung
- Konflikte eskalieren schrittweise
- Emotionale Höhepunkte und Tiefpunkte
- Reflexionsphasen zwischen den Konflikten
- Befriedigende Auflösung (nicht unbedingt glücklich)`,
    },

    abenteuer: {
        id: "abenteuer",
        name: "Abenteuer",
        nameEn: "Adventure",
        characterTraits: `CHARAKTEREIGENSCHAFTEN FÜR ABENTEUER:
- Helden: Mutig, impulsiv, loyal
- Sidekicks: Kompetent, humorvoll, loyal
- Antagonisten: Machtgierig, skrupellos
- Mentoren: Weise, aber nicht allwissend
- Verbündete: Überraschende Hilfe aus unerwarteten Quellen
- Charaktere müssen unter Druck wachsen`,

        worldBuilding: `WELTENBAU FÜR ABENTEUER:
- Exotische Schauplätze: Dschungel, Wüsten, Berge, Ozeane
- Gefahren: Natürliche und menschengemachte Hindernisse
- Schätze: Artefakte, Schätze, verlorene Städte
- Transport: Schiffe, Flugzeuge, Reittiere, zu Fuß
- Kulturen: Fremde Völker mit eigenen Traditionen
- Geheimnisse: Verborgene Orte, uralte Rätsel`,

        narrativeElements: `ERZÄHLELEMENTE FÜR ABENTEUER:
- Quest: Klare Mission mit Hindernissen
- Gefahren: Körperliche Bedrohungen und Überlebenskämpfe
- Entdeckungen: Neue Orte, Kulturen, Geheimnisse
- Teamwork: Verschiedene Fähigkeiten kommen zusammen
- Wagnis: Risiken eingehen für das Ziel
- Triumph: Erfolg nach harter Arbeit`,

        styleGuidelines: `STIL-GUIDELINES FÜR ABENTEUER:
- Actionreich: Dynamische Beschreibungen
- Tempo: Schnell und mitreißend
- Beschreibungen: Exotisch und lebendig
- Dialoge: Witzig, mutig, unter Druck
- Spannung: Gefahr und Rettung im Wechsel
- Spaß: Unterhaltung steht im Vordergrund`,

        typicalConflicts: `TÜPISCHE KONFLIKTE FÜR ABENTEUER:
- Mensch vs. Natur
- Helden vs. Schurken
- Team interne Konflikte
- Zeitdruck: Deadline einhalten
- Moralische Entscheidungen unter Druck
- Überlebenskämpfe`,

        dialogueStyle: `DIALOGSTIL FÜR ABENTEUER:
- Mutig und selbstbewusst
- Humorvoll unter Druck
- Kommandos in Gefahrensituationen
- Vertraulich im Team
- Respektvoll gegenüber Verbündeten
- Herausfordernd gegenüber Feinden`,

        pacingNotes: `PACING FÜR ABENTEUER:
- Schneller Einstieg mit Auslöser
- Nicht-stop Action mit kurzen Ruhephasen
- Steigende Gefahren
- Finale mit höchstem Einsatz
- Zufriedenstellendes Ende`,
    },

    historisch: {
        id: "historisch",
        name: "Historisch",
        nameEn: "Historical",
        characterTraits: `CHARAKTEREIGENSCHAFTEN FÜR HISTORISCH:
- Charaktere in ihrem historischen Kontext denken und handeln
- Gesellschaftliche Rollen: Adel, Bürger, Bauern, Klerus
- Eingeschränkte Möglichkeiten je nach Stand und Geschlecht
- Historische Persönlichkeiten als Vorbilder oder Gegner
- Traditionen und Pflichten prägen die Charaktere
- Moderne Werte nicht rückprojizieren`,

        worldBuilding: `WELTENBAU FÜR HISTORISCH:
- Epoche: Mittelalter, Renaissance, Aufklärung, Industrialisierung, etc.
- Politische Landschaft: Reiche, Kriege, Allianzen
- Gesellschaft: Stände, Hierarchien, Aufstiegsmöglichkeiten
- Wirtschaft: Handwerker, Händler, Landwirtschaft
- Religion: Kirche, Aberglaube, religiöse Konflikte
- Alltag: Kleidung, Essen, Wohnen, Arbeit
- Technologie: Was war möglich, was nicht?`,

        narrativeElements: `ERZÄHLELEMENTE FÜR HISTORISCH:
- Historische Ereignisse als Hintergrund
- Gesellschaftliche Veränderungen erleben
- Kriege und Konflikte hautnah miterleben
- Intrigen am Hof oder in der Politik
- Alltagsleben authentisch darstellen
- Historische Persönlichkeiten einbeziehen`,

        styleGuidelines: `STIL-GUIDELINES FÜR HISTORISCH:
- Authentizität: Historische Details korrekt
- Sprache: Angemessen für die Epoche (aber lesbar)
- Beschreibungen: Kleidung, Architektur, Lebensweise
- Dialoge: Formal oder informell je nach Stand
- Tempo: Oft gemächlicher als moderne Geschichten
- Respekt: Historische Themen sensibel behandeln`,

        typicalConflicts: `TÜPISCHE KONFLIKTE FÜR HISTORISCH:
- Pflicht vs. persönliches Glück
- Standesgrenzen überwinden
- Kriege und politische Intrigen
- Religiöse Konflikte
- Modernes Denken vs. alte Ordnung
- Historische Umwälzungen`,

        dialogueStyle: `DIALOGSTIL FÜR HISTORISCH:
- Formal bei Hofe oder unter Adligen
- Umgangssprache beim einfachen Volk
- Religiöse Sprache im kirchlichen Kontext
- Militärische Sprache bei Soldaten
- Handwerkerjargon bei Berufen
- Titel und Anreden beachten`,

        pacingNotes: `PACING FÜR HISTORISCH:
- Langsamer Beginn mit Weltenbau
- Gemächliche Charakterentwicklung
- Historische Ereignisse als Wendepunkte
- Episches Finale bei großen Schlachten
- Inklusives Ende mit historischer Einordnung`,
    },

    mystery: {
        id: "mystery",
        name: "Mystery",
        nameEn: "Mystery",
        characterTraits: `CHARAKTEREIGENSCHAFTEN FÜR MYSTERY:
- Detektiv: Scharfsinnig, eigenwillig, mit besonderen Fähigkeiten
- Verdächtige: Jeder hat Geheimnisse
- Zeugen: Unglaubwürdig oder gefährdet
- Helfer: Kompetent, loyal, aber nicht allwissend
- Täter: Intelligent, kalkulierend
- Charaktere mit psychologischer Tiefe`,

        worldBuilding: `WELTENBAU FÜR MYSTERY:
- Schauplätze: Abgeschlossene Räume, vertraute Orte mit Geheimnissen
- Atmosphäre: Düster, rätselhaft, unheimlich
- Institutionen: Polizei, Detektei, Gericht
- Gesellschaft: Verschiedene Schichten mit Konflikten
- Geheimnisse: Jeder Ort hat eine Geschichte
- Hinweise: Überall, aber nicht offensichtlich`,

        narrativeElements: `ERZÄHLELEMENTE FÜR MYSTERY:
- Das Rätsel: Was ist passiert? Wer? Warum? Wie?
- Hinweise: Fair präsentiert, aber nicht offensichtlich
- Falsche Fährten: Der Leser wird in die Irregeführt
- Ermittlung: Schritt für Schritt zur Wahrheit
- Wendungen: Überraschende Erkenntnisse
- Auflösung: Logisch und befriedigend`,

        styleGuidelines: `STIL-GUIDELINES FÜR MYSTERY:
- Logisch: Jeder Hinweis muss Sinn ergeben
- Atmosphärisch: Beschreibungen erzeugen Spannung
- Fair: Alle Hinweise für den Leser zugänglich
- Tempo: Gemächliche Ermittlung bis zum dramatischen Finale
- Innere Monologe: Detektivs Gedankengänge
- Präzise: Details sind wichtig`,

        typicalConflicts: `TÜPISCHE KONFLIKTE FÜR MYSTERY:
- Wahrheit vs. Täuschung
- Gerechtigkeit vs. Gesetz
- Detektiv vs. Täter (Duell der Intelligenzen)
- Verdacht vs. Vertrauen
- Vergangenheit vs. Gegenwart
- Moralische Grauzone`,

        dialogueStyle: `DIALOGSTIL FÜR MYSTERY:
- Verhöre: Psychologisch, strategisch
- Hinweise: Versteckt in scheinbar belanglosen Gesprächen
- Verdächtige: Ausweichend, nervös, kalkuliert
- Detektiv: Scharfsinnig, manchmal arrogant
- Zeugen: Unvollständig, voreingenommen`,

        pacingNotes: `PACING FÜR MYSTERY:
- Langsamer Beginn mit dem Verbrechen
- Ermittlung: Schritt für Schritt
- Wendungen: Neue Erkenntnisse
- Finale: Enthüllung und Konfrontation
- Auflösung: Logische Erklärung`,
    },
};

/**
 * Gibt die Genre-Konfiguration für ein gegebenes Genre zurück.
 * Versucht eine flexible Erkennung (z.B. "sci-fi" -> "science-fiction").
 */
export function getGenreConfig(genre: string | null | undefined): GenreConfig | null {
    if (!genre) return null;

    const normalizedGenre = genre.toLowerCase().trim();

    // Direkter Match
    if (GENRE_CONFIGS[normalizedGenre]) {
        return GENRE_CONFIGS[normalizedGenre];
    }

    // Flexible Erkennung
    const genreMappings: Record<string, string> = {
        "sci-fi": "science-fiction",
        "scifi": "science-fiction",
        "sf": "science-fiction",
        "krimi": "krimi",
        "crime": "krimi",
        "detektiv": "krimi",
        "romanze": "romanze",
        "romance": "romanze",
        "liebesroman": "romanze",
        "horror": "horror",
        "grusel": "horror",
        "drama": "drama",
        "abenteuer": "abenteuer",
        "adventure": "abenteuer",
        "historisch": "historisch",
        "historical": "historisch",
        "mystery": "mystery",
        "rätsel": "mystery",
        "thriller": "thriller",
    };

    for (const [key, value] of Object.entries(genreMappings)) {
        if (normalizedGenre.includes(key)) {
            return GENRE_CONFIGS[value];
        }
    }

    return null;
}

/**
 * Erstellt genre-spezifische Anweisungen für den System-Prompt
 */
export function buildGenreInstructions(genre: string | null | undefined): string {
    const config = getGenreConfig(genre);
    if (!config) return "";

    return `

## Genre-spezifische Anweisungen: ${config.name}

${config.characterTraits}

${config.worldBuilding}

${config.narrativeElements}

${config.styleGuidelines}

${config.typicalConflicts}

${config.dialogueStyle}

${config.pacingNotes}`;
}

/**
 * Erstellt eine kurze Genre-Zusammenfassung für den System-Prompt
 */
export function buildGenreSummary(genre: string | null | undefined): string {
    const config = getGenreConfig(genre);
    if (!config) return "";

    return `Genre: ${config.name}. Beachte die genre-spezifischen Konventionen für ${config.name}-Geschichten.`;
}
