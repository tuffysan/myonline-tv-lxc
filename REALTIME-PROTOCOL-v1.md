# Realtime Protocol v1

Transport target: SignalR/WebSocket.

Envelope fields:
- type
- deviceId
- correlationId
- payload
- sentAt

Initial messages:
- presence
- state
- play
- pause
- tune
- search
- handoff
- acknowledge
- error

Security requirement: a connected client may publish commands only to devices/users it is authorized to control.
