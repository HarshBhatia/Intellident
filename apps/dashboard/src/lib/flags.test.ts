describe('flags', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
    jest.resetModules();
  });

  it('defaults every flag to false', async () => {
    delete process.env.NEXT_PUBLIC_FF_AI_NOTES;
    delete process.env.NEXT_PUBLIC_FF_AI_CHAT;
    delete process.env.NEXT_PUBLIC_FF_MESSAGING;
    jest.resetModules();
    const { flags } = await import('./flags');
    expect(flags.aiNotes).toBe(false);
    expect(flags.aiChat).toBe(false);
    expect(flags.messaging).toBe(false);
    expect(flags.filesXrays).toBe(false);
    expect(flags.logoUpload).toBe(false);
    expect(flags.invoices).toBe(false);
    expect(flags.patientFinancialsTab).toBe(false);
  });

  it('enables a flag only when env is the string true', async () => {
    process.env.NEXT_PUBLIC_FF_AI_NOTES = 'true';
    process.env.NEXT_PUBLIC_FF_AI_CHAT = 'yes';
    jest.resetModules();
    const { flags } = await import('./flags');
    expect(flags.aiNotes).toBe(true);
    expect(flags.aiChat).toBe(false);
  });
});
