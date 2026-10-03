import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { PLANTED_WORD_KEY, readPlantedWord, rememberPlantedWord, SeedPacketCta, seedCtaHref } from './SeedPacketCta';

const ctaHref = () => screen.getByRole('link', { name: 'Create free account' }).getAttribute('href');

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('SeedPacketCta (Home page v2 HP-9)', () => {
  it('goes to /register when no word was planted', () => {
    renderWithIntl(<SeedPacketCta registerHref="/register" loginHref="/login" />);
    expect(ctaHref()).toBe('/register');
    expect(screen.getByRole('heading', { level: 2, name: 'Plant your first word today' })).toBeTruthy();
    expect(screen.getByText('Dygo seeds')).toBeTruthy();
    expect(screen.getByText('Free')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'I already have an account' }).getAttribute('href')).toBe('/login');
  });

  it('carries the planted word as ?seed=', () => {
    renderWithIntl(<SeedPacketCta registerHref="/register" loginHref="/login" plantedWord="take off" />);
    expect(ctaHref()).toBe('/register?seed=take%20off');
  });

  it('builds the href and ignores blank words', () => {
    expect(seedCtaHref('/register')).toBe('/register');
    expect(seedCtaHref('/register', '  ')).toBe('/register');
    expect(seedCtaHref('/register', 'deadline')).toBe('/register?seed=deadline');
  });

  it('keeps the planted word in sessionStorage and survives blocked storage', () => {
    expect(readPlantedWord()).toBeUndefined();
    rememberPlantedWord('souvenir');
    expect(window.sessionStorage.getItem(PLANTED_WORD_KEY)).toBe('souvenir');
    expect(readPlantedWord()).toBe('souvenir');

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => rememberPlantedWord('curious')).not.toThrow();
    expect(readPlantedWord()).toBeUndefined();
  });
});
