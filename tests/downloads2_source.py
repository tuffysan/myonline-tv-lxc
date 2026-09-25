from pathlib import Path
s=Path('app/Program.cs').read_text(encoding='utf-8')
js=Path('app/wwwroot/app.js').read_text(encoding='utf-8')
for x in ['/api/downloads/summary','/api/downloads/history','downloadCancellations','downloads-state.json','SemaphoreSlim(2, 2)','Status = "Interrupted"']:
    assert x in s, x
for x in ['DOWNLOADS 2.0','downloadSeriesBatch','Clear failed/cancelled history','setTimeout']:
    assert x in js, x
print('PASS: Downloads 2.0 persistence, queue, cancellation, history, summary and series batch UI source guards.')
