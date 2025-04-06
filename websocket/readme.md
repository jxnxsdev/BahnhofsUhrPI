# PiFace WebSocket Server

Dies ist ein Python-basiertes WebSocket-Modul für die Steuerung von PiFace Digital 2-Relais und Eingabepins auf einem Raspberry Pi. Der Server ermöglicht es, die Relais und Pins über WebSocket-Nachrichten zu steuern. Zusätzlich können Callback-Funktionen registriert werden, um auf Änderungen der Pin-Zustände zu reagieren.

## Voraussetzungen

- Raspberry Pi mit PiFace Digital 2
- Python 3.x
- Die folgenden Python-Pakete müssen installiert sein:
  - `pifacecommon`
  - `pifacedigitalio`
  - `websocket-server`
