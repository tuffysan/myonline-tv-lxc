from pathlib import Path
root=Path(__file__).resolve().parents[1]
js=(root/'app/wwwroot/app.js').read_text(encoding='utf-8')
cs=(root/'app/Program.cs').read_text(encoding='utf-8')
checks={
'Edit IPTV Adult filter':'<option value=adult>Adult (18+)</option>' in js,
'Enable Adult control':'personalSetAdultGroups(true)' in js,
'Disable Adult control':'personalSetAdultGroups(false)' in js,
'Adult diagnostics counts':'Adult channels' in js and 'Adult (18+) groups' in js,
'Reload Live TV':'refreshPersonalLiveDiagnostics()' in js,
'Adult backend endpoint':'/api/providers/{providerId}/adult-groups' in cs,
'Xtream ceiling 100k':'EnumerateArray().Take(100000)' in cs,
'M3U ceiling 100k':'ParseM3u(text).Take(100000)' in cs,
}
failed=[k for k,v in checks.items() if not v]
for k,v in checks.items(): print(('PASS' if v else 'FAIL')+': '+k)
if failed: raise SystemExit(1)
