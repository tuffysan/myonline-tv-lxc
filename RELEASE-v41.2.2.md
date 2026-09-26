# MyOnline TV v41.2.2 – Subtitle Rendering Fix

Fixes embedded subtitle selection where a track could be selected but no cues appeared. The WebVTT endpoint now streams FFmpeg output progressively instead of waiting for the entire remote VOD to be scanned before returning the subtitle file. Subtitle track activation is also tied to the actual HTMLTrackElement load event.
