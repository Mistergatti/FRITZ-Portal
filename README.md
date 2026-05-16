<p align="center">
  <img src="fritz-portal/icon.png" alt="FRITZ!Portal Logo" width="140"/>
</p>
<p align="center">
  <strong>Das moderne Fritz!Box Dashboard als Home Assistant App</strong><br/>
  Echtzeit-Übersicht, Netzwerktopologie, HA-Sensoren und mehr – alles in einer eleganten Oberfläche. Ändere bequem Gerätenamen, vergebe neue IP Adressen oder blockiere unerwünschte Hosts direkt aus der App heraus. Vollständig integriert in die Home Assistant Benutzeroberfläche dank Ingress.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Home%20Assistant-App-41BDF5?logo=home-assistant&logoColor=white" alt="HA App"/>
  <img src="https://img.shields.io/badge/Version-1.4.2-blue" alt="Version"/>
  <img src="https://img.shields.io/badge/Architektur-amd64%20%7C%20aarch64%20%7C%20armv7-green" alt="Arch"/>
  <img src="https://img.shields.io/badge/Lizenz-MIT-lightgrey" alt="Lizenz"/>
</p>
<p align="center">
Wenn euch die App gefällt, würde ich mich über eine Sternebewertung ⭐ freuen. 🤗  
</p>

<div align="center">
  
[![Buy Me a Coffee](https://img.shields.io/badge/Ko--fi-Buy%20Me%20a%20Coffee-darkgreen?style=flat&logo=ko-fi&logoColor=white)](https://ko-fi.com/jayjojayson)
[![Support](https://img.shields.io/badge/%20-Support%20Me-darkgreen?style=flat&logo=paypal&logoColor=white)](https://www.paypal.me/quadFlyerFW)
</div>

<p align="center">
  <img src="fritz-portal/docs/images/screenshot-fritzportal-lite.png" alt="FRITZ!Portal Screenshot" width="800"/>  
  <img src="fritz-portal/docs/images/screenshot-fritzportal-dark.png" alt="FRITZ!Portal traffic" width="800"/> 
  <img src="fritz-portal/docs/images/fritzportal-devices.png" alt="FRITZ!Portal network" width="800"/>
  <img src="fritz-portal/docs/images/fritzportal-device.png" alt="FRITZ!Portal network" width="800"/>
  <img src="fritz-portal/docs/images/fritzportal-mesh.png" alt="FRITZ!Portal network" width="800"/>
  <img src="fritz-portal/docs/images/fritzportal-telefon.png" alt="FRITZ!Portal network" width="800"/>
  <img src="fritz-portal/docs/images/fritzportal-traffic.png" alt="FRITZ!Portal network" width="800"/>
</p>

---

## ✨ Features

| Bereich | Was ist enthalten |
|---|---|
| **Dashboard** | Live-Anzeige von CPU, RAM, Temperatur mit Verlaufsgraph (3h) |
| **Geräteliste** | Alle verbundenen Hosts mit Status, IP, MAC, Verbindungstyp und Blockier-Funktion |
| **Netzwerk** | LAN, WAN, WLAN, DHCP – Details auf einen Blick; Mesh-Topologie-Visualisierung |
| **Traffic** | Download/Upload-Chart live + Statistiken für Heute, Gestern, Woche, Monat, Vormonat |
| **Telefonie** | Anrufliste und DECT-Handsets |
| **System** | Fritz!Box Modell, Firmware, Uptime, Neustart-Funktion |
| **HA-Sensoren** | CPU, RAM, Temp, Geräte, IPs, Download, Upload, Traffic – automatisch als Sensoren in Home Assistant |
| **MQTT Discovery** | Standard-Übertragungsweg: Alle Sensoren werden via MQTT als gruppiertes „FRITZ!Portal"-Gerät in HA registriert |
| **REST-API Fallback** | Optional aktivierbar für Nutzer ohne MQTT-Broker – Sensoren erscheinen dann als einzelne Entitäten |
| **Dark / Light Mode** | Reaktives Theme ohne Reload |
| **Ingress** | Vollständige Integration in die Home Assistant Oberfläche |

---

## 🚀 Installation in Home Assistant

### 1. Repository hinzufügen

1. In HA: **Einstellungen → Apps → App Store**
2. Rechts oben auf **⋮ → Benutzerdefinierte Repositories** klicken
3. URL eintragen:
   ```
   https://github.com/jayjojayson/FRITZ-Portal
   ```
4. **Hinzufügen** klicken → Seite neu laden

### 2. App installieren

1. **FRITZ!Portal** im Store suchen und öffnen
2. **Installieren** klicken (Build dauert einige Minuten)
3. Wechsel zu **Konfiguration** und Zugangsdaten eintragen:

| Option | Beschreibung | Standard |
|---|---|---|
| `fritzbox_host` | Hostname oder IP der Fritz!Box | `fritz.box` |
| `fritzbox_user` | Fritz!Box-Benutzername | – |
| `fritzbox_password` | Fritz!Box-Passwort | – |
| `ha_sensors` | REST-API Fallback aktivieren (nur ohne MQTT-Broker nötig) | `false` |
| `ha_sensors_interval` | Intervall Systemsensoren (Sek.) | `60` |
| `ha_sensors_traffic_interval` | Intervall Traffic-Sensoren (Sek.) | `300` |

4. **Speichern → Starten**
5. Via **Benutzeroberfläche** öffnen oder direkt unter `http://<ha-ip>:3003`

> **Hinweis:** Die App meldet sich beim Start automatisch mit den konfigurierten Zugangsdaten an der Fritz!Box an – kein manuelles Login nötig.

> **Fritz!Box Berechtigungen:** Der verwendete Fritz!Box-Benutzer benötigt folgende Berechtigungen für die korrekte Funktionsweise der App:
> - **Telefonie** (für Anrufliste und DECT-Handsets)
> - **Geräte und WLAN** (für Hostliste, IP-Verwaltung und Blockier-Funktionen)
> - **System** (für Firmware, CPU, RAM, Temperatur und Neustart-Funktion)
> - **Smart Home** (optional, nur für SmartHome-Geräte)
> 
> Diese Berechtigungen werden meist automatisch für neue Benutzer in der Fritz!Box erstellt. Falls die App keinen Zugriff auf bestimmte Funktionen hat, stelle bitte die Berechtigungen unter **Fritz!Box → System → Benutzer** entsprechend ein.

> **MQTT Discovery:** FRITZ!Portal sendet Sensordaten **immer automatisch via MQTT** an Home Assistant. Alle Sensoren werden dabei als ein gemeinsames **„FRITZ!Portal"**-Gerät in der HA-Geräteübersicht registriert und lassen sich dort individuell benennen, kategorisieren und auf Dashboards verwenden.
>
> **Kein MQTT-Broker vorhanden?** Den **REST-API Fallback** in der App-Konfiguration (`ha_sensors: true`) oder direkt in der FRITZ!Portal-GUI aktivieren. Die Sensoren erscheinen dann als einzelne Entitäten unter *Einstellungen → Entitäten*. Um doppelte Entitäten zu vermeiden, sollte immer nur eine Methode aktiv sein.
>
---

FRITZ!Portal funktioniert grundsätzlich mit allen Fritz!Box-Modellen, die TR-064 und `data.lua` unterstützen.
Die folgenden Modelle wurden von Nutzern getestet und laufen gut:

| Modell | Status | Anmerkungen |
|---|---|---|
| FRITZ!Box 7590 | ✅ Gut | Vollständig unterstützt |
| FRITZ!Box 7590 AX | ✅ Gut | DECT-Fix seit v1.3.8 |
| FRITZ!Box 7530 | ✅ Gut | DSL/PPPoE; Mesh-Ansicht eingeschränkt (Issue #5) |
| FRITZ!Box 6690 Cable | ✅ Gut | DECT-Fix seit v1.3.8 |
| FRITZ!Box 6591 Cable | ✅ Gut | Vollständig unterstützt seit DHCP-Fallback via data.lua seit v1.2.6 |
| FRITZ!Box 6490 Cable | ✅ Gut | Modell-Ermittlung und IP-Stats via Fallback seit v1.2.5 |
| FRITZ!Box 6860 5G | ⚠️ In Klärung | Probleme gemeldet (Issue #20) |

> **Hinweis:** Modelle, die nicht in dieser Liste stehen, funktionieren möglicherweise ebenfalls – sie wurden nur noch nicht explizit getestet.

---

## 🐳 Lokal mit Docker bauen & testen

Für Entwicklung und Tests ohne Home Assistant:

```bash
# Repository klonen
git clone https://github.com/jayjojayson/FRITZ-Portal.git
cd FRITZ-Portal/fritz-portal

# Docker Image bauen
docker build -t fritz-portal-app .

# Container starten (Auto-Login via Umgebungsvariablen)
docker run --rm -p 3003:3003 \
  -e FRITZBOX_HOST=fritz.box \
  -e FRITZBOX_USER=admin \
  -e FRITZBOX_PASSWORD=geheim \
  fritz-portal-app
```

Danach im Browser öffnen: **http://localhost:3003**

### Nur Frontend entwickeln (Vite Dev Server)

```bash
cd fritz-portal
npm install
npm run dev
```

Der Dev-Server läuft auf **http://localhost:5173** und proxyt API-Anfragen automatisch an den laufenden Express-Server.

---

## 📋 Changelog

Die vollständige Versionshistorie ist in [CHANGELOG.md](fritz-portal/CHANGELOG.md) zu finden.

---

<p align="center">
  Made with ❤️ for the Home Assistant community
</p>
