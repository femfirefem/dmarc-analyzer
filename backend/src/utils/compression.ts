import zlib from "node:zlib";
import { Buffer } from "node:buffer";
import { TextWriter, Uint8ArrayReader, ZipReader } from "@zip-js/zip-js";

export const gzipString = (content: string): Buffer => {
  return zlib.gzipSync(new TextEncoder().encode(content));
};

export const gunzipAsString = (content: string | ArrayBuffer | NodeJS.ArrayBufferView): string => {
  return new TextDecoder().decode(zlib.gunzipSync(content));
};

// Helper function to check if data might be gzipped
export function isGzip(data: Uint8Array): boolean {
  // Check for gzip magic numbers (1f 8b)
  return data.length > 2 && data[0] === 0x1f && data[1] === 0x8b;
};

// Helper function to check if data might be a ZIP file
export function isZip(data: Uint8Array): boolean {
  // Check for ZIP magic numbers (PK..)
  return data.length > 4 && data[0] === 0x50 && data[1] === 0x4b && 
         data[2] === 0x03 && data[3] === 0x04;
};

export async function getFirstXmlFromZip(data: Uint8Array): Promise<string> {
  try {
    const zip = new ZipReader(new Uint8ArrayReader(data));
    const entries = await zip.getEntries();
    
    if (entries.length === 0) {
      throw new Error("ZIP archive is empty");
    }

    // Get the first XML file from the archive
    const xmlEntry = entries.find(entry => entry.filename.toLowerCase().endsWith('.xml'));
    if (!xmlEntry) {
      throw new Error("No XML file found in ZIP archive");
    }
    
    if (!xmlEntry.getData) {
      throw new Error("Failed to get data from XML entry");
    }

    const content = await xmlEntry.getData(new TextWriter());
    await zip.close();
    return content;
  } catch (error) {
    throw new Error(`Failed to extract ZIP data: ${error instanceof Error ? error.message : error}`);
  }
};
