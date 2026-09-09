# GitHub setup

Recommended repository:

`https://github.com/tuffysan/myonline-tv-lxc`

## 1. Create the repository

Create a new GitHub repository named:

`myonline-tv-lxc`

Do not initialize it with a README, `.gitignore`, or license because this package already contains those files.

## 2. Upload this project

From a PC with Git installed:

```bash
git init
git branch -M main
git add .
git commit -m "MyOnline TV Web v0.3.3"
git remote add origin https://github.com/tuffysan/myonline-tv-lxc.git
git push -u origin main
```

## 3. Create the first stable release

```bash
git tag v0.3.3
git push origin v0.3.3
```

The GitHub Actions release workflow validates the tag and creates a GitHub Release.

## 4. Install directly from GitHub on Proxmox

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```

The default channel is `stable`. Once a GitHub Release exists, the installer uses the latest release tag. Before the first release exists it falls back to `main`.

## 5. Update later

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/update-from-github.sh)"
```

## Development/main channel

To install directly from `main` rather than the latest stable release:

```bash
MYONLINE_CHANNEL=main bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```

To install a specific tag:

```bash
MYONLINE_REF=v0.3.3 bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```

## Override container settings

```bash
CTID=150 \
MEMORY=4096 \
CORES=4 \
DISK=32 \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```

Static IP:

```bash
CTID=150 \
IP_CONFIG='ip=192.168.1.50/24,gw=192.168.1.1' \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```
