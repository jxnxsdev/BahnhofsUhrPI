import fs from 'fs';
import path from 'path';

export type configType = {
    intervalTime: number;
    lastTime: string;
    useRealTime: boolean;
    lastRelayState: boolean;
}

export let config: configType = {
    intervalTime: 1000,
    lastTime: "00:00",
    useRealTime: true,
    lastRelayState: false,
}

export async function loadConfig(): Promise<any> {
    const configPath = path.join('/config/config.json');
    if (!fs.existsSync(configPath)) {
        console.log("Config file not found, creating default config...");
        // create all folders if not exist
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } else {
        const configFile = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(configFile);
    }
    console.log("Config loaded:", config);
}

export async function setIntervalTime(time: number): Promise<void> {
    config.intervalTime = time;
    const configPath = path.join('/config/config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export async function setLastTime(time: string): Promise<void> {
    config.lastTime = time;
    const configPath = path.join('/config/config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export async function setUseRealTime(useRealTime: boolean): Promise<void> {
    config.useRealTime = useRealTime;
    const configPath = path.join('/config/config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export async function setLastRelayState(state: boolean): Promise<void> {
    config.lastRelayState = state;
    const configPath = path.join('/config/config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export async function getConfig(): Promise<configType> {
    return config;
}