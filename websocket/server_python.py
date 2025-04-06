import pifacedigitalio
import json
from websocket_server import WebsocketServer

# Setup PiFace
piface = pifacedigitalio.PiFaceDigital()

# Callback-Funktion, die aufgerufen wird, wenn ein WebSocket verbunden wird
def new_client(client, server):
    print(f"Neuer Client verbunden: {client['address']}")

# Callback-Funktion, die aufgerufen wird, wenn ein WebSocket-Nachricht empfangen wird
def message_received(client, server, message):
    try:
        data = json.loads(message)
        action = data.get('action')
        pin = data.get('pin')

        if action == 'on' and pin is not None:
            if pin < 2:  # Relais sind auf den Pins 0-7
                # Relais ein- oder Ausgang einschalten
                if piface.relays[pin].value == 0:
                    piface.relays[pin].turn_on()
            else:
                # Oder für Ausgang
                if piface.output_pins[pin].value == 0:
                    piface.output_pins[pin].turn_on()

        elif action == 'off' and pin is not None:
            if pin < 2:
                # Relais ein- oder Ausgang ausschalten
                if piface.relays[pin].value == 1:
                    piface.relays[pin].turn_off()
            else:
                # Oder für Ausgang
                if piface.output_pins[pin].value == 1:
                    piface.output_pins[pin].turn_off()

        else:
            server.send_message(client, json.dumps({"error": "Ungültige Aktion oder Pin"}))

    except Exception as e:
        server.send_message(client, json.dumps({"error": f"Fehler: {str(e)}"}))

# Callback-Funktion, die aufgerufen wird, wenn ein Eingangspin sich ändert
def switch_pressed(event):
    print(f"Eingang {event.pin_num} eingeschaltet")
    server.send_message_to_all(json.dumps({"status": f"Eingang {event.pin_num} eingeschaltet"}))

def switch_unpressed(event):
    print(f"Eingang {event.pin_num} ausgeschaltet")
    server.send_message_to_all(json.dumps({"status": f"Eingang {event.pin_num} ausgeschaltet"}))

server = WebsocketServer(host="0.0.0.0", port=3000)
server.set_fn_new_client(new_client)
server.set_fn_message_received(message_received)

listener = pifacedigitalio.InputEventListener(chip=piface)
for i in range(8):  # 8 Eingänge
    listener.register(i, pifacedigitalio.IODIR_ON, switch_pressed)
    listener.register(i, pifacedigitalio.IODIR_OFF, switch_unpressed)

listener.activate()

print("WebSocket-Server läuft auf Port 3000...")
server.run_forever()
