/**
 * File: bell.gpio.js
 * Path: /src/modules/bell
 * Author: Saša Kojadinović
 */
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/** ENV podesavanja (bez potrebe da menjaš config/index.js) */
const GPIO_DRIVER = (process.env.GPIO_DRIVER || 'auto').toLowerCase(); // 'auto' | 'gpiod' | 'pigpio' | 'mock'
const ACTIVE_LOW  = String(process.env.RELAY_ACTIVE_LOW || '0') === '1';
const CHIP_NAME   = process.env.GPIO_CHIP || 'gpiochip0'; // za libgpiod

/** ON/OFF u odnosu na logiku releja */
const ON  = ACTIVE_LOW ? 0 : 1;
const OFF = ACTIVE_LOW ? 1 : 0;

class MockRelay {
  constructor(pin) { this.pin = pin; }
  async pulse(durationMs) {
    const ms = Math.max(50, Number(durationMs) || 0);
    logger.info(`(MOCK GPIO) Relay pin=${this.pin} ACTIVE_LOW=${ACTIVE_LOW} PULSE ${ms}ms`);
    await new Promise(r => setTimeout(r, ms));
    return true;
  }
}

/** Libgpiod implementacija (Pi 5 friendly) */
class GpiodRelay {
  constructor(pin) {
    this.pin = pin;
    try {
      // node-libgpiod je C++ addon — učitavamo preko require
      // eslint-disable-next-line import/no-extraneous-dependencies
      const gpiod = require('node-libgpiod');
      this._chip = new gpiod.Chip(CHIP_NAME);          // npr. 'gpiochip0'
      this._line = this._chip.getLine(pin);            // BCM pin broj
      // requestOutput defaultValue = OFF
      // API u node-libgpiod je sinhron u većini buildova; držimo ovde try/catch
      this._line.requestOutput({ consumer: 'pametna-skola', defaultValue: OFF });
      logger.info(`[GPIO] Using libgpiod on ${CHIP_NAME}, pin=${pin}, ACTIVE_LOW=${ACTIVE_LOW}`);
    } catch (e) {
      logger.error('[GPIO] Failed to init node-libgpiod:', e?.message || e);
      throw e;
    }
  }

  async pulse(durationMs) {
    const ms = Math.max(50, Number(durationMs) || 0);
    try {
      this._line.setValue(ON);
      await new Promise(r => setTimeout(r, ms));
      this._line.setValue(OFF);
      return true;
    } catch (e) {
      logger.error('[GPIO] libgpiod pulse error:', e?.message || e);
      return false;
    }
  }

  close() {
    try { this._line?.release?.(); } catch {}
    try { this._chip?.close?.(); } catch {}
  }
}

/** Pigpio implementacija (stariji pristup, može praviti probleme na Pi 5) */
class PigpioRelay {
  constructor(pin) {
    let Gpio;
    try {
      // eslint-disable-next-line import/no-extraneous-dependencies
      ({ Gpio } = require('pigpio'));
    } catch (e) {
      logger.error('[GPIO] pigpio module not found:', e?.message || e);
      throw e;
    }
    try {
      this.gpio = new Gpio(pin, { mode: Gpio.OUTPUT });
      // inicijalno OFF
      this.gpio.digitalWrite(OFF);
      logger.info(`[GPIO] Using pigpio, pin=${pin}, ACTIVE_LOW=${ACTIVE_LOW}`);
    } catch (e) {
      logger.error('[GPIO] pigpio init error:', e?.message || e);
      throw e;
    }
  }

  async pulse(durationMs) {
    const ms = Math.max(50, Number(durationMs) || 0);
    try {
      this.gpio.digitalWrite(ON);
      await new Promise(r => setTimeout(r, ms));
      this.gpio.digitalWrite(OFF);
      return true;
    } catch (e) {
      logger.error('[GPIO] pigpio pulse error:', e?.message || e);
      return false;
    }
  }
}

let relayInstance = null;

export function getRelay() {
  if (relayInstance) return relayInstance;

  // 1) Ako je mock forsiran kroz config
  if (config.mockGpio || GPIO_DRIVER === 'mock') {
    logger.warn('[GPIO] Using MOCK driver by configuration.');
    relayInstance = new MockRelay(config.relayPin);
    return relayInstance;
  }

  // Helper za "probaj gpiod → pigpio → mock"
  const tryLibgpiod = () => {
    try {
      // Proveri da li paket postoji pre instanciranja
      require.resolve('node-libgpiod');
      return new GpiodRelay(config.relayPin);
    } catch (e) {
      logger.warn('[GPIO] node-libgpiod not available or failed to init, reason:', e?.message || e);
      return null;
    }
  };

  const tryPigpio = () => {
    try {
      require.resolve('pigpio');
      return new PigpioRelay(config.relayPin);
    } catch (e) {
      logger.warn('[GPIO] pigpio not available or failed to init, reason:', e?.message || e);
      return null;
    }
  };

  // 2) Forsirani drajver
  if (GPIO_DRIVER === 'gpiod') {
    const r = tryLibgpiod();
    if (r) { relayInstance = r; return relayInstance; }
    logger.warn('[GPIO] Forced gpiod requested but failed — falling back to MOCK.');
    relayInstance = new MockRelay(config.relayPin);
    return relayInstance;
  }

  if (GPIO_DRIVER === 'pigpio') {
    const r = tryPigpio();
    if (r) { relayInstance = r; return relayInstance; }
    logger.warn('[GPIO] Forced pigpio requested but failed — falling back to MOCK.');
    relayInstance = new MockRelay(config.relayPin);
    return relayInstance;
  }

  // 3) AUTO: probaj libgpiod → pigpio → mock
  let r = tryLibgpiod();
  if (!r) r = tryPigpio();
  if (!r) {
    logger.warn('[GPIO] No real GPIO driver available, using MOCK.');
    r = new MockRelay(config.relayPin);
  }
  relayInstance = r;
  return relayInstance;
}
