import { unzipSync, strFromU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { demoArchive } from '../data/demo';
import { buildExport } from './exportZip';

describe('ZIP export', () => {
  it('contains originals, readable HTML, data.json and a list of what is missing', async () => {
    const a = demoArchive();
    a.memories[0].photos[0] = { ...a.memories[0].photos[0], blobKey: 'k1' };
    const progress: number[] = [];
    // Only the photo stored on the phone can be fetched; demo photos fail like they would offline.
    const r = await buildExport(a, 'cannes-2025', async p => (p.blobKey ? new Blob(['jpegdata'], { type: 'image/jpeg' }) : null), d => progress.push(d));
    const files = unzipSync(new Uint8Array(await r.blob.arrayBuffer()));
    const names = Object.keys(files);
    expect(names).toContain('data.json');
    expect(names).toContain('reisebok.html');
    expect(names).toContain('MANGLER.txt');
    const orig = names.filter(n => n.startsWith('originaler/'));
    expect(orig).toEqual(['originaler/' + a.memories[0].photos[0].id + '.jpg']);
    const data = JSON.parse(strFromU8(files['data.json']));
    expect(data.trips.map((t: { id: string }) => t.id)).toEqual(['cannes-2025']);
    expect(JSON.stringify(data)).not.toContain('blobKey');
    expect(data.people).toEqual({ knut: 'Knut', anna: 'Anna' });
    const html = strFromU8(files['reisebok.html']);
    expect(html).toContain('Der det begynte');
    expect(html).toContain('Annas vurdering');
    expect(html).toContain('src="originaler/');
    expect(r.missing.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1]).toBeGreaterThan(0);
    expect(r.name).toMatch(/^reisebok-der_det_begynte-\d{4}-\d{2}-\d{2}\.zip$/);
  });
});
