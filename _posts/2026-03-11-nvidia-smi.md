---
layout: post
title: "nvidia-smi笔记"
date: 2026-03-11
tags: [NVIDIA]
---

## GPU Util的理解

reference: [Understanding NVIDIA GPU Performance: Utilization vs. Saturation (2023)](https://arthurchiao.art/blog/understanding-gpu-performance/)
[搞懂 NVIDIA GPU 性能指标 很容易弄混的一个概念： Utilization vs Saturation](https://mp.weixin.qq.com/s/6PcF2RwGdm1G0JllGSS3jw)上面文章的翻译, 不易于理解, 还是直接看原文比较好

作者从go-nvml项目的一个头文件中找到了关于gpu util的解释

> Each sample period may be between 1 second and 1/6 second, depending on the product being queried.
> **GPU utilization**: This represents the percentage of time during which one or more kernels were executing on the GPU.

NVML中对于utilization的定义就是***在过去的sample周期中某些活动发生的时间百分比(设备使用频率)***
可以理解为GPU的利用程度而不是使用率, 例如一个smple周期为1s, 在这1s内GPU也被使用了完整的1s, 那么utilization就是100%, GPU没有空转

### The “USE” methodology

在书籍"Systems Performance: Enterprise and the Cloud"中Brendan Gregg提到了USE (Utilization/Saturation/Error)方法论

> - utilization: ==**the average time**== that the resource was busy servicing work
> - saturation: the degree to which the resource has extra work which it can’t service, often queued
> - errors: the count of error events

- 资源服务于任务的平均时间
- 资源拥有额外任务的程度, 通常是在排队的任务; 这也是大家对于使用率常用的一个概念, 有在排队的任务这个百分比会超过100%
- 异常事件的数量

USE方法论对"utilization"提供了一种额外的解释

> **==There is another definition==** where utilization describes **==the proportion of a resource that is used==**, and so 100% utilization means no more work can be accepted, **==unlike with the "busy" definition above==**.

- 在这个定义中utilization是指资源总量确定的前提下有多少资源正在被使用, 不同于上面的busy定义

> In summary, within the “USE” methodology, “utilization” refers to the **==portion of time a resource is actively serving or working, without considering the allocated capacity==**.

不过NVML库依旧使用了第一种"utilization"定义, 而不是更广泛的使用率的概念
作者提出, 使用"used-frequency"来作为标签可以更加容易被理解

> If necessary, an alternative term to replace “utilization” could be **==`"used-frequency"`==**, indicating **==how frequently the device is being utilized==**.
