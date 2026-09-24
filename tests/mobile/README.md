# Mobile regression tests

These tests serve the actual web assets on loopback and mock API responses. They
do not connect to an IPTV source, change server data, or test real stream decoding.

```sh
npm install --prefix tests/mobile
cd tests/mobile
npx playwright install chromium
npm test
```

Set `MOBILE_BROWSER_CHANNEL=msedge` to use an installed Edge browser instead.
Set `MOBILE_SCREENSHOT` to an absolute PNG path to save a screenshot for review.

Coverage includes configured/permission-aware navigation, menu dismissal,
history and filters, programme actions and timeline switching, live favourites,
miniplayer identity across rotation, collections, loading/error/retry states,
and page overflow at narrow phone widths.
