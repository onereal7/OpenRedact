# Open Redact

Open Redact is a privacy-first PDF redaction app that runs entirely in the browser.
Users can upload a PDF, select text regions, apply permanent redactions, and download the result without sending files to a backend service.

> **This repository is a fork.**
> The original work is [Open Redact by Tim Sabanshi](https://github.com/tsabkuro/OpenRedact),
> which is licensed under AGPL-3.0. That project remains the canonical version
> of the code; this fork exists to fix the problems listed below and to add new
> features. See [`NOTICE-AGPL.txt`](NOTICE-AGPL.txt) for the full attribution
> and the list of changes.
>
> If you want the unmodified tool, use [OpenRedact.com](https://www.openredact.com/).

## Why Open Redact

- Local-first: Redaction is done client-side in the browser.
- Private by design: No account, no upload pipeline, no server-side PDF processing.
- Open source: Source code is public and auditable.
- Fast UX: Built with React + Vite, PDF.js rendering, and MuPDF processing in a Web Worker.

## Features

- Upload a PDF from local disk
- Select text regions visually
- Apply redactions to selected regions
- Download redacted PDF

## What this fork changes

Four problems were found in the original version. Each one is fixed here, and
each fix has a test or a check that would catch it coming back.

### 1. Removed content was still present in the file

The redacted PDF was written with `saveToBuffer()` and no options, so the
original image data and the original revision of the text stayed inside the
file. The page looked clean, but the data could still be pulled out of the
bytes — the one thing a redaction tool must never allow.

The export now uses `saveToBuffer("garbage=2")`, which rewrites the file and
discards the old revision. A file that was 16 KB before redaction is 698 bytes
after, and the removed pixels are not in the file at all.

### 2. The redaction options were left to the engine's defaults

`page.applyRedactions()` was called with no arguments. That happened to remove
rather than cover, but it was never stated, so it depended on a default that
could change. The options are now explicit:

```js
page.applyRedactions(
  0, // no black box: the content is removed, not covered
  mupdf.PDFPage.REDACT_IMAGE_PIXELS,
  mupdf.PDFPage.REDACT_LINE_ART_REMOVE_IF_TOUCHED,
  mupdf.PDFPage.REDACT_TEXT_REMOVE,
);
```

### 3. The tool stopped working without a network connection

The application shell, the MuPDF WebAssembly binary and the PDF.js worker were
all served with `Cache-Control: max-age=0, must-revalidate`, and there was no
service worker. With the network off, the browser had to revalidate each of
them, could not, and the document never opened.

The assets are now cached properly and a service worker keeps the application
available offline.

### 4. A failed load said nothing at all

A document that failed to open was reported with `console.error(err)` and
nothing else, so the page stayed blank with no explanation. Failures are now
shown in the interface.

## Tech Stack

- React 18
- TypeScript
- Vite
- PDF.js (`pdfjs-dist`) for viewing and text-layer selection
- MuPDF (`mupdf`) in a Web Worker for applying redactions
- Comlink for worker communication

## Project Structure

- `src/App.tsx`: App shell, file flow, toolbar commands
- `src/components/PDFJsViewer.tsx`: PDF rendering, selection capture, redaction orchestration
- `src/workers/mupdf.worker.ts`: MuPDF worker API (`loadDocument`, `applyRedactions`)
- `src/hooks/useMupdf.hook.ts`: Worker lifecycle + typed calls
- `src/lib/pdfjs.ts`: PDF.js worker wiring

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Start dev server

```bash
npm run dev
```

### Build production bundle

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

### What this app does

- Processes PDFs in-browser on the user's device.
- Uses browser memory + CPU only for document redaction.

## License

- Project: AGPL v3 (see `License.md` and `NOTICE-AGPL.txt`)
- Dependency note: MuPDF is available under AGPL v3 or commercial licensing from Artifex. Review obligations before redistribution/deployment.

If you host this application, you must offer the source of the version you
serve, as section 13 of the AGPL requires.

## Credits

- **Original work:** Created by Tim Sabanshi — [tsabkuro/OpenRedact](https://github.com/tsabkuro/OpenRedact)
- **This fork:** the fixes and features listed in "What this fork changes"
