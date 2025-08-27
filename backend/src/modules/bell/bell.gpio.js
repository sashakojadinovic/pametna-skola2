/**
 * File: bell.gpio.js
 * Path: /src/modules/bell
 * Author: Saša Kojadinović
 */

import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const gpiod = require('node-libgpiod');

const RELAY_PIN = Number(process.env.RELAY_PIN || config.relayPin || 18);
const ACTIVE_LOW = String(process.env.RELAY_ACTIVE_LOW || '0') === '1';
const CHIP_NAME = process.env.GPIO_CHIP || 'gpiochip0';

const ON = ACTIVE_LOW ? 0 : 1;
const OFF = ACTIVE_LOW ? 1 : 0;

class LibgpiodRelay {
  constructor(chip = CHIP_NAME, pin = RELAY_PIN) {
    this._chip = new gpiod.Chip(chip);
    this._line = this._chip.getLine(pin);
    try {
      this._line.request({
        consumer: 'pametna-skola',
        type: gpiod.LINE_REQ_DIR_OUT,
        defaultVal: OFF
      });
      logger.info(`[GPIO] Using libgpiod v2 on ${chip}, pin=${pin}, ACTIVE_LOW=${ACTIVE_LOW}`);
    } catch (e) {
      logger.error('[GPIO] libgpiod.request() failed:', e.message || e);
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

let relayInstance = null;

export function getRelay() {
  if (!relayInstance) {
    relayInstance = new LibgpiodRelay(CHIP_NAME, RELAY_PIN);
  }
  return relayInstance;
}
