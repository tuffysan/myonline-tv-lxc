from pathlib import Path
root=Path(__file__).resolve().parents[1]
cw=(root/'app/wwwroot/continue-watching.js').read_text(encoding='utf-8')
mobile=(root/'app/wwwroot/mobile.js').read_text(encoding='utf-8')
release=(root/'RELEASE.ps1').read_text(encoding='utf-8')
checks={
 'continue action': "['Continue'," in cw,
 'restart action': 'Start from beginning' in cw and 'positionSeconds:0' in cw,
 'mark watched action': 'Mark as watched' in cw and 'markContinueWatchingWatched' in cw,
 'remove action': 'Remove from Continue Watching' in cw,
 'collection search': 'collectionSearch' in mobile and 'Search Continue Watching' in mobile,
 'collection progress': 'collectionProgressText' in mobile and '% watched' in mobile,
 'collection actions': 'openContinueActions(item.id,actions)' in mobile,
 'clean Python env': 'Remove-Item Env:PYTHONHOME' in release and 'Remove-Item Env:PYTHONPATH' in release,
 'stdlib validation': "sysconfig.get_path('stdlib')" in release,
}
failed=[k for k,v in checks.items() if not v]
if failed: raise SystemExit('FAIL Continue Watching 2.0 guards: '+', '.join(failed))
for k in checks: print('PASS:',k)
