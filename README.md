# Notebook Online

一个轻量的本地优先笔记本应用。运行代码集中在 `app/` 目录，保存会在同级的 `notes/` 中导出 Word 文件。

## Overview

- macOS 本地笔记应用
- 支持文字、图片、颜色、高亮、字号
- 支持秒表
- 保存时导出为 Word `.docx`
- 提供 `.app` 图形启动入口

## 已实现

- 富文本笔记编辑
- 粘贴图片
- 拖拽图片到编辑区
- 红 / 黑 / 蓝三种字色
- 黄色高亮
- 小 / 中 / 大三档字号
- 多笔记切换
- 保存为 `.docx`

## 目录结构

```text
notebook-online/
├─ app/                  运行代码与静态资源
├─ notes/                导出的 Word 笔记
├─ Notebook Online.app   图形启动入口
├─ launch.command        命令行启动入口
└─ README.md
```

## Requirements

- macOS
- Python 3
- macOS 自带 `textutil`

## 使用方式

### 图形方式

直接双击：

```text
/Users/td/Documents/notebook-online/Notebook Online.app
```

它会自动：

- 启动本地服务
- 打开浏览器访问 `http://127.0.0.1:8000`

### 命令行方式

1. 在终端进入目录：

```bash
cd /Users/td/Documents/notebook-online
```

2. 启动应用服务：

```bash
python3 app/server.py
```

3. 浏览器打开：

```text
http://localhost:8000
```

也可以直接双击：

```text
/Users/td/Documents/notebook-online/launch.command
```

4. 左侧创建笔记，右侧直接编辑
5. 复制图片后在编辑区按 `Command + V` 粘贴，或者直接拖进去
6. 点击 `保存到本地`

## 本地保存路径

保存后会在下面这个目录生成文件：

```text
/Users/td/Documents/notebook-online/notes
```

每次保存会生成：

- `笔记标题.docx`：可直接用 Word 打开的文档

## 注意

- 图片目前以内嵌 Data URL 方式存储，适合轻量笔记，不适合超大图片库。
- Word 导出依赖 macOS 自带的 `textutil` 命令。
- 导出的文件名默认使用笔记标题，非法文件名字符会自动清理。
- 不要直接双击 `index.html`，请用 `python3 app/server.py`、`launch.command` 或 `.app` 启动。
