---
title: 免 ROOT 安卓抓包
date: 2021-07-04 12:13:53
categories: misc
tags:
    - Android
excerpt: 生成自签名证书，安装证书，抓包
---

## 本人环境
+ 小米 11
+ Android 11
+ MIUI 12.5 开发版 21.6.30

## 安装抓包APP
随便找一个安卓免ROOT抓包APP即可
我使用的是： [Packet Capture](https://play.google.com/store/apps/details?id=app.greyshirts.sslcapture) - Google Play

## 生成自签名证书
新版安卓不允许自动安装CA证书，所以我们需要自己生成证书，并且分别导入至抓包 APP 和系统

### 创建证书
1. 在电脑上安装 openssl

2. 创建自签发证书
证书的信息可以全部默认
```bash
openssl req -x509 -newkey rsa:4096 -keyout self.key -out self.crt -nodes
```

3. 将证书打包成 p12 格式 ( Packet Capture只支持 P12 的导入 )
导入时需要alias和password，alias就是命令行的name
```bash
openssl pkcs12 -export -out self.p12 -inkey self.key -in self.crt -name "self-signed"
```

4. 将三个证书上传至手机

### 导入至APP
将 p12 证书导入抓包APP。具体细节视所选app而定。

### 导入至手机 CA证书
手机中可以安装两种 CA证书，系统证书及用户证书。未 ROOT 的情况下安装不了系统证书
进入 手机设置 -> 安全 -> 安装 CA 证书 -> 选择.crt ( 具体路径视系统不同 )

## 开始抓包
一个可行的抓包原理是：通过代理获取所有流量，通过中间人攻击破解 SSL 加密流量。


## 结论
实测能够正常抓取 app 的加密流量。
但是个人猜测，如果有 APP 使用自己的内置证书，可能是抓不到的。