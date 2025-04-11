# BahnhofsUhrPI

**BahnhofsUhrPI** ist ein Python-basiertes Projekt zur Steuerung von analogen Bahnhofsuhren mithilfe eines
Raspberry Pi (Modell 2B) und eines PiFace Digital 2 Shields. Es ermöglicht die präzise Ansteuerung des Uhrwerks
über definierte Impulse, die über die GPIO-Pins des PiFace ausgegeben werden.

## Funktionsweise des Uhrwerks

Das Uhrwerk der Bahnhofsuhren wird durch elektrische Impulse gesteuert. Jeder Impuls bewegt den Minutenzeiger
um eine Minute vorwärts. Durch periodisches Senden dieser Impulse kann die Uhrzeit genau eingestellt und
synchronisiert werden. Das PiFace Digital 2 Shield übernimmt dabei die Ausgabe der Steuerimpulse über seine
Relais Ausgänge.

Belegung der Relais Ausgänge:

| Klemme | Relais 1  | Relais 2  |
| ------ | --------- | --------- |
| COM    | Uhr Pin 1 | Uhr Pin 2 |
| NC     | -12V      | +12V      |
| NO     | +12V      | -12V      |

Belegung der Ausgangspins:

| Ausgang | Funktion                             |
| ------- | ------------------------------------ |
| 2       | Status LED (System Bereit)           |
| 3       | Status LED (Echtzeitmodus Aktiviert) |
| 4       | Status LED (Schaltstatus Ausgang)    |
| 4       | Status LED (Schaltstatus Ausgang)    |

## Systemanforderungen

- **Hardware**:
  - Raspberry Pi Model 2B
  - PiFace Digital 2 Shield
- **Betriebssystem**:
  - Raspbian Buster (Legacy-Version)
- **Softwarepakete**:
  - Python 3
  - `pifacecommon`
  - `pifacedigitalio`

## Installation

### Vorbereitung

1. **SPI-Schnittstelle aktivieren**:
   - Führe `sudo raspi-config` aus.
   - Navigiere zu `Interfacing Options` > `SPI` und aktiviere die Schnittstelle.
   - Starte den Raspberry Pi neu.

2. **System aktualisieren**:
   ```bash
   sudo apt-get update
   sudo apt-get upgrade
   ```

### Installation der benötigten Python-Pakete

Installiere die erforderlichen Python-Pakete mit `pip3`:
```bash
sudo apt install python3-pip
sudo pip3 install pifacecommon
sudo pip3 install pifacedigitalio
```

## Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](https://opensource.org/licenses/MIT).

## Autor

Entwickelt von [jxnxsdev](https://github.com/jxnxsdev).

---

*Hinweis: Dieses Projekt wurde für die Verwendung mit älteren Raspberry Pi Modellen und der Raspbian Buster (Legacy) Version entwickelt. Die Kompatibilität mit neueren Raspberry Pi Modellen und Betriebssystemversionen wurde nicht getestet.*

--- 
