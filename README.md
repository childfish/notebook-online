# Notebook Online

[中文](#中文) | [English](#english)

## 中文

一个轻量的本地优先笔记本应用。运行代码集中在 `app/` 目录，保存会在同级的 `notes/` 中导出 Word 文件。

### 概览

- macOS 本地笔记应用
- 支持文字、图片、颜色、高亮、字号
- 支持秒表
- 保存时导出为 Word `.docx`
- 提供 `.app` 图形启动入口

### 已实现

- 富文本笔记编辑
- 粘贴图片
- 拖拽图片到编辑区
- 红 / 黑 / 蓝三种字色
- 黄色高亮
- 小 / 中 / 大三档字号
- 多笔记切换
- 保存为 `.docx`

### 目录结构

```text
notebook-online/
├─ app/                  运行代码与静态资源
├─ notes/                导出的 Word 笔记
├─ Notebook Online.app   图形启动入口
├─ launch.command        命令行启动入口
└─ README.md
```

### 运行要求

- macOS
- Python 3
- macOS 自带 `textutil`

### 使用方式

#### 图形方式

直接双击：

```text
/Users/td/Documents/notebook-online/Notebook Online.app
```

它会自动：

- 启动本地服务
- 打开浏览器访问 `http://127.0.0.1:8000`

#### 命令行方式

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

### 本地保存路径

保存后会在下面这个目录生成文件：

```text
/Users/td/Documents/notebook-online/notes
```

每次保存会生成：

- `笔记标题.docx`：可直接用 Word 打开的文档

### 注意

- 图片目前以内嵌 Data URL 方式存储，适合轻量笔记，不适合超大图片库。
- Word 导出依赖 macOS 自带的 `textutil` 命令。
- 导出的文件名默认使用笔记标题，非法文件名字符会自动清理。
- 不要直接双击 `index.html`，请用 `python3 app/server.py`、`launch.command` 或 `.app` 启动。

## English

A lightweight local-first notebook app for macOS. Runtime code lives in `app/`, and notes are exported as Word files into the sibling `notes/` directory.

### Overview

- Local notebook app for macOS
- Supports text, images, colors, highlight, and font sizes
- Includes a stopwatch
- Exports notes as Word `.docx`
- Comes with a graphical `.app` launcher

### Features

- Rich text note editing
- Paste images directly
- Drag images into the editor
- Red / black / blue text colors
- Yellow highlight
- Small / medium / large font sizes
- Multiple notes
- Save as `.docx`

### Project Structure

```text
notebook-online/
├─ app/                  Runtime code and static assets
├─ notes/                Exported Word notes
├─ Notebook Online.app   Graphical launcher
├─ launch.command        Script launcher
└─ README.md
```

### Requirements

- macOS
- Python 3
- Built-in macOS `textutil`

### Usage

#### Graphical Launch

Double-click:

```text
/Users/td/Documents/notebook-online/Notebook Online.app
```

It will automatically:

- start the local service
- open the browser at `http://127.0.0.1:8000`

#### Command Line Launch

1. Go to the project directory:

```bash
cd /Users/td/Documents/notebook-online
```

2. Start the app service:

```bash
python3 app/server.py
```

3. Open in browser:

```text
http://localhost:8000
```

You can also double-click:

```text
/Users/td/Documents/notebook-online/launch.command
```

4. Create a note from the left sidebar
5. Paste an image with `Command + V`, or drag it into the editor
6. Click `保存到本地`

### Local Save Path

Exported files are written to:

```text
/Users/td/Documents/notebook-online/notes
```

Each save generates:

- `Note Title.docx`: a Word document that can be opened directly in Microsoft Word

### Notes

- Images are currently stored as embedded Data URLs, which is fine for lightweight usage but not ideal for very large image libraries.
- Word export depends on the built-in macOS `textutil` command.
- Exported filenames use the note title, with invalid filename characters automatically cleaned.
- Do not open `index.html` directly. Use `python3 app/server.py`, `launch.command`, or the `.app` launcher instead.
