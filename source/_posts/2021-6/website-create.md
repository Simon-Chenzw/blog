---
title: hexo 的建站过程
date: 2021-06-21 22:40:12
categories: 博客网站
tags: 
    - 网站相关
excerpt: "如何使用 hexo 在 github page 搭建博客"
---

## 简介
本博客使用 [`hexo`](https://github.com/hexojs/hexo) 构建，使用主题 [`fluid`](https://github.com/fluid-dev/hexo-theme-fluid) ，托管于 [`github page`](https://pages.github.com/)

`hexo` 是基于 `Node.js` 编写的静态页面生成器，它可以使用 `markdown` 编写博客并编译成静态页面

## 本教程的前置技能点
+ 必须
  + Markdown
  + Node.js ( 主要是NPM的使用 )
  + Git
  + Github Actions & Github Page
+ 可选
  + html + css + javascript
  + 域名

## 杂谈

在这之前，我是用的是 `wordpress` 和 `typecho`。他们都是基于服务器的动态博客，需要架设 `apache + mysql + php` 三件套，迁移起来也是十分麻烦，还要保持服务器的持续运行。再加上前两次架设的博客实际上什么都没写，没有人留言，没有人注册，就显得很臃肿。

这次网站架设，本来是突发奇想，想将之前写的静态的个人主页放在 github page 上，也想借此机会了解一下这个在开源项目中十分常见的玩意。

架设完发现，它是如此之香，它的各个特点都完全符合我的要求。安装、运行、部署流程我都完全理解，并且都非常简单。

## 静态页面的 优点 & 缺点
+ 优点
  + 简单可观，易于部署
  + 省去后端，轻量级
  + 可以使用 `github page` ，不需服务器，不需托管费用
+ 缺点
  + 没有后端，访问量统计、评论等功能需要用插件以其他方式做到
  + 网站没有管理后台，需要分别管理各个动态插件
  + 没有博客编写页面，需要直接便携 markdown 并上传至 git

## github page 的架设
首先是正常的编写 index.html 以及其他文件，在本地能正常打开后，上传至库: `<username>.github.io`。

然后进入 `github` 的 `Settings -> Pages` 选择 `master` 分支以及 `/root` 文件夹。这时网站便建好了，that's all.

### 其他设置
+ CNAME
因为本人的 github 名字很长，并且手里也有域名，所以将域名绑定至 `github page` 上了。
绑定方法：
  1. 在根目录创建 `CNAME` ，然后写入你的域名，或者在 `Pages` 中直接设置
  2. 进入域名的 DNS 管理页面，建立域名至 `<username>.github.io` 的 CNAME 记录
  3. 等待 github page 配置完成，耗时可能有点久
+ jekyll
jekyll是内置的静态页面生成器，但是在这里我们不需要，并且当我们网页复杂之后，会和其他生成器冲突
关闭方法：在根目录创建 `.nojekyll`

## hexo 的架设
### 为什么选择 hexo
+ hexo 使用 Node.js 编写，个人觉得在软件生态方面更贴近网页前端
+ 主题更加美观，~~找到的二次元的主题更多~~，同时也是我不选择 jekyll 的原因

### hexo 的安装
1. 安装 `hexo` ：[官方中文文档](https://hexo.io/zh-cn/docs/#安装)
2. 安装 `fluid` ：[官方中文文档](https://hexo.fluid-dev.com/docs/start/)
3. 参照两者文档编写 `_config.yml` & `_config.fluid.yml`
4. 使用 `npx hexo server` 建立本地服务， -p 可以指定端口

## 使用 github actions 进行自动部署
[`github actions`](https://docs.github.com/en/actions) 可以在存储库中自动化、自定义和执行软件开发工作流程

在 `.github\workflows` 下创建 `build.yml`。作用是在 push 新代码时自动编译页面，并提交至 gh-pages 分支

Tips: 如果要进行譬如 CNAME 的客制化，参照 [`actions-gh-pages`](https://github.com/peaceiris/actions-gh-pages) 的文档

参考模板：
```yaml
name: build
on:
  workflow_dispatch:
  push:
    branches:
      - master
jobs:
  build_page:
    runs-on: ubuntu-latest
    steps:
      - name: checkout
        uses: actions/checkout@v2
      - name: setup Node.js 12
        uses: actions/setup-node@v2
        with:
          node-version: "12"
      - name: NPM Cache
        uses: actions/cache@v2
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-
      - name: Install Dependencies
        run: npm install
      - name: Build
        run: npm run build
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public
          publish_branch: gh-pages
```

## 安装完成
安装完成后 **理论上** 是可以直接打开的。但是 actions 的编译、page 的部署需要时间，如果还使用了自己的域名，就更久了。如果出现异常，建议稍等一会，如果仍然存在问题再去 google 相关错误。