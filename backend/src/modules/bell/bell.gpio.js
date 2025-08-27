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

// U runtime-u se parsira ispravno
function parseActiveLow() {
  return /^(1|true|yes|on)$/i.test(String(process.env.RELAY_ACTIVE_LOW ?? '1'));
}

const CHIP_NAME  = process.env.GPIO_CHIP || 'gpiochip0';
const GPIOSET_BIN = process.env.GPIOSET_BIN || '/usr/bin/gpioset';
const GPIOGET_BIN = process.env.GPIOGET_BIN || '/usr/bin/gpioget';

function execGpioset(chip, pin, value) {
  return new Promise((resolve, reject) => {
    const args = ['--mode=exit', chip, `${pin}=${value}`];
    const cmd = spawn(GPIOSET_BIN, args);
    cmd.on('error', (err) => {
      logger.error('[GPIO] gpioset error', err);
      reject(err);
    });
    cmd.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`gpioset exit ${code}`)));
  });
}

function execGpioget(chip, pin) {
  return new Promise((resolve, reject) => {
    const cmd = spawn(GPIOGET_BIN, [chip, String(pin)]);
    let out = '';
    cmd.stdout.on('data', (d) => (out += d.toString()));
    cmd.on('error', reject);
    cmd.on('exit', (code) => {
      if (code === 0) {
        const v = parseInt(out.trim(), 10);
        resolve(Number.isNaN(v) ? null : v);
      } else {
        reject(new Error(`gpioget exit ${code}`));
      }
    });
  });
}

class GpiosetRelay {
  constructor(pin) {
    this.pin = Number(pin);
    this.activeLow = parseActiveLow();
    this.ON = this.activeLow ? 0 : 1;
    this.OFF = this.activeLow ? 1 : 0;

    logger.info(`[GPIO] init chip=${CHIP_NAME}, pin=${this.pin}, activeLow=${this.activeLow}, channel=${RELAY_CHANNEL}`);
  }

  async pulse(durationMs) {
    const ms = Math.max(50, Number(durationMs) || 0);
    logger.info(`[GPIO] pulse ON=${this.ON} OFF=${this.OFF} pin=${this.pin} dur=${ms}ms`);
    await execGpioset(CHIP_NAME, this.pin, this.ON);
    await sleep(ms);
    await execGpioset(CHIP_NAME, this.pin, this.OFF);
    return true;
  }

  async on() {
    await execGpioset(CHIP_NAME, this.pin, this.ON);
  }

  async off() {
    await execGpioset(CHIP_NAME, this.pin, this.OFF);
  }

  async read() {
    return await execGpioget(CHIP_NAME, this.pin);
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let relayInstance = null;

export function getRelay() {
  if (!relayInstance) relayInstance = new GpiosetRelay(RELAY_PIN);
  return relayInstance;
}

// Garantuj OFF na startu aplikacije
export async function initRelaySafeOff() {
  try {
    const activeLow = parseActiveLow();
    const offLevel = activeLow ? 1 : 0;
    await execGpioset(CHIP_NAME, RELAY_PIN, offLevel);
    logger.info(`[GPIO] safe OFF set pin=${RELAY_PIN} level=${offLevel}`);
  } catch (e) {
    logger.error('[GPIO] safe OFF failed', e);
  }
}

// za debug/test
export const _debug = { RELAY_PIN, CHIP_NAME, RELAY_CHANNEL, GPIOSET_BIN };
