declare module "myanmar-tools" {
  class ZawgyiDetector {
    getZawgyiProbability(text: string): number;
  }
  class ZawgyiConverter {
    zawgyiToUnicode(text: string): string;
    unicodeToZawgyi(text: string): string;
  }
  const tools: {
    ZawgyiDetector: typeof ZawgyiDetector;
    ZawgyiConverter: typeof ZawgyiConverter;
  };
  export default tools;
}
