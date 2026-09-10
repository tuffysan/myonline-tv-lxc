# MyOnline TV v1.1.0 — Storage guide

## NAS / SMB / NFS

MyOnline TV uses a filesystem path for NAS storage. Mount your share so it is visible inside the LXC, for example:

`/mnt/media`

Then open **Admin → Storage**:
- Type: **Mounted path / NAS**
- Destination: `/mnt/media`
- Enable **Default for DVR** and/or **Default for Downloads**
- Press **Test**

For an unprivileged Proxmox LXC, a host bind mount is often the cleanest method. Ensure the container's `www-data` process has write permission to the mapped directory.

## Cloud storage

v1.1.0 uses `rclone` for cloud destinations.

Inside CT 145:

```bash
pct exec 145 -- rclone config
```

Create the desired remote using rclone's setup flow. Then test it:

```bash
pct exec 145 -- rclone lsd onedrive:
```

In MyOnline TV → **Admin → Storage**:
- Type: **Cloud via rclone**
- Destination: `onedrive:MyOnlineTV`
- Select defaults as wanted
- Press **Test**

Any rclone-supported provider can be used when it has been configured correctly.

## Device downloads

Choosing **This device** sends the media to the browser as a file download. For normal media files it is streamed directly from the provider. HLS is streamed through FFmpeg to the browser as an MKV download. The file is not kept permanently in the LXC.

## DVR

DVR records Live TV using FFmpeg. A Storage target is mandatory:
- Path/NAS: recording is written directly to the configured path.
- rclone/cloud: a temporary recording file is created, uploaded after recording, and deleted after a successful upload.
