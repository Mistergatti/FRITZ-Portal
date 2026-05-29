# Changelog

## 1.4.4

- Neu (HA-Sensoren, Statistik-tauglich): Den REST-API-Sensoren (`sensor.fritzportal_cpu`, `…_ram`, `…_temperature`, `…_online_devices`, `…_free_ips`, `…_download_speed`, `…_upload_speed` sowie sämtliche `…_traffic_<periode>_received/sent`) fehlte bisher die `state_class`. HA hat die Werte zwar dargestellt, aber nicht in die Langzeit-Statistik aufgenommen – damit konnten sie nicht im **Statistik-Diagramm** verwendet werden. Die System-/Rate-Sensoren bekommen jetzt `state_class: measurement`, die Traffic-Zähler `state_class: total` (passend zu den MQTT-Discovery-Sensoren). Forums-Wunsch (Beitrag von Mai 2026): Volumen-Sensoren als Statistik-Diagramm darstellbar machen.
- Fix (HA-Sensoren, stabile Einheit für Traffic): Die REST-API-Traffic-Sensoren wechselten je nach Volumen dynamisch zwischen `MB` und `GB` – HA Long-Term-Statistik verträgt aber keinen Unit-Wechsel über die Zeit (sonst werden Datenpunkte verworfen oder die Statistik bricht ab). Die Sensoren publishen jetzt durchgängig in **GB** (3 Nachkommastellen). Hintergrund: in Statistik-Diagrammen lässt sich die Y-Achseneinheit nicht ändern, GB ist für Tages-/Wochen-/Monatsvolumen die übersichtlichere Wahl.
- Fix (#?, Live-Down-/Upload bleibt 0 auf Cable-/5G-Boxen wie 6660/6690/**6860 5G**): Die Live-Rate auf dem Dashboard (`Internet upstream/downstream`) blieb bei manchen Boxen dauerhaft auf 0, weil weder `data.lua?page=netMon → sync_groups` (DSL-spezifisch, auf 5G/Cable nicht befüllt) noch `GetAddonInfos → NewByteReceiveRate/NewByteSendRate` (auf einigen Cable-Firmwares 0) etwas liefern. Als dritte Stufe leiten wir die Rate jetzt aus dem Delta der monoton steigenden `NewX_AVM_DE_TotalBytesReceived64`/`…Sent64`-Counter zwischen zwei Collector-Ticks (30 s) ab; die Logik liegt sowohl im Hintergrund-Collector als auch im On-Demand-Pfad `/api/fritz/network-stats`. Cache-Read-TTL für `network-stats` auf 35 s angehoben (passend zum Collector-Intervall), damit Browser-Polls dazwischen nicht die Box neu treffen.
- Fix (Supervisor-Deprecation-Warnung `arch uses deprecated values ['armhf']`): Die HA-Supervisor-App-Validierung warnt seit kurzem für jedes Add-on, das in `config.yaml` noch `armhf` listet – die alte 32-Bit-ARM-Hardfloat-Architektur (Raspberry Pi 1/Zero) wird aufgegeben. Wir bauen das Add-on im GitHub-Workflow ohnehin nur für `linux/amd64,linux/arm64,linux/arm/v7`, daher haben wir `armhf` aus `config.yaml` und `build.yaml` entfernt und stattdessen `armv7` (modernes 32-Bit-ARM, deckt z. B. RPi 2/3 im 32-Bit-Modus ab) ergänzt. Die Warnung im Supervisor-Log verschwindet damit ohne Funktionsverlust für reale Installationen.

## 1.4.3

- Neu (Netzwerk → WLAN, Gastzugang an/aus): Jede WLAN-Karte hat jetzt direkt neben dem `Aktiv`/`Inaktiv`-Status einen klickbaren Toggle-Switch. Damit kann der WLAN-Gastzugang (und bei Bedarf auch die Haupt-WLANs) ohne Umweg über die FRITZ!Box-Web-UI ein- und ausgeschaltet werden. Backend nutzt TR-064 `WLANConfiguration:N#SetEnable`; das UI macht ein optimistisches Update und rollt bei API-Fehler den Schalter zurück. Cache wird invalidiert, sodass die nächste Statusabfrage den realen Zustand der Box liefert.
- Fix (#30, deutsche Übersetzung „Verschlüsselung"): Auf der WLAN-Seite stand wörtlich `Verschlüsselung` im Frontend, weil das Label nicht durch i18n lief und der Unicode-Escape als String stehen blieb. Jetzt korrekt als `Verschlüsselung` über `t()` ausgegeben.
- Fix (Telefonie / SmartHome – strikte Trennung der Rubriken): Auf der Telefonie-Seite landeten weiterhin DECT-Aktoren (DECT 200, DECT 301, Comet DECT, RolloTron DECT …), obwohl der AHA-Cross-Reference-Filter aus v1.4.2 bereits aktiv war. Ursache: Namensabweichungen zwischen DECT- und AHA-Liste sowie HAN-FUN-Aktoren, die manche Firmwares gar nicht in AHA listen, glitten durch.
  - Neuer Helper `fetchDectClassification(session)` zieht **data.lua?page=dect** und trennt explizit `handsets`/`mobiles` (= echte Telefone, Whitelist) von `devices` (= DECT-Aktoren, zusätzliche Blacklist). 60 s gecacht.
  - `/api/fritz/dect` kombiniert jetzt drei Signale: (1) data.lua-Handsets-Whitelist (override), (2) AHA-SmartHome-Namen + data.lua-actors-Blacklist, (3) `looksLikePhone()`-Heuristik. Ergebnis: auf der Telefonie-Seite wird ein DECT-Eintrag *nur dann* angezeigt, wenn er explizit als Telefon klassifiziert ist.
  - Strengere Namens-Normalisierung `normDectName()`: lowercase + NFD-Akzent-Strip (`ä→a`, `ß→ss`) + alnum-only. Damit matcht „Comet DECT-Bad" zwischen DECT und AHA auch dann noch, wenn der Nutzer den Namen in einer Quelle anders geschrieben hat.
  - `/api/fritz/smartHome` nutzt umgekehrt dieselbe data.lua-Handsets-Whitelist – Telefone fliegen aus der SmartHome-Anzeige, auch wenn `looksLikePhone()` sie verfehlt.
  - data.lua-Fallback in `/api/fritz/dect` mischt nicht mehr `devices` mit `handsets`/`mobiles` zusammen, sondern nimmt nur noch Handset-Listen als Telefone.
- Fix (#28, Sonderzeichen in der Anrufliste): `&`, Umlaute und andere HTML-Entities (`&amp;`, `&auml;`, `&#252;` …) in `<Name>` / `<Caller>` / `<Called>` / `<Device>` aus der FRITZ-Call-XML wurden 1:1 ans Frontend durchgereicht. Auf `/api/fritz/calls` wird jetzt der gleiche `decodeXmlEntities`-Helper angewandt, den seit v1.4.1 auch die WLAN-Werte verwenden.
- Verbessert (#20, Mesh-Topologie auf 6690/6860 5G & weiteren Boxen): Die Phase-1-Endpunkte (`meshlist.lua` / `internet/meshlist.lua` / `net/mesh_overview.lua`) und Phase-2-data.lua-Seiten teilen sich jetzt einen gemeinsamen `extractMeshFromJson`-Parser, der die Topologie auch unter `data.topology.nodes`, `data.mesh.nodes`, `meshlist.nodes` usw. findet. Vorher erkannte `tryUrl()` nur `raw.meshlist.nodes` / `raw.nodes` und verwarf JSON-Antworten von `mesh_overview.lua` (das 6690/6860 ausliefert) als leer – die Folge war der Fallback auf die reine Host-Liste statt der echten Mesh-Topologie. Zusätzlich: Bei Status 200 ohne extrahierbare Topologie wird jetzt der Set der obersten JSON-Keys ins Log geschrieben (`Mesh: page=… extract leer (top=[…] data=[…])`) – das macht das Hinzufügen weiterer Box-Formate ohne Sniffing möglich.
- Dokumentation (README): Features-Tabelle in `README.md` und `README_eng.md` um die seit v1.3.9 hinzugekommenen Bereiche ergänzt.

## 1.4.2

- Fix (Telefonie / SmartHome – saubere Trennung): Im Telefonie‑Tab erschienen bisher auch DECT‑Aktoren (FRITZ!DECT 200 Schaltsteckdosen, DECT 301 Heizkörperregler, Comet DECT, RolloTron DECT …), weil `Hosts:1#GetGenericDectEntry` schlicht **alle** DECT‑registrierten Geräte zurückgibt. Der `/api/fritz/dect`‑Endpoint quervergleicht die SOAP‑Liste jetzt mit der AHA‑SmartHome‑Liste (autoritative Quelle für Smart‑Home‑Aktoren) und filtert übereinstimmende Namen raus – im Telefonie‑Tab landen so wirklich nur noch Telefone. Auf der SmartHome‑Seite wird umgekehrt eine defensive `looksLikePhone`‑Heuristik (productname `FRITZ!Fon …`, Name‑Token `Mobilteil`/`Handset`/`MT-D`/…, nur HAN‑FUN‑Bit ohne Smart‑Home‑Bits) angewandt, falls ein Firmware‑data.lua‑Fallback Telefone in der SmartHome‑Liste mitliefern sollte.
- Fix (HA Fritz!SmartHome‑Integration entlasten): Anwender berichteten, dass die HA‑interne **Fritz!Smarthome**‑Integration nicht mehr funktioniert, sobald das FRITZ!Portal‑Add‑on läuft. Ursache: das Add‑on hielt die `AUTO_SID`‑Session und pollte alle 30 s `data.lua?page=netMon` plus Eco‑History – auch dann, wenn niemand das Portal aktuell im Browser geöffnet hatte. Der HA‑Integration ging dabei reproduzierbar Session‑/Rate‑Quote auf der FRITZ!Box verloren. Zwei Maßnahmen:
  1. **Idle‑Detection** im 30 s‑Background‑Collector: Sessions, deren letzter API‑Call > 5 min zurückliegt UND `keep_session_alive=false` (Default), werden übersprungen. Eine express‑Middleware aktualisiert `session.lastUsed` automatisch bei jedem `/api`‑Call. Folge: sobald der Browser‑Tab zu ist, hört das Add‑on innerhalb von ≤ 5 min auf, gegen die FRITZ!Box zu pollen – HA bekommt seine Slots zurück. Beim nächsten Portal‑Aufruf bumpt der erste Request `lastUsed`, der Collector ist sofort wieder aktiv.
  2. **Server‑Cache für `/api/fritz/smartHome`**: 60 s TTL. Pro AHA‑XML‑Aufruf an `homeautoswitch.lua?switchcmd=getdevicelistinfos` darf jetzt max. 1× pro Minute hits werden, statt bei jedem Page‑Visit – das ist genau der Endpoint, mit dem HA's Fritz!SmartHome‑Integration ebenfalls arbeitet. Der DECT‑Filter (s.o.) nutzt denselben Cache, doppelte AHA‑Treffer entfallen.
  Wer dauerhafte HA‑Sensor‑Updates braucht, kann `keep_session_alive` weiterhin in der System‑Page einschalten – dann pollt das Add‑on bewusst weiter und muss sich Slots mit der Fritz‑Integration teilen.
- Neu (Geräte entfernen): Auf der Geräte‑Seite können Offline‑Geräte jetzt direkt aus der FRITZ!Box‑Hostliste gelöscht werden – z. B. um Altlasten von ehemaligen Gästen oder ausgetauschten Geräten loszuwerden. Zwei Wege: kleines `×` rechts neben jeder Offline‑Zeile in der Liste (für schnelles Bulk‑Aufräumen) und ein dedizierter `Gerät entfernen`‑Button am Ende der Detail‑Seite. Online‑Geräte werden bewusst ausgegraut bzw. abgelehnt, weil die FRITZ!Box ihre Löschung verweigert. Backend: neuer `DELETE /api/fritz/device`‑Endpoint nutzt primär TR‑064 `Hosts:1#X_AVM-DE_DeleteHost` und fällt bei nicht unterstützten Firmwares auf `data.lua?page=netDev&dev=…&btn_del=` zurück. Hosts‑/netDev‑Cache wird nach erfolgreichem Löschen sofort invalidiert.
- Fix (Layout, Footer am unteren Bildschirmrand): Die Command‑Hint‑Bar (`$ ready / ↑↓ navigate …`) saß durch eine harte `min-height: calc(100vh - 85px - 38px)` auf `.main-content` immer ein Stück unterhalb des Folds – man musste 30–40 px scrollen, um sie zu sehen. Krücke entfernt; das `.app`‑Flex‑Layout (`min-height: 100vh`, `.main-content { flex: 1 }`) sorgt jetzt von selbst dafür, dass kurze Seiten den Footer sauber an der Viewport‑Unterkante andocken.
- Neu (Typografie, TerminalPanel‑Footer): `.tpanel-foot` von 11 px auf **14 px** vergrößert – die `MONTH ↓ … ── ↑ …` / `SAMPLE 30s ── N PTS`‑Zeile am unteren Rand des `TRAFFIC.LIVE`‑Panels war im Mono‑Font kaum lesbar.
- Fix (FritzBox‑CPU‑Last): Der Background‑Collector im Server‑Prozess pollte alle **15 s** Netz‑Throughput (`data.lua?page=netMon`) und Eco‑History – das verursachte spürbar messbare CPU‑Auslastung auf der FRITZ!Box (besonders auf der 7530er). Tick auf **30 s** halbiert; das Dashboard‑Live‑Polling wurde im selben Schritt von 15 s auf 30 s gestellt (Chart‑Footer zeigt jetzt `SAMPLE 30s`). Das 60‑Punkte‑Fenster decken damit 30 min statt 15 min Verlauf ab – eher ein Plus.
- Neu (Mesh, Cache‑first): Beim Wechsel zwischen anderen Seiten und „Netzwerk" verschwand die Mesh‑Topologie, bis der Refresh (auf manchen Boxen 1–2 min) durchgelaufen war. Jetzt bleibt die zuletzt geladene Mesh‑Ansicht direkt sichtbar (`getApiCache('network-mesh')`); der Refresh läuft transparent im Hintergrund und überschreibt erst, wenn die neuen Daten da sind. Spinner zeigen wir nur noch beim ersten Aufruf, wenn überhaupt kein Cache existiert.
- Fix (StatusLine, LOAD entfernt → Footer): `LAST 0.49 / 0.49 / 0.49` in der Statusleiste war kryptisch. Die Werte (1‑/5‑/15‑min‑CPU‑Mittel der FRITZ!Box) sind jetzt rechts in der Command‑Hint‑Bar als `CPU AVG 1m·5m·15m: …` mit Tooltip‑Erklärung gelandet. Im Gegenzug entfällt der bisherige `theme: SLATE`‑Slot – das Theme wird über den `◐ DARK/LIGHT`‑Toggle im Header eindeutig kommuniziert.
- Neu (Header‑Logo, größer): `header-logo` jetzt **75 px** hoch (vorher 35 px), Header‑Höhe entsprechend auf 85 px ausgedehnt; `main-content`‑Min‑Height und sticky `top` der StatusLine mitgezogen. Mobile (< 768 px): 56 px Logo bei 70 px Header.
- Fix (System‑Page, „Sitzung dauerhaft aktiv halten" default OFF): Der in 1.4.2 neu eingeführte Toggle war auf `true` defaulted. Da die Option zusätzliches Hintergrund‑Polling der FRITZ!Box bedeutet, ist sie jetzt **standardmäßig deaktiviert** – Anwender, die durchgehende HA‑Sensor‑Updates brauchen, schalten sie bewusst per Toggle (oder Add‑on‑Konfig `keep_session_alive: true`) ein. `config.yaml` und Server‑Default (`KEEP_SESSION_ALIVE === 'true'`) entsprechend gesetzt.
- Neu (Dashboard): `THROUGHPUT.LIVE`‑Panel umbenannt in **`TRAFFIC.LIVE`**. Funktion und Footer (MONTH ↓/↑, SAMPLE 30 s) unverändert.
- Neu (Dashboard, HOSTS.ACTIVE): Liste sortiert jetzt nach **Last‑Activity** (zuletzt gesehen zuerst) – vorher war die Reihenfolge willkürlich. Der `↑↓ SORT`‑Knopf rechts im Panel‑Header ist nun ein echter Button und schaltet zyklisch zwischen `BY ACTIVITY`, `BY IP` (numerisch) und `BY NAME` (alphabetisch) um; der gewählte Modus steht direkt neben den Pfeilen.
- Fix (DeviceDetail‑Ladezeit): Der Wechsel von der Geräte‑Liste in die Detail‑Ansicht dauerte 5–10 s, obwohl die Daten im Cache lagen. Drei Ursachen:
  1. Frontend hat `/api/fritz/hosts` synchron geholt, obwohl der Cache durch die gerade verlassene Geräte‑Liste warm war – die Detail‑Page hängt jetzt direkt am In‑Memory‑Cache (`getApiCache('hosts')`) und rendert sofort.
  2. `/api/fritz/device/blockstate` rief intern `getHostsViaSoap()` auf, was bei 70+ Geräten ~70 SOAP‑Requests in 8er‑Batches = ~5 s erzeugt hat, nur um die IP zu einem MAC zu finden. Der Endpoint liest nun erst den Server‑Cache (`getCached('hosts', 60s)`) und akzeptiert zusätzlich einen `&ip=`‑Query‑Param; den schickt das Frontend direkt aus dem schon bekannten Host‑Datensatz mit. Der SOAP‑Sweep bleibt als Fallback, wird in der Praxis aber praktisch nie ausgelöst.
  3. Block‑Status und DHCP‑Reservierung wurden seriell mit `await` geladen – jetzt laufen beide parallel im Hintergrund und blocken die UI nicht mehr. Klick auf Gerät → Detail‑Seite ist quasi instant.
- Neu (Header‑Logo): Die blaue Gradient‑`F!`‑Box plus zweite `fritz!portal`‑Wordmark im Header sind durch das Bildlogo `src/logo.png` (35 px hoch, 30 px auf Mobile) ersetzt. Der Versions‑Chip rechts daneben bleibt – das Logo enthält den Schriftzug schon.
- Fix (Seitenladezeit, Cache‑first auf allen Hauptseiten): Geräte, Netzwerk, Telefonie und SmartHome haben jetzt denselben Cache‑first‑Pfad wie das Dashboard – beim Wechsel zwischen Seiten wird sofort der zuletzt bekannte Stand gerendert, Live‑Daten fließen im Hintergrund nach. Dashboard‑Spinner wird ausgeblendet sobald *irgendein* gecachter Wert vorliegt (vorher erforderte er `device-info` *und* `hosts`); DeviceList ruft `setLoading(false)` direkt beim Cache‑Hit auf, nicht erst nach dem Fresh‑Fetch.
- Fix (Telefonie‑Performance): `/api/fritz/dect` und `/api/fritz/calls` haben jetzt jeweils 60 s Server‑Cache. Der SOAP‑Sweep über alle DECT‑Handsets und der Anrufliste‑XML‑Download (auf manchen Fritz!Boxen >5 s) treffen nur noch beim ersten Besuch pro Minute – Folgenavigationen sind quasi instant.
- Fix (BUG‑05, DECT): Handsets wurden trotz Registrierung wieder mit grauem Offline‑Punkt angezeigt, sobald die Firmware weder `NewActive=1` noch einen Akkustand zurücklieferte (ältere 7530er liefern keinen Battery‑Wert im SOAP‑Pfad). Der Status‑Punkt richtet sich jetzt allein nach `registered` – sobald das Handset in der Box‑Konfiguration steht, ist der Punkt grün. Nur tatsächlich abgemeldete Geräte zeigen den Offline‑Punkt. Das Label („Im Gespräch / Aktiv / Standby / Abgemeldet") bleibt wie in 1.4.0.
- Fix (StatusLine WAN): Hinter `WAN` im sticky Statusbalken unter dem Header blieb das Feld leer. `/api/fritz/device-info` liefert `NewExternalIPAddress` firmware‑abhängig praktisch nie mit; der `App.tsx`‑Loader holt jetzt zusätzlich `/api/fritz/network/wan` (alle 120 s, parallel zum bestehenden Info‑Poll) und übernimmt die externe IP von dort.
- Neu (System‑Page, Keep‑Session‑Alive): Neuer Toggle „**Sitzung dauerhaft aktiv halten**" in der HA‑Sensoren‑Sektion (default: **an**). Bei aktivierter Option wird die FRITZ!Box‑Verbindung bereits beim Add‑on‑Start aufgebaut (statt erst bei der ersten Browser‑Anfrage an `/api/fritz/auto-session`) und alle 60 s automatisch wiederhergestellt, falls sie verloren geht. Damit aktualisiert der 15‑s‑Background‑Collector die `eco-stats`/`network-stats`/`hosts`‑Caches und somit auch alle HA‑Sensoren *durchgehend*, ohne dass das Portal jemals im Browser geöffnet sein muss. Persistiert in `/data/fritz-portal.json`, gespiegelt in die Add‑on‑Konfiguration (`config.yaml` → neue Option `keep_session_alive: true`).
- Fix (System‑Page Versionsanzeige): „FRITZ!Portal v1.4.0" in der Tabelle der Systeminformationen war hartcodiert und wurde beim Versionssprung nicht mitgezogen – jetzt auf 1.4.2 aktualisiert.
- Neu (UI, Redesign): Komplettes visuelles Refresh auf das **TERMINAL.OS**-Design (Slate · Blue) – dichtes, technisches CLI/Hacker-Layout. Harte 1‑px‑Linien statt weicher Schatten, fast quadratische Ecken (3 px) statt 12 px, 3‑px‑Corner‑Ticks (`┌ ┐ └ ┘`) auf jeder Stat‑Kachel, ASCII‑Ornamentik (`┃`, `──`, `●`, `▰`) sparsam als Strukturhilfe.
- Neu (Typografie): JetBrains Mono für alle Daten/Labels, Inter Tight für Hauptnavigation und Headlines – per `<link>` im `index.html` von Google Fonts eingebunden; Fallback auf IBM Plex Mono / ui‑monospace.
- Neu (Tokens, src/index.css): Beide Themes komplett neu (Dark `#171b22`/`#1a1f28` und Light `#f5f6f8`/`#ffffff`). Ein einziger Blau‑Akzent (`#5aa6ff` dark / `#2b6fd9` light) abgeleitet aus dem Logo; muted Status‑Farben (success/warning/danger/info‑cyan/info‑pink). `--radius` 12 → 3 px, `--shadow` durchgängig `none`. Alte Inline‑Hex‑Werte (`#3b82f6`, `#22c55e`, …) in `Network.tsx` und allen Pages auf CSS‑Variablen umgestellt.
- Neu (Header): `Header.tsx` neu geschrieben – 28×28 Gradient‑`F!`‑Mark, Wordmark `fritz!portal` (Inter Tight 600, mit blauem `!`) plus Versions‑Suffix in Mono, Sans‑serif Navigation in Mixed Case (Dashboard, Geräte, …), aktiver Tab als dim‑accent‑Pill. Theme‑Toggle als `◐ DARK / ◐ LIGHT`‑Pill in Mono.
- Neu (StatusLine): neue Komponente `src/components/StatusLine.tsx` als zweite sticky Bar direkt unter dem Header. Zeigt `● SID OK`, `UPTIME 14d 03:22`, `FW <Version>`, `LOAD … / … / …`, `WAN <IPv4>` und rechts eine Live‑Uhr `13.05.26  14:08:42 ● REC`. Ab 900 px Breite werden LOAD/WAN/Clock automatisch ausgeblendet.
- Neu (LOAD‑Anzeige, Backend): `/api/fritz/eco-stats` liefert zusätzlich `load1`, `load5`, `load15` – berechnet aus `ecoHistory.cpu` als 1/5/15‑Minuten‑Mittel der CPU‑Auslastung, normalisiert auf 0..1 (Linux‑Loadavg‑Stil, z. B. `0.23 / 0.41 / 0.18`). Die Werte bauen sich automatisch auf, sobald genug Datenpunkte gesammelt sind.
- Neu (Wiederverwendbare Primitive): `src/components/TerminalPanel.tsx` (Box mit `┃ TITLE ── subtitle`‑Kopfzeile + optionalem Footer) und `src/components/StatTile.tsx` (Kachel mit Corner‑Ticks, optionaler SVG‑Sparkline und Hint/Progress‑Slot).
- Neu (Dashboard): 6‑spaltiges Stat‑Grid (MODELL / CPU / RAM / TEMP / HOSTS / IP POOL) mit live tracked SVG‑Sparklines (60 Punkte). THROUGHPUT.LIVE‑Panel (gestyltes Recharts: 1,6‑px‑Strokes, gestrichelte Grid‑Linien `stroke-dasharray="2 5"`, gradient Fills 18 % → 0 %, mono‑Achsen, kein dot/animation) mit DOWN/UP‑Legend‑Chips und MONTH/SAMPLE‑Footer. HOSTS.ACTIVE‑Panel als kompakte monospace Liste mit IP‑Tail (`.24`), LINK‑Tag und Status‑Dot.
- Neu (Eco‑History‑Modal): wird im neuen `.modal-card`‑Stil (1‑px‑Rand, kein Radius über 3 px, Mono‑`[ ✕ ]`‑Close) gerendert; Modal‑Linien‑Charts angepasst auf die neue Achsen‑ und Tooltip‑Optik.
- Neu (Login/Loading‑Screen): redesigned als `AUTH ── fritz.box`‑Panel – Gradient‑`F!`‑Logo, Mono‑Eingabefelder, `$ login --user fritz`‑Buttons, blinkender Terminal‑Cursor `$ loading▮` ersetzt globalen Spinner.
- Neu (Footer): persistente Command‑Hint‑Bar am Seitenende mit Tastatur‑Hints (`↑↓ navigate / enter open / / search`) und aktuell aktivem Theme.
- Neu (i18n): Wörterbuch in `src/lib/i18n.tsx` (aus v1.3.9) um die neuen Redesign-Strings ergänzt (Status‑Slots, Dashboard‑Tile‑Labels, Panel‑Titel, Command‑Hint, Modal‑Texte). Die DE/EN‑Pill im Header bleibt funktional und schaltet zwischen den Sprachen.
- Fix (Spinner): alle Vorkommen des CSS‑Spinners (Dashboard, DeviceList, DeviceDetail, Network, Traffic, Telefonie, SmartHome, System) durch den blinkenden Cursor ersetzt – einheitlicher Loading‑State über alle Seiten.
- Fix (Stat‑Card Migration): Stat‑Cards mit deko‑Icons in Geräte‑, Traffic‑ und Dashboard‑Seiten durch `StatTile` mit Corner‑Ticks und Akzent‑Variablen ersetzt; die SVG‑Icons der alten Stat‑Cards sind via `display: none` deaktiviert.
- Fix (Tabellen): globaler Stil (`thead th`, `tbody td`) auf mono, dashed Header‑Border, kleinere Padding (10 px / 9 px) und 12.5 px Body‑Font umgestellt – konsistent über alle Pages.
- Fix (Buttons/Forms): `.btn`, `.btn-primary`, `.btn-outline`, `.btn-danger`, `.form-group input/select/textarea` neu definiert – mono, 13 px, 3‑px‑Radius, fokussierter Input bekommt 1‑px‑Accent‑Ring statt 3‑px‑RGB‑Glow.
- Fix (Responsive): Stat‑Grid bricht ab 1200 px auf 3 Spalten, ab 600 px auf 2; Header collapsed unter 768 px (kleinere Padding/Font); StatusLine clipped LOAD/WAN/Clock unter 900 px.

## 1.4.1

- Fix (#25, Anrufliste): Anruf-Typen waren vertauscht – Typ 2 ist „Verpasst", Typ 3 ist „Ausgehend" (laut AVM-Call-XML). UI-Mapping, Filter-Buttons und das Legacy-Feld `number` (Caller/Called-Auswahl) werden korrigiert; zusätzlich wird Typ 10 als „Abgewiesen" sichtbar.
- Fix (#17, WLAN): SSIDs mit Umlauten erschienen verstümmelt. SOAP-Antwort-Werte werden jetzt durch einen XML-Entity-Decoder gereicht (`&auml;`, `&#252;` usw.).
- Fix (#19, SmartHome): RolloTron-DECT-Geräte erschienen auf der SmartHome-Seite doppelt. AHA-Geräteliste wird jetzt nach `identifier` (AIN) dedupliziert; Sub-Device-Felder werden in den Hauptdatensatz gemerged. Dedup gilt auch für den data.lua-Fallback.
- Fix (#16, Geräteliste): Statisch reservierte IPs auf 7530-Firmware wurden meist nicht als „FEST" angezeigt. Die Reservierungs-Liste wird jetzt zusätzlich aus `data.lua?page=netSet/lanExpert` (bzw. SOAP `GetGenericLANHostStaticDHCPEntry` als Fallback) geholt und 15 s gecacht; Geräte werden über MAC-Match markiert.
- Fix (#21, Dashboard): CPU/RAM/Temperatur zeigten auf 7590 dauerhaft 0, obwohl der Verlaufsgraph korrekt war. `/api/fritz/eco-stats` liest den 15-s-Collector-Cache jetzt mit 30 s TTL und fällt – wenn der On-Demand-Pfad ebenfalls 0 liefert – auf den letzten Eintrag aus dem `ecoHistory`-Buffer zurück.

## 1.4.0

- Fix (BUG-05, DECT): Status-Wording entschärft. Manche Fritz!Box-Firmwares melden `NewActive=0` auch für aktive Handsets im Tiefschlaf-Standby – das definitive „Ausgeschaltet" war dadurch irreführend. Neue Labels: „Im Gespräch" → „Aktiv / Bereitschaft" → **„Standby / Aus"** (statt „Ausgeschaltet") → „Abgemeldet". Zusätzlich gilt der Status-Punkt als grün, wenn die Box einen Akkustand > 0 zurückgibt – das ist ein zuverlässiges Lebenszeichen, das auch im Tiefschlaf gemeldet wird.
- Fix (HA-Update): Fortschrittsanzeige beim Add-on-Update blieb bei 0 %. Ursache: ohne `image:`-Feld in `config.yaml` baute der Supervisor das Image lokal aus dem Dockerfile – lokale Builds haben keine granular trackbaren Pull-Layer. Die Add-on-Konfiguration verweist jetzt auf das vom GitHub-Workflow nach `ghcr.io/jayjojayson/fritz-portal/fritz-portal-addon` gepushte Multi-Arch-Image, sodass HA es regulär per `docker pull` zieht und den Fortschritt 0–100 % korrekt anzeigt.

## 1.3.10

- Fix (BUG-04, Mesh): Mesh-Abfragen liefen in 1.3.9 auf Timeout („Mesh: page=netDev Fehler: timeout"). Ursache war das Zusammenspiel der strengeren Rate-Limits (2 parallel data.lua + 400 ms Abstand) mit dem Mesh-`timeoutFetch`, dessen Abort-Timer bereits *vor* der Queue-Wartezeit startete – die Wartezeit im Rate-Limiter fraß dadurch das Timeout-Budget auf. `timeoutFetch` holt jetzt zuerst den Rate-Limiter-Slot über einen neuen Helper `acquireDataLuaSlot()` und startet den Abort-Timer erst danach, sodass die angegebenen 8/15 s wieder tatsächlich für den HTTP-Call zur Verfügung stehen.

## 1.3.9

- Fix (BUG-05, DECT): Ausgeschaltete Handsets wurden fälschlich als aktiv angezeigt. Der Status wird jetzt wieder aus `NewActive`/`NewConnected` abgeleitet; der Registrierungs-Status (Handset ist in der Entry-Liste der Box) wird separat als `registered` geführt. UI-Zustände: „Im Gespräch" → „Aktiv / Bereitschaft" → „Ausgeschaltet" → „Abgemeldet" (letzteres erscheint nur, wenn das Handset nicht mehr registriert ist).
- Neu (Anrufliste): Statt einer einzelnen „Rufnummer"-Spalte werden jetzt **Von** und **An** separat angezeigt (Caller/Called aus der Fritz-Call-XML), plus eine neue **Gerät**-Spalte mit dem DECT/Festnetzanschluss, an dem der Anruf eingegangen bzw. abgesetzt wurde. Eingehende Nummern bei Anrufen in Abwesenheit sowie ausgehende Nummern bei ausgehenden Anrufen sind damit direkt sichtbar.
- Fix (BUG-02, SmartHome-Interop): Rate-Limiter deutlich strenger gestellt, um die parallele Nutzung mit der Fritz-SmartHome-Integration in Home Assistant zu stabilisieren. data.lua: max. 2 parallele Anfragen (vorher 3), 400 ms Mindestabstand (vorher 300 ms). Neu: SOAP-Anfragen (`:49000`) werden auf max. 6 parallel limitiert (vorher ungebremst). Die parallele SOAP-Host-Abfrage wurde von BATCH=15 auf BATCH=8 reduziert – vermeidet Bursts, die die Fritz!Box zeitweise zur Session-Sperre verleiten können.
- Neu (Mehrsprachigkeit): Die gesamte Oberfläche ist jetzt auf **Deutsch und Englisch** umschaltbar. Oben rechts im Header neben dem Theme-Toggle gibt es einen neuen Button (DE/EN), der die Sprache umschaltet und in `localStorage` merkt. Deutsche Strings dienen intern als Keys – fehlt eine Übersetzung, wird der deutsche Text als Fallback angezeigt, sodass die App in beiden Sprachen stabil bleibt.

## 1.3.8

- Fix (BUG-05, DECT): Angemeldete DECT-Handsets wurden trotz aktiver Nutzung als „Abgemeldet" angezeigt. Der SOAP-Eintrag `GetGenericDectEntry` listet nur registrierte Geräte – der Registrierungs-Status wird jetzt daraus abgeleitet statt aus `NewActive` (das je nach Firmware nur die momentane Erreichbarkeit widerspiegelt und im Bereitschaftsmodus `0` liefert). Die Erreichbarkeit fließt in den „Verbunden / Bereitschaft"-Status ein.
- Fix (BUG-05, DECT): „DECT aktiv: Nein" obwohl Handsets registriert sind. Schlägt `GetDECTInfo` mit UPnPError 401 fehl (z. B. 6690, 7590 AX), wird die Basis jetzt automatisch als aktiv gewertet, sobald mindestens ein Handset gefunden wurde.
- Fix (BUG-05, DECT): data.lua-Fallback erkennt Registrierungsstatus robuster über breitere Feldprüfung (`state`, `registered`, `connected`, `connect`, `active`) – Handsets werden zuverlässiger gelistet.
- Fix (BUG-04, Mesh): Mesh-Abfragen brachen nahezu gleichzeitig mit „This operation was aborted" ab. Ursache war der data.lua-Rate-Limiter (max. 3 parallel, 300 ms Abstand aus 1.3.7) – die per-Request-Timer liefen schon, während die Anfragen noch in der Queue warteten. Mesh-Requests nutzen jetzt einen Timer, der erst nach dem Rate-Limiter startet.
- Fix (BUG-04, Mesh): Per-Request-Timeout von 5 s auf 15 s erhöht (manche Fritz!Boxen brauchen für `data.lua` deutlich länger als 5 s zum Antworten) und data.lua-Seiten laufen jetzt seriell mit Early-Exit (statt 6× parallel), um Rate-Limiter-Staus zu vermeiden.
- Neu (BUG-04, Mesh): `data.lua?page=netDev&xhrId=cleanup` ist jetzt die primäre Quelle – genau diese Seite nutzt die Fritz-Weboberfläche selbst für die Mesh-Ansicht (liefert `data.active` mit `mesh_role` und `parent.uid` pro Gerät). `normalizeMeshDevices` parst jetzt auch das netDev-Format (UID, ipv4.ip, parent.uid).
- Neu (BUG-04, Mesh): Zusätzliche Endpunkte `/internet/meshlist.lua?useajax=1`; spekulative Fallback-Seiten (`meshTopo`, `netTopo`, `hostTopo`) bekommen ein verkürztes 6-s-Timeout, damit unbekannte Seiten schnell fehlschlagen statt die Gesamtabfrage zu blockieren.
- Neu (Mesh-Ansicht): Echte Baumstruktur (Tidy-Tree-Layout) statt einer einzigen horizontalen Reihe – Master oben, Repeater/Satellites als Infrastruktur-Ebene, Clients verzweigen darunter unter ihrem tatsächlichen Parent. Unterbäume werden bottom-up skaliert, lange Zweige bekommen horizontalen Scroll statt überlappende Labels.
- Neu (Mesh-Ansicht): Knoten sind jetzt abgerundete Rechtecke mit Name + IP; Farbe folgt der Legende (Master cyan, Infrastruktur orange, LAN-Client blau, WLAN-Client grün).
- Neu (Mesh-Ansicht): Verbindungslinien verlaufen orthogonal (L-Form) in der Verbindungstyp-Farbe (LAN blau durchgezogen, WLAN grün gestrichelt). Beim Hover wird der Pfad Kind → Eltern hervorgehoben, alle anderen abgeblendet.
- Fix (Mesh-Ansicht): Legende im Header zeigt jetzt Master, Infrastruktur, LAN-Client, WLAN-Client, LAN-Linie, WLAN-Linie – passend zu den tatsächlich gezeichneten Farben (vorher Master/Satellite/Client ohne Infrastruktur-Eintrag).
- Fix (Mesh-Ansicht): FRITZ!Box wird jetzt immer als Master angezeigt. Manche netDev-Responses enthalten die Box selbst nicht in `data.active`, wodurch bisher ein zufälliger Client (z. B. „Sonoff-NSPanel") als Master markiert wurde. Wird keine Master-Flagge im Response gefunden, wird ein Master-Knoten aus dem FritzOS-Device-Info (`NewModelName`, Host-IP) synthetisiert und alle Waisen-Knoten unter ihn gehängt.
- Fix (Mesh-Ansicht): Layout ist jetzt vertikal (indentierte Baumansicht) – Master oben, Infrastruktur eingerückt darunter, Clients weiter eingerückt. Kein horizontales Scrollen mehr nötig, auch bei vielen Geräten. Jeder Knoten zeigt Name + IP + LAN/WLAN-Badge rechts.
- Fix (BUG-08, WLAN/LAN): WLAN-Erkennung deutlich verbessert – statt nur `conn_type` werden jetzt `conn` („wlan"/„lan"/„guest"), `master_wifi_uid`, `wlan_UIDs`, `rssi`, `wlan_show_rssi`, `port`/`port_name` und das verschachtelte `wlan`-Objekt geprüft. Verhindert, dass WLAN-Clients fälschlicherweise als LAN-Geräte erscheinen.
- Fix (Mesh-Topologie): Parent-Erkennung nutzt jetzt zusätzlich `master_wifi_uid` – WLAN-Clients werden korrekt unter ihrem WLAN-Master (FritzBox oder Repeater) einsortiert statt als Waise an der Wurzel zu hängen.
- Fix (BUG-08, Geräteliste): WLAN/LAN-Kennzeichnung auf der Geräteseite stimmt jetzt mit der Mesh-Ansicht überein. Die TR-064-SOAP-Hostliste meldet für WLAN-Clients, die über einen Repeater verbunden sind, oft `Ethernet` – /api/fritz/hosts augmentiert jede Zeile jetzt mit der netDev-Info (Quelle: Fritz-Weboberfläche selbst). Beide Ansichten zeigen jetzt dieselbe Anzahl WLAN- und LAN-Geräte.
- Neu (Geräteliste + Mesh): Anschlussdetails werden angezeigt – `LAN 2 → 1 Gbit/s`, `WLAN 2,4 GHz → 58 Mbit/s` usw. Quelle ist das netDev-Feld `conn_info`/`ipinfo` (von FritzOS vorformatiert); wenn nicht vorhanden, wird Port/Band + Speed aus `port_name`, `wlan_band`, `conn_speed`, `txrate` rekonstruiert. In der Mesh-Box passt die Namens-Länge sich dynamisch an die Badge-Breite an, damit nichts überlappt.
- Neu (intern): Gemeinsame Helfer `deviceIsWlan()` und `formatConnDetail()` – Mesh-Topologie und Geräteliste nutzen jetzt exakt dieselbe WLAN-Erkennung und Verbindungstext-Formatierung (keine Divergenz mehr zwischen den Ansichten). netDev wird 15 s in `netdev-map` gecacht, sodass Hosts- und Mesh-Endpunkt nicht doppelt zur Fritz!Box greifen.
- Fix (Dashboard, Download/Upload): Live-Raten zeigten viel zu niedrige Werte (z. B. 0,2 Mbit/s statt echten 105,9 Mbit/s). Der Hintergrund-Collector holte die Live-Werte bisher über den SOAP-`GetAddonInfos`-1-Sekunden-Snapshot, der Bursts verpasst – jetzt wird stattdessen `data.lua?page=netMon` angezapft (genau die Quelle, die die Fritz-Weboberfläche selbst für den Live-Graph nutzt). `GetAddonInfos` bleibt als Fallback nur für Zähler ohne netMon-Daten.
- Fix (Dashboard/Traffic): Umrechnung auf dezimale Mbit/s (1 Mbit/s = 1.000.000 bit/s) statt binäre Mibit/s – zeigt jetzt exakt dieselben Zahlen wie die Fritz!Box-UI statt eines ~7 %-Offsets nach unten.
- Fix (Geräteliste, FEST-Marker): Statisch reservierte IPs werden jetzt deutlich zuverlässiger erkannt. TR-064 meldet `NewAddressSource = "DHCP"` trotz statischer Reservierung; die FRITZ!Portal-Anzeige liest das Flag jetzt aus dem netDev-Feld `static_dhcp` (auch `ipv4.static_dhcp`, `is_static`, `dhcp === '2'`) – deckt damit alle Reservierungen ab, die in der Fritz-Weboberfläche sichtbar sind.

## 1.3.7

- Fix (BUG-01/02, Kritisch): Rate-Limiter für data.lua-Anfragen – maximal 3 parallele Anfragen, 300 ms Mindestabstand. Verhindert Fritz!Box-UI-Blockaden und SmartHome-Offlinephasen bei hoher Last (hoffentlich)
- Fix (BUG-03/10): Startup-Warnung wenn Fritz!Box-Hostname nicht per DNS auflösbar ist – klare Fehlermeldung im Add-on-Protokoll statt stiller Fehler
- Fix (BUG-04): Mesh-Timeouts von 10 s auf 5 s reduziert – UI blockiert nicht mehr bei langsamen Mesh-Antworten
- Fix (BUG-07/08): WLAN-Schleife auf Netzwerk-Index 1–4 erweitert (war 1–3) – Gastnetzwerk und 6-GHz-Band werden jetzt korrekt abgefragt
- Fix (BUG-09): IP-Sortierung in der Geräteliste ist jetzt numerisch statt alphabetisch (192.168.1.10 kommt nach 192.168.1.9)
- Fix (BUG-13): Hintergrund-Timer von 10 s auf 15 s erhöht – weniger parallele Fritz!Box-Anfragen, geringere Systemlast
- Fix (DECT): DECT-Handset-Status basiert jetzt auf dem Feld `active` (registriert) statt `connected` (DECT-Funkverbindung aktiv) – Geräte im Bereitschaftsmodus werden nicht mehr als "Getrennt" angezeigt, sondern als "Aktiv / Bereitschaft"
- Neu: Dashboard-Graph zeigt jetzt die letzten 15 Minuten (60 Punkte à 15 s); der Verlauf bleibt bei Navigation zwischen Seiten erhalten und wird nicht neu aufgebaut
- Neu: Geräteliste zeigt "FEST"-Badge bei statisch zugewiesener IP-Adresse; offline-Geräte zeigen die Zeit seit letzter Aktivität ("Zuletzt online") – server-seitig getrackt als Fallback falls Fritz!Box-Firmware das SOAP-Feld nicht liefert
- Neu: IP-Adressen in der Geräteliste sind anklickbar und öffnen das Gerät (Web-UI) in einem neuen Browser-Tab
- Neu: SmartHome als eigenständiger Menüpunkt im Hauptmenü; Telefonie zeigt nur noch DECT und Anrufliste
- Neu: Debug-Logging-Modus – alle API-Anfragen (data.lua, SOAP) werden im Add-on-Protokoll ausgegeben; aktivierbar per `debug_logging: true` in der Add-on-Konfiguration oder über den neuen Toggle in den HA-Sensor-Einstellungen
- Neu: `config.yaml` enthält `debug_logging: false` als neue Option mit Schema-Definition

## 1.3.6

- Neu: GitHub Actions Workflow – bei jedem Release wird der `fritz-portal`-Ordner automatisch als ZIP-Asset angehängt
- Neu: Workflow kann auch manuell über GitHub Actions ausgelöst werden (workflow_dispatch)
- Fix: `plan.md` wird per `.gitignore` aus dem Repository ausgeschlossen

## 1.3.5

- Fix: MQTT Discovery wird jetzt IMMER ausgeführt – das FRITZ!Portal-Gerät erscheint zuverlässig unter MQTT in Home Assistant, auch wenn REST-API Fallback aktiv ist
- Fix: Sensordaten werden immer via MQTT gesendet wenn Broker erreichbar – REST-API sendet zusätzlich wenn aktiviert (statt entweder/oder)
- Fix: `removeMqttDiscovery()` wird nicht mehr beim Start aufgerufen – MQTT-Gerät bleibt dauerhaft erhalten

## 1.3.4

- Fix: SUPERVISOR_TOKEN wurde nicht erkannt – `run.sh` nutzt jetzt `with-contenv` für HA Base Images (S6 Overlay), damit der Token an Node.js weitergereicht wird
- Fix: Fallback auf `HASSIO_TOKEN` für ältere HA-Versionen
- Fix: `run.sh` erkennt automatisch ob S6 (`with-contenv`) vorhanden ist – lokal ohne HA funktioniert weiterhin

## 1.3.3

- Fix: REST-API Fallback Toggle in der GUI funktioniert jetzt sofort – auch wenn MQTT-Broker erreichbar ist
- Fix: GUI-Einstellungen werden in die Add-on-Konfiguration synchronisiert (kein Neustart nötig)
- Neu: Klare Modus-Trennung – REST-API hat Vorrang wenn aktiviert, sonst MQTT (verhindert Blockierung durch MQTT-False-Positive)
- Neu: Beim Wechsel auf REST-API werden MQTT Discovery-Konfigurationen automatisch aus HA entfernt
- Neu: MQTT Discovery zählt registrierte Sensoren und loggt das Ergebnis (z.B. „17/17 Sensoren registriert")
- Neu: MQTT publish Fehler zeigen jetzt auch den HTTP-Response-Body für bessere Diagnose
- Neu: `hassio_api: true` – erlaubt dem Add-on die Konfiguration via Supervisor API zu synchronisieren
- Neu: Hinweis in der GUI dass Änderungen sofort wirken ohne Neustart

## 1.3.2

- Neu: MQTT Discovery ist jetzt immer aktiv – Sensoren werden standardmäßig via MQTT an Home Assistant gesendet (kein separater Schalter nötig)
- Neu: REST-API Fallback – optional aktivierbar in der GUI oder Add-on-Konfiguration für Nutzer ohne MQTT-Broker
- Neu: REST-API Fallback ist standardmäßig deaktiviert – verhindert doppelte Entitäten wenn MQTT aktiv ist
- Neu: Status-Anzeige zeigt ob MQTT-Broker erreichbar ist (grün/orange Indikator in der GUI)
- Fix: MQTT Discovery – Gerätename und Hersteller auf „FRITZ!Portal" geändert (statt „FRITZ!Box" / „AVM")
- Fix: REST-API-Sensoren erhalten `unique_id` – Sensoren sind in HA bearbeitbar (Name, Icon, Bereich etc.)
- Fix: MQTT publish und Discovery mit verbessertem Logging – zeigt im Protokoll ob Broker erreichbar ist
- Fix: HA Update-Fortschrittsanzeige blieb bei 0 % – Dockerfile verwendet jetzt `BUILD_FROM` (HA Base Image) für korrektes Build-Tracking

## 1.3.1 (closed)

- Neu: MQTT-Schalter (`ha_mqtt`) in der Add-on-Konfiguration sichtbar (config.yaml Schema)
- Neu: REST-API-Sensoren erhalten `unique_id` – Sensoren sind jetzt in HA bearbeitbar (Name, Icon, Bereich etc.)
- Fix: MQTT Discovery Toggle in der GUI steht jetzt unterhalb der Intervall-Einstellungen (statt dazwischen)
- Fix: MQTT Discovery mit verbessertem Logging – zeigt im Protokoll ob Broker erreichbar ist und ob Sensoren registriert wurden
- Fix: MQTT publish Fehler werden jetzt mit HTTP-Status geloggt für bessere Diagnose

## 1.3.0 (closed)

- Neu: MQTT Discovery als optionaler Toggle auf der Systemseite – erstellt ein FRITZ!Portal-Gerät in der HA-Geräteübersicht mit bearbeitbaren Sensoren
- Neu: REST-API und MQTT unabhängig schaltbar – Hinweis bei gleichzeitiger Aktivierung warnt vor Duplikaten
- Neu: Beim Deaktivieren von MQTT werden die Discovery-Konfigurationen automatisch aus HA entfernt
- Fix: MQTT Discovery – Gerätename und Hersteller auf „FRITZ!Portal" geändert (statt doppelt „FRITZ!Box" / „AVM")
- Fix: MQTT Entity-IDs verwenden `fritzportal_*` Präfix (via `object_id`)
- Fix: HA Update-Fortschrittsanzeige blieb bei 0 % – Dockerfile verwendet jetzt `BUILD_FROM` (HA Base Image) für korrektes Build-Tracking

## 1.2.9

- Neu: Farbschema für Netzwerk-Ansicht – Master türkis, LAN blau, WLAN grün, Infrastruktur (Router/Repeater/Fritz) orange
- Neu: Infrastruktur-Erkennung – Geräte mit „router", „repeater" oder „fritz" im Namen werden automatisch als Infrastruktur-Geräte markiert
- Neu: Legende und Zusammenfassung zeigen Infrastruktur-Geräte separat an
- Neu: MQTT Discovery – Fritz!Box wird als eigenes Gerät in der HA-Geräteübersicht registriert (erfordert MQTT-Broker) ansonsten wie bisher via REST-API-Fallback über setState()
- Neu: Alle FRITZ!Portal-Sensoren werden unter einem Fritz!Box-Gerät gruppiert (CPU, RAM, Temperatur, Traffic etc.)
- Fix: WebSid-Timeout von 3s auf 8s erhöht – verbessert Kompatibilität mit 6490 und anderen Cable-Boxen

## 1.2.8

- Neu: „Namen“-Button zum Ein-/Ausblenden der Gerätenamen unter den Bubbles (max. 12 Zeichen)
- Neu: Fritz!Box-Name und IP werden im Master-Kreis angezeigt (kleiner, gut lesbar) statt außerhalb bis max 80 Geräte
- Fix: Fritz!Box erscheint nicht mehr doppelt als Client-Gerät im Netzwerk-Diagramm

## 1.2.7

- Neu: Toggle-Schalter „Mesh / Netzwerk" neben der Topologie-Überschrift – erlaubt Wechsel zwischen Mesh-Ansicht und Netzwerk-Ansicht (Host-Fallback)
- Neu: Radiales Star-Layout für die Netzwerk-Ansicht – Fritz!Box in der Mitte, Geräte in konzentrischen Ringen angeordnet, skaliert automatisch für 10–150+ Geräte
- Neu: LAN/WLAN-Leitungen korrekt aus Interface-Daten zugeordnet – LAN blau durchgezogen, WLAN grün gestrichelt (statt alle blau)
- Neu: Hover-Highlight – beim Überfahren eines Geräts wird nur dessen Verbindungslinie hervorgehoben, alle anderen werden abgeblendet
- Neu: WLAN-Geräte bekommen ein WLAN-Icon (Funkwellen), LAN-Geräte ein Monitor-Icon im Knoten
- Neu: Zusammenfassung über dem Diagramm zeigt Anzahl Geräte online, LAN und WLAN
- Neu: Tooltip zeigt jetzt auch den Verbindungstyp (LAN/WLAN) an
- Neu: „Namen"-Button zum Ein-/Ausblenden der Gerätenamen unter den Bubbles (max. 12 Zeichen)
- Neu: Fritz!Box-Name und IP werden im Master-Kreis angezeigt (kleiner, gut lesbar)
- Fix: Fritz!Box erscheint nicht mehr doppelt als Client-Gerät im Netzwerk-Diagramm
- Fix: WLAN-Erkennung im Host-Fallback erkennt jetzt auch `802.11` und `Ethernet` (SOAP-Werte) korrekt
- Fix: Geräte-Limit im Host-Fallback von 50 auf unbegrenzt erhöht

## 1.2.6

- Fix: Statische DHCP-Vergabe – data.lua Fallback wenn SOAP `401 Invalid Action` liefert (betrifft 6591, 6490 u. a.)
- Fix: Statische DHCP-Löschung – ebenfalls data.lua Fallback
- Fix: Mesh-Timeout von 4s auf 10s erhöht – manche Fritz!Box-Modelle antworten langsamer
- Neu: Mesh-Logging zeigt jetzt HTTP-Status und Antwort-Länge für bessere Diagnose
- Neu: Mesh zusätzliche Seiten (`meshSet`, `meshNet`) und `/net/mesh_overview.lua` als Alternativen
- Neu: Mesh Fallback aus Host-Liste – zeigt Fritz!Box als Master mit allen online Clients als Netzwerkdiagramm wenn keine echte Mesh-API verfügbar ist

## 1.2.5

- Fix: HA Supervisor Warning – `armv7` in `config.yaml` durch `armhf` ersetzt (alter Wert wurde als deprecated gemeldet)
- Fix: HA-Sensoren springen nicht mehr auf 0 – letzter bekannter Wert wird beibehalten wenn Cache abgelaufen ist
- Fix: Fritz!Box 6490 – Modell-Ermittlung jetzt via `tr64desc.xml` (kein Login nötig) und data.lua Fallback
- Fix: Fritz!Box 6490 – IP-Statistiken mit data.lua Fallback wenn SOAP `606 Action Not Authorized` liefert
- Fix: WAN-Seite – data.lua Fallback für WAN-IP wenn beide SOAP-Dienste nicht erreichbar sind
- Fix: Dashboard Tablet-Ansicht – alle 6 Stat-Boxen werden jetzt in einer Zeile dargestellt
- Fix: Dashboard Mobil-Ansicht – Stat-Boxen in 2 Spalten (statt 1), Traffic-Boxen untereinander

## 1.2.4

- Neu: Alle Server-Logs im HA-Protokoll haben jetzt Zeitstempel (z.B. `[08:31:42] Auto-session: Created session`)
- Neu: README komplett überarbeitet – Logo, Screenshot, Feature-Tabelle, Schritt-für-Schritt-Installation und Docker-Anleitung

## 1.2.3

- Fix: Mesh-Abfragen laufen jetzt parallel statt seriell – Wartezeit beim ersten Aufruf von ~20s auf ~4s reduziert
- Fix: Negatives Ergebnis (kein Mesh) wird 60s gecacht – verhindert wiederholte Timeouts bei jedem Seitenaufruf

## 1.2.2

- Neu: Mesh-Topologie-Visualisierung im Tab "Übersicht" der Netzwerk-Seite
- Neu: SVG-Diagramm zeigt Fritz!Box-Geräte (Master, Satellite, Clients) mit Verbindungslinien (LAN/WLAN)
- Neu: Hover-Tooltip mit IP, MAC und Modell des jeweiligen Knotens
- Neu: Backend-Endpunkt `/api/fritz/mesh` mit Fallback durch mehrere `data.lua`-Seiten und `/meshlist.lua`
- Fix: Mesh-Topologie-Spinner drehte sich endlos – alle fetch-Aufrufe im `/api/fritz/mesh`-Endpunkt haben jetzt 4s Timeout (AbortController)
- Fix: Seite `overview` aus der Mesh-Suchliste entfernt (zu große Antwort, zu langsam)
- Fix: Frontend-Sicherheitsnetz: Spinner bricht nach 25s automatisch ab
- Neu: Server-Logging für Mesh-Endpunkt (zeigt welche Seite versucht wird und Fehlermeldungen)

## 1.2.1

- Änderung: HA Traffic-Sensoren (Heute/Gestern/Woche/Monat/Vormonat) werden jetzt in MB oder GB übertragen – unter 1 GiB als MB (2 Nachkommastellen), ab 1 GiB als GB (3 Nachkommastellen)

## 1.2.0

- Fix: Traffic-Sensoren für Home Assistant (Heute/Gestern/Woche/Monat/Vormonat) wurden nie an HA gesendet, da kein Background-Collector existierte. `pushTrafficSensorsToHA()` holt jetzt aktiv Daten von der FritzBox wenn der Cache abgelaufen ist.
- Änderung: HA-Sensoren `download_speed` und `upload_speed` werden jetzt in MB/s statt B/s übertragen (auf 3 Nachkommastellen gerundet)

## 1.1.30

- Neu: FRITZ!Portal Logo im Header anstelle der bisherigen Text-Schriftzug
- Neu: Add-on Icon (`icon.png`) für die Home Assistant Add-on-Kachel

## 1.1.29

- Fix: Light-Mode Tabellen-Hover war schwarz-auf-schwarz – `--bg-hover` im Light-Mode auf `#e8eaed` korrigiert
- Fix: Fritz!Box 7530 (DSL/PPPoä) – WAN-Endpunkt versucht jetzt zuerst `WANIPConnection:1`, dann `WANPPPConnection:1` als Fallback
- Fix: Fritz!Box 7530 – LAN- und DHCP-Endpunkt fallen auf `data.lua` zurück wenn SOAP `401 Invalid Action` liefert
- Fix: Eco-Stats (CPU/RAM/Temperatur) – zusätzliche Seiten (`system`, `sysStat`) und Feldpfade für 7530-Firmware (`cpuUtil`, `ramUtil`, `memUsage`, `stat.*`)
- Fix: `WANPPPConnection:1` Control-URL in Discovery-Fallbacks ergänzt

## 1.1.28

- Fix: HA Sensor Push übertrug Nullwerte – Background-Collector schreibt eco-stats und network-stats jetzt in den API-Cache
- Fix: pushFastSensorsToHA liest Cache mit 120s TTL – verhindert Nullwerte wenn HA-Intervall länger als Standard-Cache-TTL ist

## 1.1.27

- Neu: HA-Sensor-Einstellungen direkt in der GUI auf der Systemseite konfigurierbar
- Neu: Schalter zum Aktivieren/Deaktivieren des Sensor-Push in der GUI
- Neu: Intervall für Systemsensoren (CPU, RAM, Temp, Geräte, IPs, Download, Upload) separat einstellbar (Standard: 60 Sek.)
- Neu: Intervall für Traffic-Sensoren (Heute/Gestern/Woche/Monat/Vormonat) separat einstellbar (Standard: 300 Sek.)
- Neu: Einstellungen werden in `/data/fritz-portal.json` gespeichert und nach Neustart beibehalten
- Neu: Status-Anzeige in der GUI zeigt ob HA Supervisor erreichbar ist
- Fix: HA Sensor Push in zwei unabhängige Timer aufgeteilt (Systemsensoren / Traffic) für reduzierte API-Last

## 1.1.26

- Neu: HA Sensor Push – Fritz!Box-Werte werden automatisch als Home Assistant Sensoren bereitgestellt
- Neu: Sensoren für CPU, RAM, CPU-Temperatur, Geräte online, freie IPs, Live-Download, Live-Upload
- Neu: Traffic-Sensoren für Heute, Gestern, Aktuelle Woche, Aktueller Monat und Vormonat (jeweils Download & Upload)
- Neu: Add-on-Option `ha_sensors` (true/false) zum Aktivieren/Deaktivieren des Sensor-Push
- Neu: Add-on-Option `ha_sensors_interval` (Sekunden) für das Abfrageintervall (Standard: 30s)
- Fix: ip-stats Endpunkt cached Ergebnis jetzt serverseitig (30s TTL) – vermeidet redundante SOAP-Aufrufe beim Sensor-Push

## 1.1.25

- Fix: Theme-Wechsel (Dark/Light) löst kein Seiten-Reload mehr aus – CSS wird reaktiv per State aktualisiert

## 1.1.24

- Fix: Dashboard zeigt Modell, Geräte und IP-Stats sofort an – eco-stats, traffic und chart laden danach ohne Spinner im Hintergrund nach
- Fix: WebSID wird beim Session-Start vorab gecacht – erster eco-stats-Request trifft keinen Cold-Cache mehr

## 1.1.23

- Fix: Dashboard Live-Chart fror nach dem ersten Laden ein – Ursache war ein useEffect-Cleanup-Bug der das 10s-Interval vorzeitig zerstörte
- Fix: Geräteliste wird jetzt parallel statt sequentiell per SOAP abgerufen (bis zu 15 gleichzeitige Requests) – Ladezeit von ~7s auf ~1s reduziert
- Fix: Hosts-Cache-TTL auf 60 Sekunden erhöht (war 10s) – schnelleres Wechseln zwischen Seiten
- Neu: eco-History Zeitraum von 1h auf 3h erhöht
- Neu: Modal-Titel zeigt jetzt korrekt "letzte 3h"

## 1.1.22

- Fix: DECT SOAP-Fehler (401 Invalid Action) blockiert nicht mehr den data.lua-Fallback
- Neu: CPU-, RAM- und Temperatur-Karten auf dem Dashboard sind jetzt klickbar
- Neu: Klick öffnet ein Modal mit dem Verlaufsgraphen der letzten 1 Stunde
- Neu: Server sammelt eco-Stats (CPU/RAM/Temp) server-seitig alle 10 s für den Verlauf

## 1.1.21

- Fix: DECT-Handsets – data.lua-Fallback nutzt jetzt Seite `dect`/`dectReg` statt `dectSet`; breitere Suche nach Handset-Listen-Pfaden
- Fix: DECT-Fallback verwendet gecachte WebSID (kein redundanter Login mehr)
- Neu: SmartHome-Geräte werden über das offizielle AHA-HTTP XML-Interface abgerufen (Fallback: data.lua)
- Fix: WebSID-Cache – fehlgeschlagene Logins werden nur 30 s gecacht statt 5 min; ermöglicht schnelleren Retry
- Fix: Eco-Stats (CPU/RAM/Temperatur) – zusätzliche data.lua-Seiten (`ecoStat`) und direkte Feldpfade als Fallback für verschiedene Modelle

## 1.1.20

- Fix: apiFetch - Pfad-Konkatenierung fürHA Ingress und Nicht-Ingress korrigiert

## 1.1.19

- Fix: apiFetch - Pfad-Konkatenierung korrigiert für HA Ingress

## 1.1.18

- Fix: DeviceDetail - apiFetch statt fetch für blockstate und static-dhcp

## 1.1.17

- Fix: Sortierung nach Verbindung - Fehler bei leeren Interfaces behoben

## 1.1.15

- Neu: Sortierung auf der Geräteseite nach Name, Status, IP-Adresse oder Verbindung
- Klick auf die Spaltenüberschrift sortiert die Tabelle auf- oder absteigend

## 1.1.14

- Fix: Browser-Caching auf 10 Minuten erhöht für schnellere Seitennavigation
- Fix: GitHub Actions auf Node.js 24 aktualisiert
- Fix: Server-Caching für API-Antworten (10 Sekunden TTL)
- Fix: Doppeltes Komma in server/package.json entfernt

## 1.1.13

- Fix: armv7 Architektur zur config.yaml hinzugefügt

## 1.1.12

- Fix: Browser-Caching implementiert (30 Sekunden)
- Version auf Systemseite fest eingebaut (nicht mehr dynamisch vom Server)

## 1.1.11

- Neu: Browser-Caching für schnelle Seitennavigation
- Fix: Server-seitiges Caching für alle API-Antworten

## 1.1.10

- Fix: Server-Cache TTL auf 10 Sekunden erhöht

## 1.1.9

- Neu: Version wird fest im Frontend eingebaut (Systemseite)

## 1.1.8

- Neu: Vierte Box "Freie IPs" auf der Geräteseite
- Zeigt die letzten 5 freien IP-Adressen aus dem DHCP-Bereich

## 1.1.7

- Neu: Screenshot in DOCS.md eingefügt

## 1.0.0

- Erste Version des FRITZ!Portal Home Assistant Add-ons
- Dashboard mit Systemübersicht (CPU, RAM, Temperatur)
- Geräteliste mit Detailansicht
- Netzwerk-Einstellungen (LAN, WAN, WLAN, DHCP)
- Traffic-Übersicht (Tag, Woche, Monat, Vormonat)
- Telefonie (Anrufliste, DECT-Telefone)
- System-Informationen und Neustart-Funktion
- Automatische Anmeldung über Add-on-Konfiguration
- Home Assistant Ingress-Support
