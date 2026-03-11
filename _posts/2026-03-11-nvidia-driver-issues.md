---
layout: post
title: "Nvidia Driver issues"
date: 2026-03-11
tags: [NVIDIA]
---

## Failed to initialize NVML: Driver/library version mismatch

在使用nvidia-smi命令时报错`Failed to initialize NVML: Driver/library version mismatch`
之前一直用重启来解决问题, 最近发现该问题出现的频率越来越高, 就打算看看有没有什么更加根本的原因导致了这个问题

在[nvidia-nvml-driver-library-version-mismatch - Stack Overflow 的评论区](https://stackoverflow.com/questions/43022843/nvidia-nvml-driver-library-version-mismatch#:~:text=If%20you%27re%20wondering,see%20it%20again.)中, ProgrammingLlama提到为什么重启会效果的原因, 查看日志`/var/log/apt/history.log`, 发现apt自动更新了nvidia-driver以及libnvidia, 而这个更新可能只有执行了重启才能真正生效

```
Start-Date: 2024-04-13  06:28:16
Commandline: /usr/bin/unattended-upgrade
Install: nvidia-firmware-535-server-535.161.08:amd64 (535.161.08-0ubuntu2.20.04.1, automatic)
Upgrade: libnvidia-extra-535-server:amd64 (535.161.07-0ubuntu0.20.04.1, 535.161.08-0ubuntu2.20.04.1), libnvidia-gl-535-server:amd64 (535.161.07-0ubuntu0.20.04.1, 535.161.08-0ubuntu2.20.04.1), libnvidia-compute-535-server:amd64 (535.161.07-0ubuntu0.20.04.1, 535.161.08-0ubuntu2.20.04.1), libnvidia-fbc1-535-server:amd64 (535.161.07-0ubuntu0.20.04.1, 535.161.08-0ubuntu2.20.04.1), nvidia-dkms-535-server:amd64 (535.161.07-0ubuntu0.20.04.1, 535.161.08-0ubuntu2.20.04.1), nvidia-utils-535-server:amd64 (535.161.07-0ubuntu0.20.04.1, 535.161.08-0ubuntu2.20.04.1), libnvidia-decode-535-server:amd64 (535.161.07-0ubuntu0.20.04.1, 535.161.08-0ubuntu2.20.04.1), libnvidia-encode-535-server:amd64 (535.161.07-0ubuntu0.20.04.1, 535.161.08-0ubuntu2.20.04.1), nvidia-driver-535-server:amd64 (535.161.07-0ubuntu0.20.04.1, 535.161.08-0ubuntu2.20.04.1), nvidia-kernel-source-535-server:amd64 (535.161.07-0ubuntu0.20.04.1, 535.161.08-0ubuntu2.20.04.1), nvidia-kernel-common-535-server:amd64 (535.161.07-0ubuntu0.20.04.1, 535.161.08-0ubuntu2.20.04.1), xserver-xorg-video-nvidia-535-server:amd64 (535.161.07-0ubuntu0.20.04.1, 535.161.08-0ubuntu2.20.04.1), nvidia-compute-utils-535-server:amd64 (535.161.07-0ubuntu0.20.04.1, 535.161.08-0ubuntu2.20.04.1), libnvidia-cfg1-535-server:amd64 (535.161.07-0ubuntu0.20.04.1, 535.161.08-0ubuntu2.20.04.1)
End-Date: 2024-04-13  06:29:57

Start-Date: 2024-04-13  06:30:06
Commandline: /usr/bin/unattended-upgrade
Upgrade: libnss3:amd64 (2:3.98-0ubuntu0.20.04.1, 2:3.98-0ubuntu0.20.04.2)
End-Date: 2024-04-13  06:30:07

Start-Date: 2024-04-13  06:30:15
Commandline: /usr/bin/unattended-upgrade
Upgrade: libnvidia-common-535-server:amd64 (535.161.07-0ubuntu0.20.04.1, 535.161.08-0ubuntu2.20.04.1)
End-Date: 2024-04-13  06:30:16

Start-Date: 2024-04-13  06:30:25
Commandline: /usr/bin/unattended-upgrade
Remove: nvidia-firmware-535-server-535.161.07:amd64 (535.161.07-0ubuntu0.20.04.1)
End-Date: 2024-04-13  06:30:25
```

在[How to prevent NVIDIA drivers from automatically upgrading on Ubuntu? - Stack Overflow](https://stackoverflow.com/questions/72560165/how-to-prevent-nvidia-drivers-from-automatically-upgrading-on-ubuntu)中提到了同样的问题, 并且给出了一个禁用apt自动更新的方法:
Add `nvidia-` and `libnvidia-` to `/etc/apt/apt.conf.d/50unattended-upgrades` like so:

```
Unattended-Upgrade::Package-Blacklist {
        "^(lib)?nvidia-";
        "nvidia-";
        "libnvidia-";
        ...
}
```

Consider adding additional lines if you see any other NVIDIA driver names in the output of `apt list --installed | grep nv`

## NVIDIA-SMI has failed because it couldn't communicate with the NVIDIA driver

在确定驱动存在的情况下执行nvidia-smi时出现以下错误:

```
NVIDIA-SMI has failed because it couldn't communicate with the NVIDIA driver. 
Make sure that the latest NVIDIA driver is installed and running.
```

这个问题一般是由于Linux内核升级导致与驱动内核不匹配导致的, 可以使用dkms恢复(重新编译)驱动内核模块

```bash
# 查询驱动版本
ls /usr/src | grep nvidia

# 通过 DKMS（Dynamic Kernel Module Support）框架安装指定版本的 NVIDIA 显卡驱动模块
sudo apt-get install dkms
sudo dkms install -m nvidia -v srv-535.230.02
```

**dkms**是动态内核模块支持工具，用于自动重建内核模块（如显卡驱动）

1. **DKMS 的工作流程**：
    - 将驱动源码（如 NVIDIA 驱动）注册到 DKMS 系统中
    - 当内核升级时，==DKMS 自动重新编译==并安装适配新内核的模块
2. **此命令的具体行为**：
    - 在 DKMS 系统中注册并编译版本为 `srv-535.230.02` 的 NVIDIA 驱动模块。
    - 将编译后的模块安装到当前运行的内核中。

reference: [NVIDIA驱动失效简单解决方案：NVIDIA-SMI has failed because it couldn‘t communicate with the NVIDIA driver._nvidia-smi has failed because it couldn't communic-CSDN博客](https://blog.csdn.net/wjinjie/article/details/108997692)
