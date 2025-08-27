/**
 * File: bell.gpio.js
 * Path: /src/modules/bell
 * Author: Saša Kojadinović
 */
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { spawn } from 'child_process';

// Waveshare kanali → BCM pinovi
const CHANNEL_PINS = { CH1: 26, CH2: 20, CH3: 21 };
const RELAY_CHANNEL = (process.env.RELAY_CHANNEL || 'CH1').toUpperCase();
const DEFAULT_PIN   = CHANNEL_PINS[RELAY_CHANNEL] ?? CHANNEL_PINS.CH1;

// Back-compat: ako je RELAY_PIN definisan, on ima prednost
const RELAY_PIN = Number(process.env.RELAY_PIN || config.relayPin || DEFAULT_PIN);

// Waveshare je low-active → default 1 (može da se prepiše preko env-a)
const ACTIVE_LOW = String(process.env.RELAY_ACTIVE_LOW ?? '1') === '1';
const CHIP_NAME  = process.env.GPIO_CHIP || 'gpiochip0';

const ON  = ACTIVE_LOW ? 0 : 1; // LOW uključuje relej
const OFF = ACTIVE_LOW ? 1 : 0;

class GpiosetRelay {
  constructor(pin) {
    this.pin = Number(pin);
    logger.info(`[GPIO] init chip=${CHIP_NAME}, pin=${this.pin}, activeLow=${ACTIVE_LOW}, channel=${RELAY_CHANNEL}`);
  }
  async pulse(durationMs) {
    const ms = Math.max(50, Number(durationMs) || 0);
    logger.info(`[GPIO] pulse ON=${ON} OFF=${OFF} pin=${this.pin} dur=${ms}ms`);
    await execGpioset(CHIP_NAME, this.pin, ON);
    await sleep(ms);
    await execGpioset(CHIP_NAME, this.pin, OFF);
    return true;
  }
  async on()  { await execGpioset(CHIP_NAME, this.pin, ON);  }
  async off() { await execGpioset(CHIP_NAME, this.pin, OFF); }
}

function execGpioset(chip, pin, value) {
  return new Promise((resolve, reject) => {
    const cmd = spawn('gpioset', [chip, `${pin}=${value}`]);
    cmd.on('error', reject);
    cmd.on('exit', code => code === 0 ? resolve() : reject(new Error(`gpioset exit ${code}`)));
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let relayInstance = null;
export function getRelay() {
  if (!relayInstance) relayInstance = new GpiosetRelay(RELAY_PIN);
  return relayInstance;
}
