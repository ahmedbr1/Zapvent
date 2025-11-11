declare module "qr-image" {
  export type QrOptions = {
    type?: "png" | "svg" | "pdf" | "eps";
    size?: number;
    margin?: number;
    ec_level?: "L" | "M" | "Q" | "H";
  };

  export function imageSync(
    text: string,
    options?: QrOptions
  ): Buffer | string;
}
