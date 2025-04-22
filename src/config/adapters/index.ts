import pulsechainAdapters from './pulsechain.json';
import ethwAdapters from './ethw.json';

export const CHAIN_ADAPTERS: Record<number, any[]> = {
  369: pulsechainAdapters,
  10001: ethwAdapters,
};
