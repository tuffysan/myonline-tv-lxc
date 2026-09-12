# MyOnline TV

MyOnline TV är en självhostad TV- och mediaplattform för Live TV/IPTV, EPG, filmer, serier, Plex, Jellyfin och flera klienttyper. Plattformen är byggd för att köras centralt på din egen server och användas från webbläsare, datorer, mobiltelefoner, surfplattor, Android TV / Google TV, Amazon Fire TV och Apple TV.

All användar- och mediekonfiguration hanteras centralt i MyOnline TV-servern. Det innebär att samma konto, IPTV-källor, synlighetsfilter, historik och andra inställningar kan återanvändas mellan olika enheter.

> **Projektmål:** En enda självhostad TV-plattform som fungerar på så många enheter som möjligt utan beroenden till betalda AI-tjänster.

---

## Innehåll

- [Översikt](#översikt)
- [Funktioner](#funktioner)
- [Arkitektur](#arkitektur)
- [Repository-struktur](#repository-struktur)
- [Systemkrav](#systemkrav)
- [Snabbstart](#snabbstart)
- [Installera i Proxmox LXC](#installera-i-proxmox-lxc)
- [Uppdatera en befintlig LXC-installation](#uppdatera-en-befintlig-lxc-installation)
- [Rollback](#rollback)
- [HTTPS och reverse proxy](#https-och-reverse-proxy)
- [Första uppstart](#första-uppstart)
- [Användare och säkerhet](#användare-och-säkerhet)
- [IPTV](#iptv)
- [Plex](#plex)
- [Jellyfin](#jellyfin)
- [Live TV](#live-tv)
- [EPG](#epg)
- [Movies](#movies)
- [Series](#series)
- [Installera klienten på olika enheter](#installera-klienten-på-olika-enheter)
- [Apple TV](#apple-tv)
- [Android TV / Google TV](#android-tv--google-tv)
- [Amazon Fire TV](#amazon-fire-tv)
- [Windows](#windows)
- [macOS](#macos)
- [Linux](#linux)
- [Android](#android)
- [iPhone och iPad](#iphone-och-ipad)
- [Smart TV](#smart-tv)
- [Raspberry Pi](#raspberry-pi)
- [Backup och restore](#backup-och-restore)
- [Health checks](#health-checks)
- [Loggar och felsökning](#loggar-och-felsökning)
- [Build och release](#build-och-release)
- [GitHub Actions](#github-actions)
- [Apple TV-build utan Mac](#apple-tv-build-utan-mac)
- [Android TV-build](#android-tv-build)
- [Säkerhetsrekommendationer](#säkerhetsrekommendationer)
- [Vanliga problem](#vanliga-problem)
- [Utveckling](#utveckling)
- [Versionshantering](#versionshantering)
- [Licens](#licens)

---

# Översikt

MyOnline TV består av en central backend och flera klienter.

```text
                         ┌────────────────────┐
                         │      Internet      │
                         └─────────┬──────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │ DNS / HTTPS Proxy  │
                         └─────────┬──────────┘
                                   │
                                   ▼
                   ┌──────────────────────────────┐
                   │      MyOnline TV Server      │
                   │      ASP.NET Core / .NET     │
                   ├──────────────────────────────┤
                   │ Users                        │
                   │ IPTV                         │
                   │ EPG                          │
                   │ Movies                       │
                   │ Series                       │
                   │ Plex                         │
                   │ Jellyfin                     │
                   │ Watch history                │
                   │ Favorites / Watchlist        │
                   │ Visibility preferences       │
                   └──────────────┬───────────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
       Web / PWA           Android TV           Apple TV
       Desktop/Mobile      Google TV            tvOS
```

Serverdelen är den gemensamma sanningskällan. Klienterna hämtar data och media från samma backend.

---

# Funktioner

## Media

- Live TV
- IPTV
- Xtream Codes-kompatibla källor
- M3U
- XMLTV / EPG
- Movies
- Series
- Seasons
- Episodes
- Search
- Favorites
- Watchlist
- Continue Watching
- Watch history

## Källor

- IPTV
- Plex
- Jellyfin

## IPTV-hantering

- flera IPTV-källor
- personliga IPTV-källor per användare
- redigering av IPTV-källor
- dölja hela Live TV-grupper
- dölja individuella kanaler
- dölja Movie-kategorier
- dölja individuella Movies
- dölja Series-kategorier
- dölja individuella Series

Dold information filtreras på serversidan så att samma resultat används i webbklienten, Android TV och Apple TV.

## Användare

- flera användare
- Admin/User-roller
- personliga källor
- genererade säkra lösenord
- lösenordsreset
- krav på lösenordsbyte vid nästa login
- Setup Guide för nya användare
- onboarding direkt efter första login
- separata media-inställningar per användare

## Klienter

- Web
- PWA
- Windows
- macOS
- Linux
- Android
- iPhone
- iPad
- Android TV
- Google TV
- Amazon Fire TV
- Apple TV / tvOS

## Drift

- Proxmox LXC
- installation via script
- update script
- rollback
- health check
- backup / restore
- GitHub Actions
- releaseflöde
- HTTPS-stöd

---

# Arkitektur

MyOnline TV använder i grunden följande modell:

```text
Media Source
    │
    ▼
Provider / Connector
    │
    ▼
Catalogue
    │
    ▼
Playback
    │
    ▼
Client
```

Exempel:

```text
Xtream Provider
    │
    ├── Live TV
    ├── Movies
    ├── Series
    └── EPG
         │
         ▼
   MyOnline TV API
         │
         ├── Web
         ├── Android TV
         └── Apple TV
```

---

# Repository-struktur

De viktigaste delarna i repositoryt:

```text
.
├── .github/
│   └── workflows/
│       ├── validate.yml
│       ├── release.yml
│       ├── android-tv.yml
│       └── apple-tv.yml
│
├── app/
│   ├── Program.cs
│   ├── MyOnlineTV.Web.csproj
│   └── wwwroot/
│       ├── index.html
│       ├── app.js
│       ├── styles.css
│       └── ...
│
├── clients/
│   ├── android-tv/
│   └── apple-tv/
│
├── scripts/
│
├── install-lxc.sh
├── update-from-github.sh
├── rollback.sh
├── health-check.sh
├── uninstall-lxc.sh
├── PUBLISH.cmd
├── PUBLISH.ps1
├── VERSION
├── release.json
├── CHANGELOG.md
├── LICENSE
└── README.md
```

---

# Systemkrav

## Rekommenderad servermiljö

- Proxmox VE
- Debian-baserad LXC
- x86_64
- minst 2 CPU cores
- minst 2 GB RAM
- 8–16 GB disk eller mer beroende på cache/loggar
- internetaccess
- fungerande DNS
- HTTPS

## För större installation

Rekommenderat:

```text
CPU:     4 cores
RAM:     4-8 GB
Disk:    20 GB+
Network: 1 Gbit
```

Själva mediafilerna ligger normalt inte i MyOnline TV-container om IPTV/Plex/Jellyfin används externt.

---

# Snabbstart

På Proxmox-host:

```bash
apt update
apt install -y git
```

Klona projektet:

```bash
git clone https://github.com/tuffysan/myonline-tv-lxc.git
cd myonline-tv-lxc
```

Gör scripts körbara:

```bash
chmod +x install-lxc.sh
chmod +x update-from-github.sh
chmod +x rollback.sh
chmod +x health-check.sh
chmod +x uninstall-lxc.sh
chmod +x scripts/*.sh 2>/dev/null || true
```

Installera:

```bash
./install-lxc.sh
```

---

# Installera i Proxmox LXC

## 1. Logga in på Proxmox

SSH:

```bash
ssh root@DIN-PROXMOX-IP
```

eller använd Proxmox Shell.

## 2. Installera Git

```bash
apt update
apt install -y git curl
```

## 3. Klona repositoryt

```bash
git clone https://github.com/tuffysan/myonline-tv-lxc.git
cd myonline-tv-lxc
```

## 4. Starta installationen

```bash
chmod +x install-lxc.sh
./install-lxc.sh
```

Installationsscriptet skapar och konfigurerar normalt LXC-containern åt dig.

Vanliga inställningar som kan efterfrågas:

- CT ID
- hostname
- storage
- diskstorlek
- CPU
- RAM
- bridge
- DHCP eller statisk IP
- gateway
- DNS
- applikationsport

## 5. Kontrollera container

```bash
pct list
```

Öppna shell:

```bash
pct enter <CT-ID>
```

---

# Uppdatera en befintlig LXC-installation

Använd:

```bash
./update-from-github.sh
```

Ett normalt updateflöde ska:

1. kontrollera nuvarande version
2. kontrollera tillgänglig version
3. ta backup
4. hämta ny release
5. stoppa tjänsten
6. uppdatera binärer
7. behålla persistent data
8. starta tjänsten
9. köra health check

Efter uppdatering:

```bash
./health-check.sh
```

Kontrollera tjänsten:

```bash
systemctl status myonlinetv
```

Om tjänsten heter annorlunda:

```bash
systemctl list-units --type=service | grep -i myonline
```

---

# Rollback

Om en uppdatering orsakar problem:

```bash
./rollback.sh
```

Verifiera sedan:

```bash
./health-check.sh
```

och:

```bash
systemctl status myonlinetv
```

---

# HTTPS och reverse proxy

MyOnline TV bör alltid exponeras via HTTPS.

Exempel:

```text
https://tv.example.com
```

eller:

```text
https://tv.nilsson.ink
```

Rekommenderade alternativ:

- Nginx
- Caddy
- Traefik
- Nginx Proxy Manager

Exempelarkitektur:

```text
Internet
   │
   ▼
443 / HTTPS
   │
   ▼
Nginx / Caddy
   │
   ▼
http://LXC-IP:APP-PORT
```

---

# Första uppstart

Öppna webbgränssnittet:

```text
https://din-server/
```

Första gången:

1. skapa Admin-konto
2. logga in
3. skapa användare
4. lägg till IPTV / Plex / Jellyfin
5. verifiera Live TV
6. verifiera EPG
7. verifiera Movies
8. verifiera Series

---

# Användare och säkerhet

Admin kan skapa användare och generera säkra temporära lösenord.

Rekommenderat flöde:

```text
Admin
  │
  ▼
Create User
  │
  ▼
Generate Password
  │
  ▼
User Login
  │
  ▼
Forced Password Change
  │
  ▼
Setup Guide
  │
  ▼
Home
```

## Genererade lösenord

MyOnline TV använder kryptografiskt säker lösenordsgenerering.

Rekommenderad längd:

```text
18 tecken
```

Lösenorden kan innehålla:

- A-Z
- a-z
- 2-9
- specialtecken

Tvetydiga tecken undviks där det är möjligt.

## Viktigt

Servern ska endast lagra lösenordshash, aldrig klartextlösenord.

---

# IPTV

Stöd finns för:

- Xtream
- M3U
- XMLTV

## Xtream

Vanliga uppgifter:

```text
Server URL
Username
Password
```

Exempel:

```text
https://provider.example.com
```

## M3U

Exempel:

```text
https://provider.example.com/get.php?username=USER&password=PASS&type=m3u_plus
```

## XMLTV

Exempel:

```text
https://provider.example.com/xmltv.php?username=USER&password=PASS
```

---

# Live TV

Live TV erbjuder:

- gruppnavigation
- kanallista
- logos
- search
- playback
- EPG-koppling

## Dölja grupper

Vid Edit IPTV:

```text
Live TV
  └── Groups
```

Du kan dölja hela grupper.

## Dölja individuella kanaler

Vid Edit IPTV:

```text
Live TV
  └── Channels
```

Dolda kanaler ska inte visas på andra klienter.

---

# EPG

MyOnline TV kan använda XMLTV.

Vanliga data:

- channel
- title
- start
- stop
- description

EPG används till bland annat:

- Now / Next
- TV guide
- programinformation

---

# Movies

Movies från IPTV/Xtream kan filtreras.

Du kan dölja:

- Movie-kategorier
- individuella filmer

Detta filtreras centralt på servern.

---

# Series

Series stöder:

```text
Series
  └── Seasons
       └── Episodes
```

Du kan dölja:

- Series-kategorier
- individuella serier

---

# Plex

MyOnline TV kan integrera Plex som media source.

Vanliga uppgifter:

- Plex server URL
- token
- användarkoppling

---

# Jellyfin

MyOnline TV kan integrera Jellyfin.

Vanliga uppgifter:

- Jellyfin server URL
- token/API key
- användarkoppling

---

# Installera klienten på olika enheter

MyOnline TV kan användas på flera typer av devices.

---

# Windows

## Web

Öppna:

```text
https://din-server/
```

## PWA

I Microsoft Edge eller Chrome:

1. öppna MyOnline TV
2. klicka på browsermenyn
3. välj **Install app**
4. installera

Resultat:

- egen ikon
- eget appfönster
- Start menu
- taskbar-stöd

---

# macOS

Öppna i Safari, Chrome eller Edge.

## Safari Web App

1. öppna MyOnline TV
2. välj **File**
3. välj **Add to Dock**
4. bekräfta

---

# Linux

Använd:

- Chrome
- Chromium
- Edge
- Firefox

Chromium-baserade browsers kan installera appen som PWA.

---

# Android

## PWA

I Chrome:

1. öppna MyOnline TV
2. logga in
3. öppna browsermeny
4. välj **Install app** eller **Add to Home Screen**

---

# iPhone och iPad

Öppna MyOnline TV i Safari.

1. tryck Share
2. välj **Add to Home Screen**
3. bekräfta

Appen startar sedan från Home Screen.

---

# Android TV / Google TV

Repositoryt innehåller native Android TV-klient:

```text
clients/android-tv/
```

## Installera APK med ADB

Aktivera Developer Mode och Network Debugging.

Anslut:

```bash
adb connect TV-IP
```

Installera:

```bash
adb install MyOnlineTV.apk
```

Uppdatera:

```bash
adb install -r MyOnlineTV.apk
```

---

# Amazon Fire TV

Fire TV är Android-baserad.

Aktivera:

- Developer Options
- ADB Debugging
- Install unknown apps

Installera:

```bash
adb connect FIRE-TV-IP
adb install MyOnlineTV.apk
```

---

# Apple TV

Repositoryt innehåller native tvOS-klient:

```text
clients/apple-tv/
```

Klienten använder:

- Swift
- SwiftUI
- AVPlayer
- MyOnline TV backend

Funktioner:

- login
- forced password change
- Setup Guide
- Live TV
- Movies
- Series
- Seasons
- Episodes
- AVPlayer
- Apple TV remote navigation

---

# Apple TV-build utan Mac

Du behöver inte äga en Mac för själva bygget.

GitHub Actions kan bygga tvOS på en hosted macOS runner.

Workflow:

```text
.github/workflows/apple-tv.yml
```

Kör:

```text
GitHub
→ Actions
→ Build Apple TV
→ Run workflow
```

---

# Apple TV unsigned build

En unsigned build verifierar att projektet kompilerar.

Den kan däremot inte installeras direkt på fysisk Apple TV.

---

# Apple TV signed build

För fysisk Apple TV krävs Apple-signering.

Vanliga GitHub Secrets:

```text
APPLE_TEAM_ID
APPLE_SIGNING_IDENTITY
APPLE_CERTIFICATE_P12_BASE64
APPLE_CERTIFICATE_PASSWORD
APPLE_TV_PROVISIONING_PROFILE_BASE64
```

Repository variable:

```text
APPLE_SIGNING_ENABLED=true
```

Lagra aldrig dessa direkt i Git.

---

# Apple TV via TestFlight

Detta är den enklaste distributionsmetoden till flera Apple TV-enheter.

Flöde:

```text
GitHub Actions
      │
      ▼
Signed tvOS build
      │
      ▼
App Store Connect
      │
      ▼
TestFlight
      │
      ▼
Apple TV
```

På Apple TV:

1. installera TestFlight
2. logga in med Apple-ID
3. acceptera testinbjudan
4. installera MyOnline TV

---

# Smart TV

## Samsung Tizen

Ingen separat Tizen-app finns ännu.

Alternativ:

- TV browser
- Apple TV
- Google TV
- Fire TV

## LG webOS

Ingen separat webOS-app finns ännu.

Alternativ:

- TV browser
- Apple TV
- Google TV
- Fire TV

---

# Xbox / PlayStation

Ingen native klient finns.

Testa browser:

```text
https://din-server/
```

Playback beror på browserns codecstöd.

---

# Raspberry Pi

## Kiosk client

Exempel:

```bash
chromium --kiosk https://din-server/
```

## Server

ARM-version kan användas om applikationen publiceras för ARM64.

Proxmox LXC är dock rekommenderad servermiljö.

---

# Backup och restore

Backa upp persistent data regelbundet.

Viktigt att säkerhetskopiera:

- users
- IPTV providers
- Plex
- Jellyfin
- user preferences
- visibility preferences
- watch history
- favorites
- watchlist
- settings
- certificates
- reverse proxy config

---

# Health checks

Kör:

```bash
./health-check.sh
```

eller:

```bash
curl -f https://din-server/health
```

---

# Loggar och felsökning

## systemd

```bash
systemctl status myonlinetv
```

Loggar:

```bash
journalctl -u myonlinetv -n 200 --no-pager
```

Live log:

```bash
journalctl -u myonlinetv -f
```

---

# Build och release

## Windows

Från repository root:

```powershell
.\PUBLISH.cmd
```

eller:

```powershell
.\PUBLISH.ps1
```

---

# GitHub Actions

Vanliga workflows:

```text
validate.yml
release.yml
android-tv.yml
apple-tv.yml
```

---

# Android TV-build

Från Android-projekt:

```bash
./gradlew assembleRelease
```

Resultatet blir normalt en APK under build outputs.

---

# Apple TV-build

GitHub Actions:

```text
Actions
→ Build Apple TV
→ Run workflow
```

---

# Versionshantering

Versionsnummer finns i:

```text
VERSION
release.json
MyOnlineTV.Web.csproj
```

Exempel:

```text
34.2.1
```

Alla releasefiler bör använda samma version.

---

# Uppdatera webbklienten

Webbklienten följer serverversionen.

Om gammal frontend ligger kvar i browsercache:

- reload
- hard refresh
- close/reopen PWA
- clear browser cache

---

# Uppdatera Android TV

Installera ny APK:

```bash
adb install -r MyOnlineTV.apk
```

---

# Uppdatera Apple TV

Beroende på distributionsmetod:

- Xcode
- TestFlight
- App Store

---

# Säkerhetsrekommendationer

Använd:

- HTTPS
- starkt Admin-lösenord
- separat konto per användare
- genererade temporära lösenord
- forced password change
- brandvägg
- backup
- uppdaterad server
- hemligheter i GitHub Secrets

Undvik:

- HTTP över internet
- hårdkodade credentials
- certifikat i Git
- API tokens i source code
- delade Admin-konton

---

# Prestanda

För stora IPTV-listor rekommenderas:

- caching
- background refresh
- server-side filtering
- retry vid providerproblem
- stale cache fallback

---

# IPTV Transport Resilience

MyOnline TV har stöd för resilient provider-hantering:

- retries
- timeout handling
- ResponseEnded handling
- 408
- 425
- 429
- 5xx
- disk cache
- stale-while-revalidate

---

# Vanliga problem

## Live TV fungerar inte

Kontrollera:

- IPTV server
- username
- password
- channel ID
- provider availability

## Movies fungerar inte

Kontrollera:

- Xtream VOD support
- Movie categories
- visibility filters

## Series fungerar inte

Kontrollera:

- Xtream Series API
- Series categories
- hidden content

## Apple TV app bygger inte

Kontrollera:

```text
GitHub
→ Actions
→ Build Apple TV
```

Läs build log.

## Android TV installerar inte APK

Kontrollera:

```bash
adb devices
```

och:

```bash
adb install -r MyOnlineTV.apk
```

---

# Utveckling

## Backend

```text
C#
ASP.NET Core
.NET 10
```

## Web

```text
HTML
CSS
JavaScript
PWA
```

## Android TV

```text
Kotlin
Android SDK
Gradle
```

## Apple TV

```text
Swift
SwiftUI
AVPlayer
tvOS
```

---

# Ingen betald AI krävs

MyOnline TV ska inte vara beroende av betalda AI-API:er.

Rekommendationer och lokala smarta funktioner ska kunna köras utan externa AI-kostnader.

---

# Rekommenderad produktionstopologi

```text
                         Internet
                            │
                            ▼
                   ┌─────────────────┐
                   │ DNS / HTTPS     │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Reverse Proxy   │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Proxmox LXC     │
                   │ MyOnline TV     │
                   └────────┬────────┘
                            │
      ┌─────────────────────┼──────────────────────┐
      │                     │                      │
      ▼                     ▼                      ▼
   IPTV                   Plex                 Jellyfin
```

Klienter:

```text
Web
Windows
macOS
Linux
Android
iPhone
iPad
Android TV
Google TV
Fire TV
Apple TV
```

---

# Release checklist

Innan release:

- [ ] VERSION uppdaterad
- [ ] release.json uppdaterad
- [ ] csproj version uppdaterad
- [ ] build utan errors
- [ ] inga warnings
- [ ] Live TV testad
- [ ] EPG testad
- [ ] Movies testad
- [ ] Series testad
- [ ] Login testad
- [ ] nya användare testade
- [ ] Setup Guide testad
- [ ] Android TV build testad
- [ ] Apple TV build testad
- [ ] health check testad
- [ ] update testad
- [ ] rollback testad

---

# Support och felsökningsinformation

Vid fel, samla:

```text
MyOnline TV version
Server OS
Proxmox version
Container ID
Browser/device
Relevant log
Endpoint
HTTP status
Provider type
```

Exempel:

```bash
journalctl -u myonlinetv -n 300 --no-pager
```

---

# Licens

Se:

```text
LICENSE
```

---

# MyOnline TV

En självhostad TV-plattform för dina egna användare, dina egna media-källor och dina egna enheter.
