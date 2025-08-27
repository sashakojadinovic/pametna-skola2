/**
 * File: bell.gpio.js
 * Path: /src/modules/bell
 * Author: Saša Kojadinović
 */
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { spawn } from 'child_process';

const RELAY_PIN = Number(process.env.RELAY_PIN || config.relayPin || 18);
const ACTIVE_LOW = String(process.env.RELAY_ACTIVE_LOW || '0') === '1';
const CHIP_NAME = process.env.GPIO_CHIP || 'gpiochip0';

const ON  = ACTIVE_LOW ? 0 : 1;
const OFF = ACTIVE_LOW ? 1 : 0;

class GpiosetRelay {
  async pulse(durationMs) {
    const ms = Math.max(50, Number(durationMs) || 0);

    logger.info(`[GPIO] Trigger via gpioset: ON=${ON}, OFF=${OFF}, pin=${RELAY_PIN}, duration=${ms}ms`);

    // turn ON
    await execGpioset(CHIP_NAME, RELAY_PIN, ON);
    await new Promise(r => setTimeout(r, ms));
    // turn OFF
    await execGpioset(CHIP_NAME, RELAY_PIN, OFF);
    return true;
  }
}

function execGpioset(chip, pin, value) {
  return new Promise((resolve, reject) => {
    const pinStr = `${pin}=${value}`;
    const cmd = spawn('gpioset', [chip, pinStr]);
    cmd.on('error', reject);
    cmd.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`gpioset exit code ${code}`))));
  });
}

let relayInstance = null;

export function getRelay() {
  if (!relayInstance) {
    relayInstance = new GpiosetRelay();
  }
  return relayInstance;
}
