import { normalizeInboundSaveLog } from './logPayload.util';
import { mapLogDocToListItem } from './logQuery.util';

describe('SaveLogRequest proto field pass-through', () => {
  it('syncs errorUUid/errorUid and keeps event + struct fields', () => {
    const input = {
      siteId: '507f1f77bcf86cd799439011',
      category: 'CUSTOM',
      errorUUid: 'uuid-from-sdk',
      eventCategory: 'cat',
      eventAction: 'act',
      eventLabel: 'lbl',
      eventValue: '{"n":1}',
      eventId: 9,
      exeTime: 3.14,
      errorDetail: 'detail text',
      extraInfo: { phone: '1' },
      otherInfo: { team: 'A' },
      meta: { conponentName: 'Comp' },
    } as any;

    const out = normalizeInboundSaveLog(input);
    expect(out.errorUid).toBe('uuid-from-sdk');
    expect(out.errorUUid).toBe('uuid-from-sdk');
    expect(out.eventCategory).toBe('cat');
    expect(out.eventAction).toBe('act');
    expect(out.exeTime).toBe(3.14);
    expect(out.extraInfo).toEqual({ phone: '1' });
    expect(out.otherInfo).toEqual({ team: 'A' });
  });

  it('maps list item with dual uuid fields for gRPC LogList', () => {
    const doc = {
      siteId: '507f1f77bcf86cd799439011',
      category: 'CUSTOM',
      errorUUid: 'only-uuid-field',
      doce: {
        eventCategory: 'ec',
        eventAction: 'ea',
        eventId: 7,
      },
    };
    const item = mapLogDocToListItem(doc as any);
    expect(item.errorUUid).toBe('only-uuid-field');
    expect(item.errorUid).toBe('only-uuid-field');
    expect(item.eventCategory).toBe('ec');
    expect(item.eventAction).toBe('ea');
    expect(item.eventId).toBe(7);
  });
});
