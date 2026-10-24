/// <reference lib="webworker" />
import * as Comlink from "comlink";
import * as mupdf from "mupdf"
import { PDFDocument } from "mupdf";

export const MUPDF_LOADED = "MUPDF_LOADED";

type PdfRect = [number, number, number, number];
export type RedactionTarget = { pageIndex: number; rect: PdfRect };

export class MupdfWorker {
  private pdfdocument?: mupdf.Document;

  private normalizeRect(rect: PdfRect): PdfRect {
    const [x1, y1, x2, y2] = rect;
    return [
      Math.min(x1, x2),
      Math.min(y1, y2),
      Math.max(x1, x2),
      Math.max(y1, y2),
    ];
  }

  // PDF.js rectangle y-axis is top-down for this pipeline; MuPDF expects bottom-up page coordinates.
  private pdfJsRectToMupdfRect(page: mupdf.PDFPage, rect: PdfRect): PdfRect {
    const [x1, y1, x2, y2] = this.normalizeRect(rect);
    const [, , , pageTop] = page.getBounds();
    return [x1, pageTop - y2, x2, pageTop - y1];
  }

  constructor() {
    this.initializeMupdf();
  }

  private initializeMupdf() {
    try {
      postMessage(MUPDF_LOADED);
    } catch (error) {
      console.error("Failed to initialize MuPDF:", error);
    }
  }

  // ===> Here you can create methods <===
  // ===> that call statics and methods <===
  // ===> from mupdf (in ./node_modules/mupdf/dist/mupdf.js) <===

  loadDocument(document: ArrayBuffer): boolean {

    this.pdfdocument = mupdf.Document.openDocument(
      document,
      "application/pdf"
    ) as PDFDocument;

    return true;
  }

  getPageCount(): number {
    if (!this.pdfdocument) throw new Error("Document not loaded");

    return this.pdfdocument.countPages();
  }

  applyRedactions(targets: RedactionTarget[]): Uint8Array {
    if (!this.pdfdocument) throw new Error("Document not loaded");

    for (const t of targets) {
      const page = (this.pdfdocument as mupdf.PDFDocument).loadPage(t.pageIndex);
      const annot = page.createAnnotation("Redact");
      const mupdfRect = this.pdfJsRectToMupdfRect(page, t.rect);
      annot.setRect(mupdfRect);
    }

    const touched = [...new Set(targets.map((t) => t.pageIndex))];
    for (const idx of touched) {
      const page = (this.pdfdocument as mupdf.PDFDocument).loadPage(idx);
      // State the options instead of relying on the engine's defaults.
      //
      // The first argument is "black boxes": 0 means the content is removed
      // rather than covered by a black rectangle, which is the whole point
      // of a redaction. The rest say what to do with images, line art and
      // text inside the removed area.
      page.applyRedactions(
        false,
        mupdf.PDFPage.REDACT_IMAGE_PIXELS,
        mupdf.PDFPage.REDACT_LINE_ART_REMOVE_IF_TOUCHED,
        mupdf.PDFPage.REDACT_TEXT_REMOVE
      );
    }

    // Export the redacted PDF.
    //
    // "garbage=2" rewrites the file and discards the previous revision.
    // Without it the removed image data and the original text stay inside
    // the file: the page looks clean, but the data can still be recovered
    // from the bytes. A redaction has to remove the content from the file
    // itself, not only from the page.
    const buf = (this.pdfdocument as mupdf.PDFDocument)
      .saveToBuffer("garbage=2")
      .asUint8Array();
    return new Uint8Array(buf);
  }
}

Comlink.expose(new MupdfWorker());
