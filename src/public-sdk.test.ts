import { expect, it } from 'vitest';
import { experimental_scanPublicSdkOnly } from '@get-bb/plugin-sdk/testing';
import { fileURLToPath } from 'node:url';
it('uses only public SDK and declared external packages', () => {
  const result = experimental_scanPublicSdkOnly(fileURLToPath(new URL('..', import.meta.url)), {
    allow: [/^@anthropic-ai\//, /^@modelcontextprotocol\//, /^vitest(?:\/|$)/,
      /^@get-bb\/plugin-sdk\/(?:process|provider-bridge\/testing)$/],
  });
  expect(result.violations).toEqual([]);
  expect(result.privateDependencies).toEqual([]);
});
