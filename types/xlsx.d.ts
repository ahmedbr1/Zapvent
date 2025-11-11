declare module "xlsx" {
  export type WorkBook = Record<string, unknown>;
  export type WorkSheet = {
    [key: string]: unknown;
    "!cols"?: Array<{ wch: number }>;
  };

  export const utils: {
    book_new(): WorkBook;
    json_to_sheet(data: unknown[]): WorkSheet;
    book_append_sheet(workbook: WorkBook, worksheet: WorkSheet, name: string): void;
  };

  export function write(
    workbook: WorkBook,
    options: { type: "buffer"; bookType: string }
  ): Buffer;
}
