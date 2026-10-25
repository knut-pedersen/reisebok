import type { SupabaseClient } from '@supabase/supabase-js';
import type { PersonId } from '../data/types';
import type { Backend, EntityKind, PushResult, Row } from './types';

const BUCKET = 'photos';

export function supabaseBackend(sb: SupabaseClient): Backend {
  return {
    async pull(sinceSeq) {
      const out: Row[] = [];
      // Page through in seq order so a large first sync doesn't hit the row limit.
      for (let from = sinceSeq; ; ) {
        const { data, error } = await sb.from('entities').select('id,kind,data,deleted,version,seq,updated_by').gt('seq', from).order('seq').limit(500);
        if (error) throw error;
        out.push(...(data as Row[]));
        if (!data || data.length < 500) return out;
        from = (data[data.length - 1] as Row).seq;
      }
    },
    async push(id, kind: EntityKind, data, baseVersion, deleted) {
      const { data: res, error } = await sb.rpc('push_entity', { p_id: id, p_kind: kind, p_data: data, p_base: baseVersion, p_deleted: deleted });
      if (error) throw error;
      return res as PushResult;
    },
    async members() {
      const { data, error } = await sb.from('members').select('user_id,person');
      if (error) throw error;
      return Object.fromEntries((data || []).map(r => [r.user_id as string, r.person as PersonId]));
    },
    async upload(path, blob) {
      const { error } = await sb.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: blob.type || 'application/octet-stream' });
      if (error) throw error;
    },
    async download(path) {
      const { data, error } = await sb.storage.from(BUCKET).download(path);
      if (error) throw error;
      return data;
    },
    async remove(paths) {
      if (!paths.length) return;
      const { error } = await sb.storage.from(BUCKET).remove(paths);
      if (error) throw error;
    },
    async signedUrl(path) {
      const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
    subscribe(onChange) {
      const ch = sb.channel('entities-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'entities' }, () => onChange()).subscribe();
      return () => { sb.removeChannel(ch); };
    },
  };
}
