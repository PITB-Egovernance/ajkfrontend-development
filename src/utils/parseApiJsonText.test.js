import { parseApiJsonText } from './parseApiJsonText';

const saved = { success: true, data: { temp_id: 'saved-draft' } };
const notice = '<br />\n<b>Notice</b>: PHP Request Startup: file created in the system\'s temporary directory in <b>Unknown</b> on line <b>0</b><br />\n';

test('parses clean JSON and JSON preceded by PHP upload notices', () => {
  expect(parseApiJsonText(JSON.stringify(saved))).toEqual(saved);
  expect(parseApiJsonText(notice + JSON.stringify(saved))).toEqual(saved);
  expect(parseApiJsonText(notice + notice + JSON.stringify(saved))).toEqual(saved);
});

test('rejects HTML pages, fatal PHP errors, and malformed JSON', () => {
  expect(() => parseApiJsonText('<html>{"success":true}</html>')).toThrow();
  expect(() => parseApiJsonText(notice.replace('Notice', 'Fatal error') + JSON.stringify(saved))).toThrow();
  expect(() => parseApiJsonText(notice + '{broken')).toThrow();
});
