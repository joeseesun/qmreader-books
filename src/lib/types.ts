export type BookRecord = {
  id: string;
  title: string;
  originalName: string;
  format: "epub" | "azw3" | "mobi";
  storedName: string;
  size: number;
  createdAt: string;
  status: "ready" | "failed";
  error?: string;
};

export type Highlight = {
  id: string;
  cfi: string;
  text: string;
  note?: string;
  chapter?: string;
  createdAt: string;
};
