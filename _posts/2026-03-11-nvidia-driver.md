---
layout: post
title: "Nvidia Driver"
date: 2026-03-11
tags: [NVIDIA]
---

# overview

linux上的nvidia驱动, 有几种区别

- [NVIDIA drivers](https://packages.ubuntu.com/jammy/nvidia-driver-470) have the full set of packages, and is supported for up to 1 year.
- [NVIDIA server drivers](https://packages.ubuntu.com/jammy/nvidia-driver-450-server) have the full set of packages as well, and is supported up to 2 years.
- [NVIDIA headless drivers](https://packages.ubuntu.com/jammy/nvidia-headless-no-dkms-470) are a small subset, meant only for GPU computational tasks. This package is also supported for up to 1 year.

reference:
[What is the NVIDIA Server Driver? - Ask Ubuntu](https://askubuntu.com/questions/1262401/what-is-the-nvidia-server-driver)

# install

## apt安装

```bash
# 检查驱动是否已经正常安装
nvidia-smi

# 检查显卡型号
sudo apt install -y ubuntu-drivers-common && ubuntu-drivers devices

# 安装特定的驱动
# 在服务器上需要安装带server后缀的驱动版本, 普通驱动会打开GUI
sudo apt install -y nvidia-driver-<version>-server
```

## runfile安装

```bash
# The .run can also be downloaded using wget or curl as shown in the example below:
$ BASE_URL=https://us.download.nvidia.com/tesla
$ DRIVER_VERSION=550.54.14
$ curl -fSsl -O $BASE_URL/$DRIVER_VERSION/NVIDIA-Linux-x86_64-$DRIVER_VERSION.run

# Once the .run installer has been downloaded, the NVIDIA driver can be installed
$ sudo sh NVIDIA-Linux-x86_64-$DRIVER_VERSION.run
```

reference: <https://docs.nvidia.com/datacenter/tesla/pdf/NVIDIA_Driver_Installation_Quickstart.pdf>

# uninstall

```bash
# 查询驱动版本
ls /usr/src | grep nvidia

# 执行/usr/bin目录下的驱动卸载程序
/usr/bin/nvidia-uninstall
```

reference: [linux卸载nvidia驱动 - 烨熠 - 博客园](https://www.cnblogs.com/chaosopen/p/17884696.html)

如果使用runfile安装的驱动, 还可以使用runfile的卸载选项来卸载驱动

```bash
sudo ./NVIDIA-Linux-x86-xxx.xx.run --uninstall
```

reference: [How to uninstall manually installed Nvidia drivers? - Ask Ubuntu](https://askubuntu.com/questions/219942/how-to-uninstall-manually-installed-nvidia-drivers)
