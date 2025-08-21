/**
 * File: bell.gpio.js
 * Path: /src/modules/bell
 * Author: Saša Kojadinović
 */
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

class MockRelay {
  constructor(pin) { this.pin = pin; }
  async pulse(durationMs) {
    logger.info(`(MOCK GPIO) Relay on pin ${this.pin} PULSE ${durationMs}ms`);
    await new Promise(r => setTimeout(r, durationMs));
    return true;
  }
}

let relayInstance = null;

export function getRelay() {
  if (relayInstance) return relayInstance;

  if (config.mockGpio) {
    relayInstance = new MockRelay(config.relayPin);
    return relayInstance;
  }

  let Gpio = null;
  try {
    ({ Gpio } = require('pigpio'));
  } catch (e) {
    logger.warn('pigpio not available, falling back to MOCK GPIO');
  }

  if (!Gpio) {
    relayInstance = new MockRelay(config.relayPin);
    return relayInstance;
  }

  class PigpioRelay {
    constructor(pin) {
      this.gpio = new Gpio(pin, { mode: Gpio.OUTPUT });
    }
    async pulse(durationMs) {
      this.gpio.digitalWrite(1);
      await new Promise(r => setTimeout(r, durationMs));
      this.gpio.digitalWrite(0);
      return true;
    }
  }

  relayInstance = new PigpioRelay(config.relayPin);
  return relayInstance;
}
