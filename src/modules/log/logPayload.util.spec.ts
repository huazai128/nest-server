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

  it('hydrates compact SDK aliases: queryUrl, ttfb, sslTime', () => {
    const out = normalizeInboundSaveLog({
      siteId: '507f1f77bcf86cd799439011',
      category: 'API',
      queryUrl: 'https://api.example.com/v1/user?id=1&name=a%20b',
      resourcePrefs: [
        { ttfb: 12.5, time: 40, ssl: 8.2, name: 'https://cdn.example.com/app.js' },
      ],
      meta: {
        queryUrl: 'https://api.example.com/err?x=1',
      },
    } as any);

    expect(out.url).toBe('https://api.example.com/v1/user');
    expect(out.params).toEqual({ id: '1', name: 'a b' });
    expect(out.resourcePrefs[0].request).toBe(12.5);
    expect(out.resourcePrefs[0].timeToFirstByte).toBe(12.5);
    expect(out.resourcePrefs[0].requestDuration).toBe(40);
    expect(out.resourcePrefs[0].sslTime).toBe(8.2);
    expect(out.meta?.url).toBe('https://api.example.com/err');
    expect(out.meta?.params).toEqual({ x: '1' });
  });

  it('does not overwrite existing url and restores gRPC bool ssl from sslTime', () => {
    const out = normalizeInboundSaveLog({
      siteId: '507f1f77bcf86cd799439011',
      category: 'PREF',
      queryUrl: 'https://api.example.com/v1/user?id=1',
      url: 'https://keep.example.com/already',
      resourcePrefs: [{ ttfb: 9, ssl: true, sslTime: 4.5 }],
    } as any);

    expect(out.url).toBe('https://keep.example.com/already');
    expect(out.params).toBeUndefined();
    expect(out.resourcePrefs[0].request).toBe(9);
    expect(out.resourcePrefs[0].ssl).toBe(4.5);
  });

  it('strips session .log body when OSS logUrl is present', () => {
    const out = normalizeInboundSaveLog({
      siteId: '507f1f77bcf86cd799439011',
      category: 'ERROR',
      logName: 'session-trace-blank-screen.log',
      logUrl:
        'https://bucket.oss-cn-hangzhou.aliyuncs.com/session-logs/a.log',
      events: '# session-trace-blank-screen.log\n[1] STEP page\n',
    } as any);

    expect(out.logUrl).toContain('oss-cn-hangzhou');
    expect(out.logName).toBe('session-trace-blank-screen.log');
    expect(out.events).toBeUndefined();
  });

  it('keeps rrweb events when the payload is not a session .log', () => {
    const events = '[{"type":4}]';
    const out = normalizeInboundSaveLog({
      siteId: '507f1f77bcf86cd799439011',
      category: 'video',
      events,
    } as any);

    expect(out.events).toBe(events);
  });

  it('strips rrweb body when OSS eventsUrl is present', () => {
    const out = normalizeInboundSaveLog({
      siteId: '507f1f77bcf86cd799439011',
      category: 'video',
      monitorId: 'video018f6b8c-1111-4222-8333-7f0000000008',
      eventsUrl:
        'https://bucket.oss-cn-hangzhou.aliyuncs.com/rrweb/a.json',
      events: '[{"type":4}]',
    } as any);

    expect(out.eventsUrl).toContain('/rrweb/');
    expect(out.events).toBeUndefined();
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
