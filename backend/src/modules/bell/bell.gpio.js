/**
 * File: bell.gpio.js
 * Path: /src/modules/bell
 * Author: Saša Kojadinović
 */
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const RELAY_PIN = Number(process.env.RELAY_PIN || config.relayPin || 18);
const ACTIVE_LOW = String(process.env.RELAY_ACTIVE_LOW || '0') === '1';
const CHIP_NAME = process.env.GPIO_CHIP || 'gpiochip0';
const FORCE_DRIVER = (process.env.GPIO_DRIVER || 'auto').toLowerCase(); // 'gpiod' | 'pigpio' | 'mock' | 'auto'

const ON = ACTIVE_LOW ? 0 : 1;
const OFF = ACTIVE_LOW ? 1 : 0;

class MockRelay {
  constructor(pin) {
    this.pin = pin;
  }
  async pulse(durationMs) {
    const ms = Math.max(50, Number(durationMs) || 0);
    logger.info(`(MOCK GPIO) Relay pin=${this.pin} ACTIVE_LOW=${ACTIVE_LOW} PULSE ${ms}ms`);
    await new Promise((r) => setTimeout(r, ms));
    return true;
  }
}

class LibgpiodRelay {
  constructor(chip = CHIP_NAME, pin = RELAY_PIN) {
    const gpiod = require('node-libgpiod');
    this._chip = new gpiod.Chip(chip);
    this._line = this._chip.getLine(pin);
    try {
      this._line.requestOutput({ consumer: 'pametna-skola', activeLow: ACTIVE_LOW });
      logger.info(`[GPIO] Using libgpiod on ${chip}, pin=${pin}, ACTIVE_LOW=${ACTIVE_LOW}`);
    } catch (e) {
      logger.error('[GPIO] libgpiod requestOutput failed:', e.message || e);
      throw e;
    }
  }

  async pulse(durationMs) {
    const ms = Math.max(50, Number(durationMs) || 0);
    this._line.setValue(ON);
    await new Promise((r) => setTimeout(r, ms));
    this._line.setValue(OFF);
    return true;
  }

  close() {
    try {
      this._line?.release?.();
      this._chip?.close?.();
    } catch {}
  }
}

class PigpioRelay {
  constructor(pin = RELAY_PIN) {
    const { Gpio } = require('pigpio');
    this.gpio = new Gpio(pin, { mode: Gpio.OUTPUT });
    this.gpio.digitalWrite(OFF);
    logger.info(`[GPIO] Using pigpio, pin=${pin}, ACTIVE_LOW=${ACTIVE_LOW}`);
  }

  async pulse(durationMs) {
    const ms = Math.max(50, Number(durationMs) || 0);
    this.gpio.digitalWrite(ON);
    await new Promise((r) => setTimeout(r, ms));
    this.gpio.digitalWrite(OFF);
    return true;
  }
}

let relayInstance = null;

export function getRelay() {
  if (relayInstance) return relayInstance;

  if (config.mockGpio || FORCE_DRIVER === 'mock') {
    logger.warn('[GPIO] Using MOCK driver');
    relayInstance = new MockRelay(RELAY_PIN);
    return relayInstance;
  }

  const tryLibgpiod = () => {
    try {
      require.resolve('node-libgpiod');
      return new LibgpiodRelay(CHIP_NAME, RELAY_PIN);
    } catch (e) {
      logger.warn('[GPIO] libgpiod not available or failed:', e.message || e);
      return null;
    }
  };

  const tryPigpio = () => {
    try {
      require.resolve('pigpio');
      return new PigpioRelay(RELAY_PIN);
    } catch (e) {
      logger.warn('[GPIO] pigpio not available or failed:', e.message || e);
      return null;
    }
  };

  if (FORCE_DRIVER === 'gpiod') {
    const r = tryLibgpiod();
    relayInstance = r || new MockRelay(RELAY_PIN);
    return relayInstance;
  }

  if (FORCE_DRIVER === 'pigpio') {
    const r = tryPigpio();
    relayInstance = r || new MockRelay(RELAY_PIN);
    return relayInstance;
  }

  let r = tryLibgpiod();
  if (!r) r = tryPigpio();
  if (!r) {
    logger.warn('[GPIO] Falling back to MOCK GPIO');
    r = new MockRelay(RELAY_PIN);
  }

  relayInstance = r;
  return relayInstance;
}

