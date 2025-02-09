import { XMLParser } from "fast-xml-parser";

export function parseXml(xml: string) {
  return new XMLParser().parse(xml);
};
