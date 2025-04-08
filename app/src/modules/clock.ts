import { PiFaceController } from './piface';
import { getConfig, setLastRelayState, setLastTime, setUseRealTime } from './config';
import { exec } from 'child_process';

export class ClockController {
    private piface: PiFaceController;
    private clockTicksQueue = 0;
    private lastRelayState = false;
    private shutdownCounter = 0;
    private statusSet = false;

    public operationInProgress = false;
    public calculationInProgress = false;
    public currentTargetTime: string | null = null;

    constructor() {
        this.piface = new PiFaceController("127.0.0.1", 3000);

        getConfig().then(config => {
            this.currentTargetTime = config.lastTime;
            this.lastRelayState = config.lastRelayState;
        });

        this.setupInputHandlers();
        this.startClockUpdater();
        this.startTickProcessor();
    }

    public addClockTicks(ticks: number): void {
        this.clockTicksQueue += ticks;
    }

    private setupInputHandlers(): void {
        this.piface.onPinOff(0, async () => {
            const config = await getConfig();
            if (config.useRealTime) return;

            const [h, m] = this.currentTargetTime.split(':').map(Number);
            const newMinutes = (m + 1) % 60;
            const newHours = newMinutes === 0 ? (h % 12) + 1 : h;
            const time = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
            await this.tickToTime(time);
        });

        this.piface.onPinOff(1, async () => {
            const config = await getConfig();
            if (config.useRealTime) return;

            const [h, m] = this.currentTargetTime.split(':').map(Number);
            const newHours = h % 12 + 1;
            const time = `${newHours.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            await this.tickToTime(time);
        });

        this.piface.onPinOff(2, async () => {
            const config = await getConfig();
            const newState = !config.useRealTime;
            await setUseRealTime(newState);
            if (newState) {
                await this.piface.turnPinOn(3);
            } else {
                await this.piface.turnPinOff(3);
            }
        });

        this.piface.onPinOff(3, async () => {
            if (this.clockTicksQueue > 0) return; // Prevent shutdown if there are remaining ticks
            this.shutdownCounter++;
            if (this.shutdownCounter >= 3) {
                this.shutdownCounter = 0;
                await this.shutdown().then(() => {
                    exec('sudo shutdown now');
                });
            }
        });
    }

    private startClockUpdater(): void {
        setInterval(async () => {
            try {
                const config = await getConfig();
                if (!config.useRealTime) return;

                const now = new Date();
                const h = now.getHours() % 12 || 12;
                const m = now.getMinutes();
                const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                await this.tickToTime(time);
            } catch {}
        }, 1000);
    }

    private async startTickProcessor(): Promise<void> {
        const config = await getConfig();
        const interval = config.intervalTime;

        setInterval(async () => {
            if (!this.statusSet && this.piface.isConnected) {
                await this.piface.turnPinOn(2);
                if (!config.useRealTime) await this.piface.turnPinOff(3); else await this.piface.turnPinOn(3);
                this.statusSet = true;
            }
            if (this.operationInProgress || !this.piface.isConnected || this.clockTicksQueue === 0) return;
            
            this.operationInProgress = true;
            try {
                await this.processTick();
            } finally {
                this.operationInProgress = false;
            }
        }, interval);
    }

    private async processTick(): Promise<void> {
        if (this.clockTicksQueue <= 0) return;

        this.lastRelayState = !this.lastRelayState;

        if (this.lastRelayState) {
            await this.piface.turnPinOn(0);
            await this.piface.turnPinOn(1);
            await this.piface.turnPinOn(4);
            await this.piface.turnPinOff(5);
        } else {
            await this.piface.turnPinOff(0);
            await this.piface.turnPinOff(1);
            await this.piface.turnPinOff(4);
            await this.piface.turnPinOn(5);
        }

        this.clockTicksQueue--;

        await setLastRelayState(this.lastRelayState);
        console.log('Tick processed. Remaining:', this.clockTicksQueue);
    }

    public async tickToTime(target: string): Promise<boolean> {
        if (this.calculationInProgress || this.currentTargetTime === target) return false;

        this.calculationInProgress = true;
        try {
            const parse = (t: string) => t.split(':').map(Number);
            const [th, tm] = parse(target);
            const [ch, cm] = parse(this.currentTargetTime);

            const toMin = (h: number, m: number) => ((h % 12 || 12) * 60 + m) % 720;

            const diff = (toMin(th, tm) - toMin(ch, cm) + 720) % 720;
            this.addClockTicks(diff);

            this.currentTargetTime = target;
            await setLastTime(target);
            return true;
        } catch {
            return false;
        } finally {
            this.calculationInProgress = false;
        }
    }

    public async overrideTime(time: string): Promise<boolean> {
        if (this.calculationInProgress) return false;

        this.calculationInProgress = true;
        try {
            this.currentTargetTime = time;
            await setLastTime(time);
            return true;
        } finally {
            this.calculationInProgress = false;
        }
    }

    public async getPiFace(): Promise<PiFaceController> {
        return this.piface;
    }

    public async shutdown(): Promise<void> {
        await setLastRelayState(this.lastRelayState);
        await setLastTime(this.currentTargetTime);

        await this.piface.turnPinOff(0);
        await this.piface.turnPinOff(1);
        await this.piface.turnPinOff(2);
        await this.piface.turnPinOff(3);
        await this.piface.turnPinOff(4);
        await this.piface.turnPinOff(5);
    }
}
