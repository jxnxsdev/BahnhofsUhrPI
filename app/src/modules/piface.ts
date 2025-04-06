import WebSocket from 'ws';

export class PiFaceController {
  private ws: WebSocket | null;
  private pinOnCallbacks: Map<number, (pin: number) => void>;
  private pinOffCallbacks: Map<number, (pin: number) => void>;
  public isConnected: boolean;

  constructor(ip: string, port: number) {
    this.ws = null;
    this.pinOnCallbacks = new Map();
    this.pinOffCallbacks = new Map();
    this.isConnected = false;

    this.connect(ip, port);
  }

  private connect(ip: string, port: number): void {
    const url = `ws://${ip}:${port}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = async () => {
      console.log('Verbindung zum WebSocket-Server hergestellt');
      this.isConnected = true;
    };

    this.ws.onmessage = (event: WebSocket.MessageEvent) => {
      const message = JSON.parse(event.data.toString());
      if (message.status) {
        const pin = this.extractPinFromStatus(message.status);
        if (message.status.includes('eingeschaltet')) {
          this.executePinOnCallbacks(pin);
        }
        if (message.status.includes('ausgeschaltet')) {
          this.executePinOffCallbacks(pin);
        }
      }
    };

    this.ws.onerror = (event: WebSocket.ErrorEvent) => {
      console.error('WebSocket Fehler:', event.message);
    };

    this.ws.onclose = () => {
      console.log('WebSocket Verbindung geschlossen');
      this.isConnected = false;
      setTimeout(() => this.connect(ip, port), 1000);
    };
  }

  public turnPinOn(pin: number): void {
    if (this.isConnected && this.ws) {
      const message = { action: 'on', pin };
      this.ws.send(JSON.stringify(message));
    } else {
      console.log('WebSocket ist nicht verbunden, versuche es später erneut.');
    }
  }

  public turnPinOff(pin: number): void {
    if (this.isConnected && this.ws) {
      const message = { action: 'off', pin };
      this.ws.send(JSON.stringify(message));
    } else {
      console.log('WebSocket ist nicht verbunden, versuche es später erneut.');
    }
  }

  public onPinOn(pin: number, callback: (pin: number) => void): void {
    this.pinOnCallbacks.set(pin, callback);
  }

  public onPinOff(pin: number, callback: (pin: number) => void): void {
    this.pinOffCallbacks.set(pin, callback);
  }

  private extractPinFromStatus(status: string): number {
    const match = status.match(/\d+/);
    return match ? parseInt(match[0], 10) : -1;
  }

  private executePinOnCallbacks(pin: number): void {
    if (this.pinOnCallbacks.has(pin)) {
      const callback = this.pinOnCallbacks.get(pin);
      if (callback) callback(pin);
    }
  }

  private executePinOffCallbacks(pin: number): void {
    if (this.pinOffCallbacks.has(pin)) {
      const callback = this.pinOffCallbacks.get(pin);
      if (callback) callback(pin);
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}
