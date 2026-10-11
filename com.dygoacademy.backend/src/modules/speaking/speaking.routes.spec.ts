import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';

import { SpeakingController } from './speaking.controller';

/** The public routes follow the speech server's names (2026-10-11); the old names stay as aliases. */
function route(handler: string): { method: RequestMethod; paths: string[] } {
  const fn = (SpeakingController.prototype as unknown as Record<string, unknown>)[handler];
  const path = Reflect.getMetadata(PATH_METADATA, fn as object) as string | string[];
  return {
    method: Reflect.getMetadata(METHOD_METADATA, fn as object) as RequestMethod,
    paths: Array.isArray(path) ? path : [path],
  };
}

describe('SpeakingController check routes', () => {
  it('POST check-speech checks a sentence; the old check path is an alias', () => {
    const r = route('check');
    expect(r.method).toBe(RequestMethod.POST);
    expect(r.paths).toEqual(['check-speech', 'check']);
  });

  it('POST check-pronunciation checks a word; the old word-check path is an alias', () => {
    const r = route('wordCheck');
    expect(r.method).toBe(RequestMethod.POST);
    expect(r.paths).toEqual(['check-pronunciation', 'word-check']);
  });

  it('GET check/:checkId is the poll for both', () => {
    const r = route('checkStatus');
    expect(r.method).toBe(RequestMethod.GET);
    expect(r.paths).toEqual(['check/:checkId']);
  });
});
