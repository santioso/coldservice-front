import {
  buildNotificationRecipientsPayload,
  getWhatsappRecipient,
  MonitoringNotificationRecipientsResponse,
} from './monitoring.models';

describe('Monitoring notification recipient mapping', () => {
  const configuration: MonitoringNotificationRecipientsResponse = {
    device_id: 'device-1',
    levels: {
      level_1: {
        email: [{ address: 'level1@example.com', enabled: true }],
        whatsapp: [{ address: '+573009998877', enabled: false }],
        sms: [{ address: '+573001112233', enabled: false }],
      },
      level_2: {
        email: [],
        whatsapp: [],
        sms: [],
      },
    },
  };

  it('loads the first WhatsApp recipient and preserves disabled state', () => {
    expect(getWhatsappRecipient(configuration, 'level_1')).toEqual({
      address: '+573009998877',
      enabled: false,
    });
    expect(getWhatsappRecipient(configuration, 'level_2')).toBeNull();
  });

  it('preserves email and SMS while replacing WhatsApp rows', () => {
    expect(buildNotificationRecipientsPayload(configuration, [
      { level: 'level_1', address: ' +573000000001 ', enabled: true },
      { level: 'level_2', address: '', enabled: false },
    ])).toEqual([
      { level: 'level_1', channel: 'email', address: 'level1@example.com', enabled: true },
      { level: 'level_1', channel: 'sms', address: '+573001112233', enabled: false },
      { level: 'level_1', channel: 'whatsapp', address: '+573000000001', enabled: true },
    ]);
  });
});
