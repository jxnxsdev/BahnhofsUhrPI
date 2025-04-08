import { config } from 'dotenv';
import { getConfig, loadConfig, setIntervalTime, setUseRealTime } from './modules/config';
import express from 'express';
import { ClockController } from './modules/clock';
import path from 'path';
import { exit } from 'process';
config();

const app = express();
let clock: ClockController;

app.get('/api/poll', (req, res) => {
    try {
        const json = {
            currentTime: clock.currentTargetTime
        };
        res.status(200).json(json);
    } catch (err) {
        res.status(500).json({
            status: 'failed',
            message: 'Server error'
        });
    }
});

app.post('/api/tickToTime', async (req, res) => {
    try {
        if (!req.query || !req.query.time) {
            res.status(400).json({
                status: 'failed',
                message: 'No time provided'
            });
            return;
        }

        const time = req.query.time as string;
        const timeRegex = /^(0?[1-9]|1[0-2]):([0-5][0-9])$/;

        if (!timeRegex.test(time)) {
            res.status(400).json({
                status: 'failed',
                message: 'Invalid time format. Use HH:MM in 12h format.'
            });
            return;
        }

        const config = await getConfig();
        const useRealTime = config.useRealTime;
        if (useRealTime) {
            res.status(400).json({
                status: 'failed',
                message: 'Cannot set time while using real time'
            });
            return;
        }

        const success = await clock.tickToTime(time);
        if (success) {
            res.status(200).json({
                status: 'success',
                message: 'Time set successfully',
                time: time
            });
        } else {
            res.status(500).json({
                status: 'failed',
                message: 'Server is currently busy, please try again later.'
            });
        }
    } catch (err) {
        res.status(500).json({
            status: 'failed',
            message: 'Server error'
        });
    }
});

app.post('/api/overrideTime', async (req, res) => {
    try {
        if (!req.query || !req.query.time) {
            res.status(400).json({
                status: 'failed',
                message: 'No time provided'
            });
            return;
        }

        const time = req.query.time as string;
        const timeRegex = /^(0?[1-9]|1[0-2]):([0-5][0-9])$/;

        if (!timeRegex.test(time)) {
            res.status(400).json({
                status: 'failed',
                message: 'Invalid time format. Use HH:MM in 12h format.'
            });
            return;
        }

        const success = await clock.overrideTime(time);
        if (success) {
            res.status(200).json({
                status: 'success',
                message: 'Time set successfully',
                time: time
            });
        } else {
            res.status(500).json({
                status: 'failed',
                message: 'Server is currently busy, please try again later.'
            });
        }
    } catch (err) {
        res.status(500).json({
            status: 'failed',
            message: 'Server error'
        });
    }
});

app.post('/api/setIntervalTime', async (req, res) => {
    try {
        if (!req.query || !req.query.time) {
            res.status(400).json({
                status: 'failed',
                message: 'No time provided'
            });
            return;
        }

        const time = parseInt(req.query.time as string);
        if (isNaN(time) || time < 50) {
            res.status(400).json({
                status: 'failed',
                message: 'Invalid time format. Use a positive number.'
            });
            return;
        }

        await setIntervalTime(time);
        res.status(200).json({
            status: 'success',
            message: 'Interval time set successfully'
        });

        exit(0);
    } catch (err) {
        res.status(500).json({
            status: 'failed',
            message: 'Server error'
        });
    }
});

app.post('/api/setUseRealTime', async (req, res) => {
    try {
        if (!req.query || !req.query.useRealTime) {
            res.status(400).json({
                status: 'failed',
                message: 'No useRealTime provided'
            });
            return;
        }

        const useRealTime = req.query.useRealTime as string;
        if (useRealTime !== 'true' && useRealTime !== 'false') {
            res.status(400).json({
                status: 'failed',
                message: 'Invalid useRealTime format. Use true or false.'
            });
            return;
        }

        await setUseRealTime(useRealTime === 'true');

        if (useRealTime === 'true') {
            await (await clock.getPiFace()).turnPinOn(3);
        } else {
            await (await clock.getPiFace()).turnPinOff(3);
        }

        res.status(200).json({
            status: 'success',
            message: 'Use real time set successfully'
        });
    } catch (err) {
        res.status(500).json({
            status: 'failed',
            message: 'Server error'
        });
    }
});

app.get('/api/getConfig', async (req, res) => {
    const config = await getConfig();
    const json = {
        intervalTime: config.intervalTime,
        lastTime: config.lastTime,
        useRealTime: config.useRealTime
    };
    res.status(200).json(json);
});

app.use(express.static(path.join(__dirname, '../public')));

app.listen("80", async () => {
    try {
        console.log(`Server is running on port 80`);
        await loadConfig();
        clock = new ClockController();
    } catch (err) {
        console.error('Error loading configuration or initializing clock:', err);
    }
});
