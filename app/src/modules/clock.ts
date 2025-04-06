import { PiFaceController } from './piface';
import { getConfig, setLastTime, setUseRealTime } from './config';
import { exec } from 'child_process';

export class ClockController {
    private piface: PiFaceController;
    private lastTick: number;
    private clockTicksQueue: number;
    public operationInProgress: boolean;
    public calculationInProgress: boolean = false;
    public currentTargetTime: string | null = null;
    private statusSet: boolean = false;
    private shutdownCounter = 0;

    constructor() {
        this.piface = new PiFaceController(process.env.WEBSOCKET_SERVER, Number(process.env.WEBSOCKET_PORT));
        this.lastTick = 0;
        this.clockTicksQueue = 0;
        this.operationInProgress = false;

        getConfig().then(config => {
            this.currentTargetTime = config.lastTime;
        }).catch(err => {
            console.error('Error loading configuration:', err);
        });

        this.startTickProcessing();
        this.startCurrentTime();

        this.piface.onPinOff(0, async (pin) => {
            const currentTime = this.currentTargetTime;

            const config = await getConfig();
            const useRealTime = config.useRealTime;

            if (useRealTime) return;

            const [hours, minutes] = currentTime.split(':').map(Number);
            let newHours = hours;
            let newMinutes = minutes + 1;
            if (newMinutes > 59) {
                newMinutes = 0;
                newHours = (newHours % 12) + 1;
            }
            const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
            await this.tickToTime(newTime);
        });

        this.piface.onPinOff(1, async (pin) => {
            // skip 1 hour
            const currentTime = this.currentTargetTime;
            const config = await getConfig();
            const useRealTime = config.useRealTime;
            if (useRealTime) return;

            const [hours, minutes] = currentTime.split(':').map(Number);
            let newHours = hours + 1;
            let newMinutes = minutes;
            if (newHours > 12) {
                newHours = 1;
            }
            const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
            await this.tickToTime(newTime);
            console.log('Clock ticked to:', newTime);
        });

        this.piface.onPinOff(2, async (pin) => {
            const config = await getConfig();
            const useRealTime = config.useRealTime;
            
            if (useRealTime === true) {
                await setUseRealTime(false);
                await this.piface.turnPinOff(3);
            } else {
                await setUseRealTime(true);
                await this.piface.turnPinOn(3);
            }
        });

        this.piface.onPinOff(3, async (pin) => {
            this.shutdownCounter++;
            if (this.shutdownCounter >= 3) {
                this.shutdownCounter = 0;
                exec('sudo shutdown now', (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error shutting down: ${error.message}`);
                        return;
                    }
                    if (stderr) {
                        console.error(`Shutdown stderr: ${stderr}`);
                        return;
                    }
                    console.log(`Shutdown stdout: ${stdout}`);
                });
                console.log('Shutting down...');
            }
        });

    }

    public addClockTicks(ticks: number): void {
        this.clockTicksQueue += ticks;
    }

    private async startCurrentTime(): Promise<void> {
        setInterval(async () => {
            this.shutdownCounter = 0;
            try {
                const config = await getConfig();
                const useRealTime = config.useRealTime;
                if (useRealTime) {
                    const date = new Date();
                    const hours = date.getHours() % 12 || 12;
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    const currentTime = `${hours}:${minutes}`;
                    await this.tickToTime(currentTime);
                }
            } catch (err) {
                console.error('Error in startCurrentTime:', err);
            }
        }, 1000);
    }

    private async startTickProcessing(): Promise<void> {
        setInterval(async () => {
            try {
                const config = await getConfig();
                const intervalTime = config.intervalTime;

                if (this.clockTicksQueue > 0 && !this.operationInProgress) {
                    if (!this.piface.isConnected) {
                        console.log('PiFace is not connected, skipping tick processing.');
                        return;
                    }
                    await this.processTick();
                    if (!this.statusSet) {
                        this.piface.turnPinOn(3);
                        if (config.useRealTime) {
                            this.piface.turnPinOn(3);
                        } else this.piface.turnPinOff(2);
                        this.statusSet = true;
                    }
                }
            } catch (err) {
                console.error('Error in startTickProcessing:', err);
            }
        }, (await getConfig()).intervalTime * 2);
    }

    private async processTick(): Promise<void> {
        if (this.clockTicksQueue > 0) {
            this.operationInProgress = true;
            try {
                await this.piface.turnPinOn(0);
                await this.piface.turnPinOn(1);
                const config = await getConfig();
                const intervalTime = config.intervalTime;
                await new Promise(resolve => setTimeout(resolve, intervalTime));
                await this.piface.turnPinOff(0);
                await this.piface.turnPinOff(1);
                this.clockTicksQueue--;
                console.log('Tick processed, remaining ticks:', this.clockTicksQueue);
            } catch (err) {
                console.error('Error processing tick:', err);
            } finally {
                this.operationInProgress = false;
            }
        }
    }

    public async tickToTime(time: string): Promise<boolean> {
        if (this.calculationInProgress) {
            console.log('Operation in progress, cannot set time.');
            return false;
        }

        if (this.currentTargetTime === time) {
            return true;
        }

        this.calculationInProgress = true;
        try {
            const normalize12Hour = (h: number) => (h % 12 === 0 ? 12 : h % 12);

            const targetTime = time.split(':');
            const targetHour = parseInt(targetTime[0], 10);
            const targetMinute = parseInt(targetTime[1], 10);

            const currentTime = this.currentTargetTime.split(':');
            const currentHour = parseInt(currentTime[0], 10);
            const currentMinute = parseInt(currentTime[1], 10);

            const normTargetHour = normalize12Hour(targetHour);
            const normCurrentHour = normalize12Hour(currentHour);

            const targetTotalMinutes = normTargetHour * 60 + targetMinute;
            const currentTotalMinutes = normCurrentHour * 60 + currentMinute;

            const difference = (targetTotalMinutes - currentTotalMinutes + 720) % 720;

            this.addClockTicks(difference);
            this.currentTargetTime = time;
            await setLastTime(time);
            return true;
        } catch (err) {
            console.error('Error in tickToTime:', err);
            return false;
        } finally {
            this.calculationInProgress = false;
        }
    }


    public async overrideTime(time: string): Promise<boolean> {
        if (this.calculationInProgress) {
            console.log('Operation in progress, cannot set time.');
            return false;
        }

        this.calculationInProgress = true;
        try {
            this.currentTargetTime = time;
            await setLastTime(time);
            console.log('Clock set to target time:', time);
            return true;
        } catch (err) {
            console.error('Error in overrideTime:', err);
            return false;
        } finally {
            this.calculationInProgress = false;
        }
    }

    public async getPiFace(): Promise<PiFaceController> {
        return this.piface;
    }
}
