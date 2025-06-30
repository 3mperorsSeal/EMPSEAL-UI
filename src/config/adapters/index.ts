import pulsechainAdapters from './pulsechain.json';
import ethwAdapters from './ethw.json';
import sonicAdapters from './sonic.json';
import baseAdapters from './base.json';

export const CHAIN_ADAPTERS: Record<number, any[]> = {
  369: pulsechainAdapters,
  10001: ethwAdapters,
  146: sonicAdapters,
  8453: baseAdapters,
};
