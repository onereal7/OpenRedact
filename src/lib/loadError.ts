/**
 * Turns a document loading failure into something a person can act on.
 *
 * The most common cause by far is that the application was never fully cached
 * and the network is unavailable, so the engine could not start. That case
 * needs its own words, because "try again" does not help without a connection.
 */
export function describeLoadError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);

  if (name === "MissingPDFException" || /password/i.test(message)) {
    return "This PDF is locked or damaged, so it could not be opened.";
  }

  if (name === "InvalidPDFException") {
    return "This file is not a valid PDF.";
  }

  if (/network|fetch|load failed|failed to fetch/i.test(message)) {
    return "The PDF engine could not be loaded. This usually means the application is not fully cached and there is no network connection. Open the tool once while online, then it will work offline.";
  }

  return "This PDF could not be opened. It may be damaged or use encryption this browser cannot read.";
}
