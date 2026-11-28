const expectedUrl = `${process.env.OMEGA_API_URL}/v1/block/tip`;

globalThis.fetch = async (input) => {
  const requestUrl =
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  if (requestUrl !== expectedUrl) {
    return new Response('Unexpected API URL', { status: 404 });
  }

  return new Response(
    JSON.stringify({
      status: 'CONFIGURED_API_REACHED',
      tip: { index: 77, hash: 'expected-cli-probe' },
      integrity: { valid: true, height: 77 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
};
